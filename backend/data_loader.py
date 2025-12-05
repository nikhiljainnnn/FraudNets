import torch
from torch_geometric.data import Data
import random
import numpy as np

def generate_training_data(num_nodes: int = 100, num_edges: int = 300, fraud_ratio: float = 0.2) -> Data:
    random.seed(42)
    np.random.seed(42)
    
    in_degree = np.zeros(num_nodes)
    out_degree = np.zeros(num_nodes)
    transaction_volume = np.random.uniform(0, 1, num_nodes)
    avg_amount = np.random.uniform(0, 1, num_nodes)
    
    edge_index = []
    for _ in range(num_edges):
        src = random.randint(0, num_nodes - 1)
        dst = random.randint(0, num_nodes - 1)
        if src != dst:
            edge_index.append([src, dst])
            out_degree[src] += 1
            in_degree[dst] += 1
    
    edge_index = torch.tensor(edge_index, dtype=torch.long).t().contiguous()
    
    in_degree = (in_degree - in_degree.min()) / (in_degree.max() - in_degree.min() + 1e-8)
    out_degree = (out_degree - out_degree.min()) / (out_degree.max() - out_degree.min() + 1e-8)
    
    x = torch.tensor(np.stack([
        in_degree,
        out_degree,
        transaction_volume,
        avg_amount
    ], axis=1), dtype=torch.float)
    
    labels = np.zeros(num_nodes, dtype=np.int64)
    num_fraud = int(num_nodes * fraud_ratio)
    fraud_indices = random.sample(range(num_nodes), num_fraud)
    for idx in fraud_indices:
        labels[idx] = 1
    
    y = torch.tensor(labels, dtype=torch.long)
    
    return Data(x=x, edge_index=edge_index, y=y)

def create_cycle_pattern(start_id: int = 0) -> list:
    nodes = [f"cycle_{start_id}_{i}" for i in range(3)]
    edges = [
        (nodes[0], nodes[1]),
        (nodes[1], nodes[2]),
        (nodes[2], nodes[0])
    ]
    return nodes, edges

def create_smurfing_pattern(master_id: int = 0, num_mules: int = 5) -> list:
    master = f"smurf_master_{master_id}"
    mules = [f"mule_{master_id}_{i}" for i in range(num_mules)]
    edges = [(master, mule) for mule in mules]
    return [master] + mules, edges
