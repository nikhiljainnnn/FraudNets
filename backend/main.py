from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import networkx as nx
from datetime import datetime, timedelta
import random
import string
import os
from dotenv import load_dotenv

load_dotenv()

try:
    import torch
    from gnn_model import FraudGNN, train_model, predict_fraud
    from data_loader import generate_training_data
    GNN_AVAILABLE = True
except ImportError:
    GNN_AVAILABLE = False
    print("Warning: PyTorch/GNN not available. Running in limited mode.")

try:
    from web3 import Web3
    from web3.middleware import geth_poa_middleware
    WEB3_AVAILABLE = True
except ImportError:
    WEB3_AVAILABLE = False
    print("Warning: Web3 not available. Blockchain features disabled.")

app = FastAPI(title="FraudNets API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Transaction(BaseModel):
    tx_id: str
    sender: str
    receiver: str
    amount: float
    timestamp: Optional[str] = None

class AnalyzeRequest(BaseModel):
    transactions: List[Transaction]
    bank_id: str

class AnalyzeResponse(BaseModel):
    is_fraud: bool
    fraud_type: Optional[str]
    flagged_accounts: List[str]
    risk_scores: Dict[str, float]
    blockchain_tx_hash: Optional[str]
    timestamp: str

transaction_graph = nx.DiGraph()
stats = {
    "total_analyses": 0,
    "frauds_detected": 0,
    "blacklisted_count": 0
}
blacklisted_accounts = set()
gnn_model = None
simulation_counter = 0

FIRST_NAMES = ["James", "Emma", "Liam", "Olivia", "Noah", "Ava", "William", "Sophia", "Benjamin", "Isabella",
               "Lucas", "Mia", "Henry", "Charlotte", "Alexander", "Amelia", "Sebastian", "Harper", "Jack", "Evelyn",
               "Michael", "Sarah", "David", "Jennifer", "Robert", "Lisa", "Daniel", "Nancy", "Matthew", "Karen",
               "Ethan", "Emily", "Jacob", "Hannah", "Mason", "Ashley", "Logan", "Samantha", "Aiden", "Elizabeth"]
LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
              "Anderson", "Taylor", "Thomas", "Moore", "Jackson", "Martin", "Lee", "Thompson", "White", "Harris",
              "Clark", "Lewis", "Walker", "Hall", "Young", "King", "Wright", "Scott", "Green", "Adams"]
BANK_CODES = ["HDFC", "ICICI", "SBI", "AXIS", "BOA", "CHASE", "CITI", "WELLS", "HSBC", "BARCLAYS"]

def generate_realistic_name():
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"

def generate_tx_id():
    prefix = random.choice(["TXN", "PAY", "TRF", "WIR", "ACH"])
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"{prefix}{timestamp}{suffix}"

class BlockchainService:
    def __init__(self):
        self.web3 = None
        self.contract = None
        self.account = None
        
    def initialize(self):
        if not WEB3_AVAILABLE:
            return False
            
        ganache_url = os.getenv("GANACHE_URL")
        contract_address = os.getenv("CONTRACT_ADDRESS")
        private_key = os.getenv("PRIVATE_KEY")
        
        if not all([ganache_url, contract_address, private_key]):
            return False
            
        try:
            self.web3 = Web3(Web3.HTTPProvider(ganache_url))
            self.web3.middleware_onion.inject(geth_poa_middleware, layer=0)
            
            contract_abi = [
                {
                    "inputs": [{"name": "account", "type": "address"}],
                    "name": "blacklistAccount",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "inputs": [{"name": "account", "type": "address"}],
                    "name": "isBlacklisted",
                    "outputs": [{"name": "", "type": "bool"}],
                    "stateMutability": "view",
                    "type": "function"
                }
            ]
            
            self.contract = self.web3.eth.contract(
                address=Web3.to_checksum_address(contract_address),
                abi=contract_abi
            )
            self.account = self.web3.eth.account.from_key(private_key)
            return self.web3.is_connected()
        except Exception as e:
            print(f"Blockchain init error: {e}")
            return False
    
    def blacklist_account(self, account_hash: str) -> Optional[str]:
        if not self.contract or not self.account:
            return None
        try:
            dummy_address = Web3.to_checksum_address("0x" + account_hash[:40].ljust(40, '0'))
            tx = self.contract.functions.blacklistAccount(dummy_address).build_transaction({
                'from': self.account.address,
                'nonce': self.web3.eth.get_transaction_count(self.account.address),
                'gas': 200000,
                'gasPrice': self.web3.eth.gas_price
            })
            signed_tx = self.web3.eth.account.sign_transaction(tx, self.account.key)
            tx_hash = self.web3.eth.send_raw_transaction(signed_tx.rawTransaction)
            return tx_hash.hex()
        except Exception as e:
            print(f"Blacklist error: {e}")
            return None

blockchain_service = BlockchainService()

def detect_cycles(graph: nx.DiGraph, transactions: List[Transaction]) -> List[str]:
    temp_graph = graph.copy()
    for tx in transactions:
        temp_graph.add_edge(tx.sender, tx.receiver)
    
    try:
        cycles = list(nx.simple_cycles(temp_graph))
        flagged = []
        for cycle in cycles:
            if len(cycle) >= 3:
                flagged.extend(cycle)
        return list(set(flagged))
    except:
        return []

def detect_smurfing(transactions: List[Transaction], threshold: float = 10000) -> List[str]:
    sender_data = {}
    for tx in transactions:
        if tx.sender not in sender_data:
            sender_data[tx.sender] = {"count": 0, "total": 0, "amounts": []}
        sender_data[tx.sender]["count"] += 1
        sender_data[tx.sender]["total"] += tx.amount
        sender_data[tx.sender]["amounts"].append(tx.amount)
    
    flagged = []
    for sender, data in sender_data.items():
        if data["count"] >= 3:
            all_under_threshold = all(amt < threshold for amt in data["amounts"])
            total_significant = data["total"] >= threshold * 0.7
            if all_under_threshold and total_significant:
                flagged.append(sender)
    return flagged

def detect_structuring(transactions: List[Transaction], threshold: float = 10000) -> List[str]:
    sender_data = {}
    for tx in transactions:
        if tx.sender not in sender_data:
            sender_data[tx.sender] = []
        sender_data[tx.sender].append(tx.amount)
    
    flagged = []
    for sender, amounts in sender_data.items():
        just_under = [amt for amt in amounts if threshold * 0.85 <= amt < threshold]
        if len(just_under) >= 2:
            flagged.append(sender)
    return flagged

def calculate_risk_scores(graph: nx.DiGraph, flagged: List[str]) -> Dict[str, float]:
    scores = {}
    for node in graph.nodes():
        in_deg = graph.in_degree(node)
        out_deg = graph.out_degree(node)
        base_score = min((in_deg + out_deg) / 10, 0.4)
        if node in flagged:
            base_score += 0.5
        if node in blacklisted_accounts:
            base_score = 1.0
        scores[node] = round(min(base_score, 1.0), 2)
    return scores

@app.on_event("startup")
async def startup_event():
    global gnn_model
    blockchain_service.initialize()
    
    if GNN_AVAILABLE:
        try:
            model_path = "fraud_gnn_model.pth"
            if os.path.exists(model_path):
                gnn_model = FraudGNN(in_channels=4, hidden_channels=16, out_channels=2)
                gnn_model.load_state_dict(torch.load(model_path, map_location=torch.device('cpu')))
                gnn_model.eval()
                print("GNN model loaded")
            else:
                print("Training GNN model...")
                data = generate_training_data(num_nodes=100, num_edges=300)
                gnn_model = train_model(data, epochs=100)
                torch.save(gnn_model.state_dict(), model_path)
                print("GNN model trained and saved")
        except Exception as e:
            print(f"GNN error: {e}")

@app.get("/")
async def root():
    return {"message": "FraudNets API", "version": "1.0.0", "status": "running"}

@app.get("/health")
async def health_check():
    return {
        "api": "healthy",
        "blockchain": {"connected": blockchain_service.web3.is_connected() if blockchain_service.web3 else False},
        "gnn": {"loaded": gnn_model is not None}
    }

@app.get("/stats")
async def get_stats():
    return {
        **stats,
        "current_graph_nodes": transaction_graph.number_of_nodes(),
        "current_graph_edges": transaction_graph.number_of_edges()
    }

@app.get("/graph")
async def get_graph():
    nodes = [{"id": n, "name": n, "isBlacklisted": n in blacklisted_accounts,
              "inDegree": transaction_graph.in_degree(n), "outDegree": transaction_graph.out_degree(n)}
             for n in transaction_graph.nodes()]
    links = [{"source": s, "target": t, "value": d.get("weight", 1)}
             for s, t, d in transaction_graph.edges(data=True)]
    return {"nodes": nodes, "links": links}

@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_transactions(request: AnalyzeRequest):
    global stats
    
    for tx in request.transactions:
        if transaction_graph.has_edge(tx.sender, tx.receiver):
            transaction_graph[tx.sender][tx.receiver]["weight"] += tx.amount
        else:
            transaction_graph.add_edge(tx.sender, tx.receiver, weight=tx.amount)
    
    is_fraud = False
    fraud_type = None
    flagged_accounts = []
    
    cycle_flagged = detect_cycles(transaction_graph, request.transactions)
    if cycle_flagged:
        is_fraud = True
        fraud_type = "CYCLE_DETECTED"
        flagged_accounts = cycle_flagged
    
    if not is_fraud:
        smurf_flagged = detect_smurfing(request.transactions)
        if smurf_flagged:
            is_fraud = True
            fraud_type = "SMURFING"
            flagged_accounts = smurf_flagged
    
    if not is_fraud:
        struct_flagged = detect_structuring(request.transactions)
        if struct_flagged:
            is_fraud = True
            fraud_type = "STRUCTURING"
            flagged_accounts = struct_flagged
    
    if not is_fraud and GNN_AVAILABLE and gnn_model is not None:
        try:
            num_nodes = max(transaction_graph.number_of_nodes(), 10)
            num_edges = max(transaction_graph.number_of_edges(), 20)
            data = generate_training_data(num_nodes=num_nodes, num_edges=num_edges)
            predictions = predict_fraud(gnn_model, data)
            fraud_indices = (predictions == 1).nonzero(as_tuple=True)[0].tolist()
            
            if fraud_indices and len(fraud_indices) <= num_nodes * 0.25:
                node_list = list(transaction_graph.nodes())
                gnn_flagged = [node_list[i] for i in fraud_indices[:2] if i < len(node_list)]
                if gnn_flagged:
                    is_fraud = True
                    fraud_type = "GNN_FLAGGED"
                    flagged_accounts = gnn_flagged
        except Exception as e:
            print(f"GNN prediction error: {e}")
    
    flagged_accounts = list(set(flagged_accounts))
    risk_scores = calculate_risk_scores(transaction_graph, flagged_accounts)
    
    blockchain_tx = None
    if is_fraud and flagged_accounts:
        for account in flagged_accounts:
            if account not in blacklisted_accounts:
                blacklisted_accounts.add(account)
                stats["blacklisted_count"] += 1
                import hashlib
                account_hash = hashlib.sha256(account.encode()).hexdigest()
                tx_hash = blockchain_service.blacklist_account(account_hash)
                if tx_hash and not blockchain_tx:
                    blockchain_tx = tx_hash
    
    stats["total_analyses"] += 1
    if is_fraud:
        stats["frauds_detected"] += 1
    
    return AnalyzeResponse(
        is_fraud=is_fraud,
        fraud_type=fraud_type,
        flagged_accounts=flagged_accounts,
        risk_scores=risk_scores,
        blockchain_tx_hash=blockchain_tx,
        timestamp=datetime.now().isoformat()
    )

@app.post("/demo/generate-sample")
async def generate_sample():
    global simulation_counter
    simulation_counter += 1
    
    pattern_sequence = ["normal", "cycle", "smurf", "structuring", "normal", "gnn_trigger"]
    pattern = pattern_sequence[simulation_counter % len(pattern_sequence)]
    
    transactions = []
    base_time = datetime.now()
    
    if pattern == "cycle":
        num_participants = random.randint(3, 4)
        participants = [generate_realistic_name() for _ in range(num_participants)]
        amount = random.randint(20000, 50000)
        
        for i in range(num_participants):
            tx_time = base_time + timedelta(minutes=i * random.randint(10, 30))
            transactions.append(Transaction(
                tx_id=generate_tx_id(),
                sender=participants[i],
                receiver=participants[(i + 1) % num_participants],
                amount=amount + random.randint(-1000, 1000),
                timestamp=tx_time.isoformat()
            ))
            
    elif pattern == "smurf":
        master = generate_realistic_name()
        num_mules = random.randint(4, 6)
        
        for i in range(num_mules):
            tx_time = base_time + timedelta(minutes=i * random.randint(5, 15))
            transactions.append(Transaction(
                tx_id=generate_tx_id(),
                sender=master,
                receiver=generate_realistic_name(),
                amount=random.randint(7500, 9500),
                timestamp=tx_time.isoformat()
            ))
            
    elif pattern == "structuring":
        sender = generate_realistic_name()
        receiver = generate_realistic_name()
        num_txs = random.randint(3, 4)
        
        for i in range(num_txs):
            tx_time = base_time + timedelta(hours=i * random.randint(2, 6))
            transactions.append(Transaction(
                tx_id=generate_tx_id(),
                sender=sender,
                receiver=receiver,
                amount=random.randint(8600, 9800),
                timestamp=tx_time.isoformat()
            ))
            
    elif pattern == "gnn_trigger":
        people = [generate_realistic_name() for _ in range(8)]
        for i in range(6):
            sender = people[i % len(people)]
            receiver = people[(i + random.randint(1, 3)) % len(people)]
            transactions.append(Transaction(
                tx_id=generate_tx_id(),
                sender=sender,
                receiver=receiver,
                amount=random.randint(3000, 7000),
                timestamp=(base_time + timedelta(minutes=i * 10)).isoformat()
            ))
    else:
        people = [generate_realistic_name() for _ in range(4)]
        num_txs = random.randint(2, 4)
        
        for i in range(num_txs):
            sender, receiver = random.sample(people, 2)
            tx_time = base_time + timedelta(minutes=i * random.randint(30, 60))
            transactions.append(Transaction(
                tx_id=generate_tx_id(),
                sender=sender,
                receiver=receiver,
                amount=random.randint(100, 3000),
                timestamp=tx_time.isoformat()
            ))
    
    return {"transactions": transactions, "pattern": pattern}

@app.get("/blacklist")
async def get_blacklist():
    return {"blacklisted_accounts": list(blacklisted_accounts), "total_count": len(blacklisted_accounts)}

@app.delete("/reset")
async def reset_system():
    global stats, blacklisted_accounts, transaction_graph, simulation_counter
    transaction_graph = nx.DiGraph()
    blacklisted_accounts = set()
    simulation_counter = 0
    stats = {"total_analyses": 0, "frauds_detected": 0, "blacklisted_count": 0}
    return {"message": "System reset successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)