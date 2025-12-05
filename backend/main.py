from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import networkx as nx
from datetime import datetime
import random
import os
from dotenv import load_dotenv

load_dotenv()

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

@app.get("/")
async def root():
    return {"message": "FraudNets API is running", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {
        "api": "healthy",
        "blockchain": {"connected": False},
        "gnn": {"loaded": False, "note": "Using algorithmic detection"}
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
    
    flagged_accounts = list(set(flagged_accounts))
    risk_scores = calculate_risk_scores(transaction_graph, flagged_accounts)
    
    if is_fraud and flagged_accounts:
        for account in flagged_accounts:
            blacklisted_accounts.add(account)
    
    stats["total_analyses"] += 1
    if is_fraud:
        stats["frauds_detected"] += 1
    
    return AnalyzeResponse(
        is_fraud=is_fraud,
        fraud_type=fraud_type,
        flagged_accounts=flagged_accounts,
        risk_scores=risk_scores,
        blockchain_tx_hash=None,
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