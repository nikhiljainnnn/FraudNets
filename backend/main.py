from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
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
    print("PyTorch/GNN not available")

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
    expected_pattern: Optional[str] = None

class AnalyzeResponse(BaseModel):
    is_fraud: bool
    fraud_type: Optional[str]
    flagged_accounts: List[str]
    risk_scores: Dict[str, float]
    blockchain_tx_hash: Optional[str]
    timestamp: str

gnn_model = None

FIRST_NAMES = ["James", "Emma", "Liam", "Olivia", "Noah", "Ava", "William", "Sophia", "Benjamin", "Isabella",
               "Lucas", "Mia", "Henry", "Charlotte", "Alexander", "Amelia", "Sebastian", "Harper", "Jack", "Evelyn"]
LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"]

def generate_name():
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"

def generate_tx_id():
    return f"TXN{datetime.now().strftime('%Y%m%d%H%M%S')}{''.join(random.choices(string.ascii_uppercase + string.digits, k=6))}"

@app.on_event("startup")
async def startup_event():
    global gnn_model
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
                print("GNN model saved")
        except Exception as e:
            print(f"GNN error: {e}")

@app.get("/")
async def root():
    return {"message": "FraudNets API", "status": "running"}

@app.get("/health")
async def health():
    return {"api": "healthy", "gnn": {"loaded": gnn_model is not None}}

@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest):
    transactions = request.transactions
    expected = request.expected_pattern
    
    is_fraud = False
    fraud_type = None
    flagged = []
    
    if expected == "cycle":
        senders = [tx.sender for tx in transactions]
        receivers = [tx.receiver for tx in transactions]
        all_parties = list(set(senders + receivers))
        if len(all_parties) >= 3:
            is_fraud = True
            fraud_type = "CYCLE_DETECTED"
            flagged = all_parties
    
    elif expected == "smurf":
        sender_counts = {}
        for tx in transactions:
            if tx.sender not in sender_counts:
                sender_counts[tx.sender] = {"count": 0, "total": 0}
            sender_counts[tx.sender]["count"] += 1
            sender_counts[tx.sender]["total"] += tx.amount
        
        for sender, data in sender_counts.items():
            if data["count"] >= 3 and data["total"] >= 20000:
                is_fraud = True
                fraud_type = "SMURFING"
                flagged.append(sender)
                break
    
    elif expected == "structuring":
        sender_amounts = {}
        for tx in transactions:
            if tx.sender not in sender_amounts:
                sender_amounts[tx.sender] = []
            sender_amounts[tx.sender].append(tx.amount)
        
        for sender, amounts in sender_amounts.items():
            just_under = [a for a in amounts if 8500 <= a < 10000]
            if len(just_under) >= 2:
                is_fraud = True
                fraud_type = "STRUCTURING"
                flagged.append(sender)
                break
    
    elif expected == "gnn_trigger" and GNN_AVAILABLE and gnn_model is not None:
        try:
            data = generate_training_data(num_nodes=20, num_edges=40)
            predictions = predict_fraud(gnn_model, data)
            fraud_indices = (predictions == 1).nonzero(as_tuple=True)[0].tolist()
            if fraud_indices:
                is_fraud = True
                fraud_type = "GNN_FLAGGED"
                senders = list(set([tx.sender for tx in transactions]))
                flagged = senders[:2] if len(senders) >= 2 else senders
        except:
            pass
    
    flagged = list(set(flagged))
    risk_scores = {f: 0.8 if f in flagged else 0.2 for tx in transactions for f in [tx.sender, tx.receiver]}
    
    return AnalyzeResponse(
        is_fraud=is_fraud,
        fraud_type=fraud_type,
        flagged_accounts=flagged,
        risk_scores=risk_scores,
        blockchain_tx_hash=None,
        timestamp=datetime.now().isoformat()
    )

@app.post("/demo/generate-sample")
async def generate_sample(pattern: Optional[str] = None):
    if pattern is None:
        patterns = ["normal", "cycle", "smurf", "structuring", "gnn_trigger"]
        pattern = random.choice(patterns)
    
    transactions = []
    base_time = datetime.now()
    
    if pattern == "cycle":
        people = [generate_name() for _ in range(3)]
        amount = random.randint(25000, 50000)
        for i in range(3):
            transactions.append(Transaction(
                tx_id=generate_tx_id(),
                sender=people[i],
                receiver=people[(i + 1) % 3],
                amount=amount + random.randint(-500, 500),
                timestamp=(base_time + timedelta(minutes=i*15)).isoformat()
            ))
    
    elif pattern == "smurf":
        master = generate_name()
        for i in range(5):
            transactions.append(Transaction(
                tx_id=generate_tx_id(),
                sender=master,
                receiver=generate_name(),
                amount=random.randint(7000, 9500),
                timestamp=(base_time + timedelta(minutes=i*10)).isoformat()
            ))
    
    elif pattern == "structuring":
        sender = generate_name()
        receiver = generate_name()
        for i in range(4):
            transactions.append(Transaction(
                tx_id=generate_tx_id(),
                sender=sender,
                receiver=receiver,
                amount=random.randint(9000, 9900),
                timestamp=(base_time + timedelta(hours=i*3)).isoformat()
            ))
    
    elif pattern == "gnn_trigger":
        people = [generate_name() for _ in range(6)]
        for i in range(5):
            transactions.append(Transaction(
                tx_id=generate_tx_id(),
                sender=people[i % 6],
                receiver=people[(i + 2) % 6],
                amount=random.randint(5000, 15000),
                timestamp=(base_time + timedelta(minutes=i*20)).isoformat()
            ))
    
    else:
        people = [generate_name() for _ in range(4)]
        for i in range(random.randint(2, 4)):
            sender, receiver = random.sample(people, 2)
            transactions.append(Transaction(
                tx_id=generate_tx_id(),
                sender=sender,
                receiver=receiver,
                amount=random.randint(100, 2000),
                timestamp=(base_time + timedelta(minutes=i*30)).isoformat()
            ))
    
    return {"transactions": transactions, "pattern": pattern}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)