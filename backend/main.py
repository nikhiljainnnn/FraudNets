from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import networkx as nx
from datetime import datetime
import random
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
            dummy_address = Web3.to_checksum_address(
                "0x" + account_hash[:40].ljust(40, '0')
            )
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

def detect_cycles(graph: nx.DiGraph) -> List[List[str]]:
    try:
        cycles = list(nx.simple_cycles(graph))
        return [c for c in cycles if len(c) >= 3]
    except:
        return []

def detect_smurfing(transactions: List[Transaction], threshold: float = 10000) -> List[str]:
    sender_totals = {}
    for tx in transactions:
        if tx.sender not in sender_totals:
            sender_totals[tx.sender] = {"count": 0, "total": 0}
        sender_totals[tx.sender]["count"] += 1
        sender_totals[tx.sender]["total"] += tx.amount
    
    flagged = []
    for sender, data in sender_totals.items():
        if data["count"] >= 3 and data["total"] >= threshold * 0.8:
            avg = data["total"] / data["count"]
            if avg < threshold:
                flagged.append(sender)
    return flagged

def calculate_risk_scores(graph: nx.DiGraph, flagged: List[str]) -> Dict[str, float]:
    scores = {}
    for node in graph.nodes():
        in_deg = graph.in_degree(node)
        out_deg = graph.out_degree(node)
        base_score = min((in_deg + out_deg) / 10, 0.5)
        if node in flagged:
            base_score += 0.4
        scores[node] = min(base_score, 1.0)
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
                gnn_model.load_state_dict(torch.load(model_path))
                gnn_model.eval()
                print("GNN model loaded from file")
            else:
                print("Training new GNN model...")
                data = generate_training_data(num_nodes=100, num_edges=300)
                gnn_model = train_model(data, epochs=100)
                torch.save(gnn_model.state_dict(), model_path)
                print("GNN model trained and saved")
        except Exception as e:
            print(f"GNN initialization error: {e}")

@app.get("/health")
async def health_check():
    return {
        "api": "healthy",
        "blockchain": {
            "connected": blockchain_service.web3.is_connected() if blockchain_service.web3 else False
        },
        "gnn": {
            "loaded": gnn_model is not None
        }
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
    nodes = []
    for node in transaction_graph.nodes():
        nodes.append({
            "id": node,
            "name": node,
            "isBlacklisted": node in blacklisted_accounts,
            "inDegree": transaction_graph.in_degree(node),
            "outDegree": transaction_graph.out_degree(node)
        })
    
    links = []
    for source, target, data in transaction_graph.edges(data=True):
        links.append({
            "source": source,
            "target": target,
            "value": data.get("weight", 1)
        })
    
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
    
    cycles = detect_cycles(transaction_graph)
    if cycles:
        is_fraud = True
        fraud_type = "CYCLE_DETECTED"
        for cycle in cycles:
            flagged_accounts.extend(cycle)
    
    if not is_fraud:
        smurfers = detect_smurfing(request.transactions)
        if smurfers:
            is_fraud = True
            fraud_type = "SMURFING"
            flagged_accounts.extend(smurfers)
    
    if not is_fraud and GNN_AVAILABLE and gnn_model is not None:
        try:
            data = generate_training_data(
                num_nodes=transaction_graph.number_of_nodes() or 10,
                num_edges=transaction_graph.number_of_edges() or 20
            )
            predictions = predict_fraud(gnn_model, data)
            fraud_nodes = (predictions == 1).nonzero(as_tuple=True)[0].tolist()
            if fraud_nodes:
                is_fraud = True
                fraud_type = "GNN_FLAGGED"
                node_list = list(transaction_graph.nodes())
                for idx in fraud_nodes:
                    if idx < len(node_list):
                        flagged_accounts.append(node_list[idx])
        except Exception as e:
            print(f"GNN prediction error: {e}")
    
    flagged_accounts = list(set(flagged_accounts))
    risk_scores = calculate_risk_scores(transaction_graph, flagged_accounts)
    
    blockchain_tx = None
    if is_fraud and flagged_accounts:
        for account in flagged_accounts:
            blacklisted_accounts.add(account)
            import hashlib
            account_hash = hashlib.sha256(account.encode()).hexdigest()
            tx_hash = blockchain_service.blacklist_account(account_hash)
            if tx_hash:
                blockchain_tx = tx_hash
                stats["blacklisted_count"] += 1
    
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
    patterns = ["normal", "cycle", "smurf"]
    pattern = random.choice(patterns)
    
    transactions = []
    
    if pattern == "cycle":
        participants = ["Cycle_A", "Cycle_B", "Cycle_C"]
        amount = random.randint(5000, 15000)
        for i in range(len(participants)):
            transactions.append(Transaction(
                tx_id=f"TX_CYCLE_{i}",
                sender=participants[i],
                receiver=participants[(i + 1) % len(participants)],
                amount=amount,
                timestamp=datetime.now().isoformat()
            ))
    elif pattern == "smurf":
        master = f"Smurf_Master_{random.randint(1, 100)}"
        for i in range(5):
            transactions.append(Transaction(
                tx_id=f"TX_SMURF_{i}",
                sender=master,
                receiver=f"Mule_{random.randint(1, 50)}",
                amount=random.randint(8000, 9500),
                timestamp=datetime.now().isoformat()
            ))
    else:
        names = ["Alice", "Bob", "Charlie", "David", "Eve"]
        for i in range(random.randint(2, 4)):
            sender, receiver = random.sample(names, 2)
            transactions.append(Transaction(
                tx_id=f"TX_NORMAL_{i}",
                sender=sender,
                receiver=receiver,
                amount=random.randint(100, 1000),
                timestamp=datetime.now().isoformat()
            ))
    
    return {"transactions": transactions, "pattern": pattern}

@app.get("/blacklist")
async def get_blacklist():
    return {"blacklisted_accounts": list(blacklisted_accounts)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)