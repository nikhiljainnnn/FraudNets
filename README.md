# FraudNets 🛡️

**AI-Powered Real-Time Money Laundering Detection System**

A full-stack fraud detection platform that uses Graph Neural Networks (GNN) to identify suspicious transaction patterns like smurfing, cycle transactions, and structuring in real-time.

![Dashboard](https://img.shields.io/badge/Status-Active-brightgreen) ![Python](https://img.shields.io/badge/Python-3.10+-blue) ![React](https://img.shields.io/badge/React-18-61dafb) ![License](https://img.shields.io/badge/License-MIT-yellow)

---

## ✨ Features

- **🧠 GNN-Based Detection** — Graph Convolutional Network trained to identify fraud patterns
- **📊 Real-Time Dashboard** — Interactive 3D network visualization with live transaction feed
- **🔍 Pattern Recognition** — Detects Cycles, Smurfing, Structuring, and AI-flagged anomalies
- **⛓️ Blockchain Integration** — Optional on-chain blacklist via Ethereum smart contract
- **🎨 Dark/Light Mode** — Professional UI with theme switching
- **📈 Risk Scoring** — Dynamic risk meter based on fraud detection rate
- **🔔 Real-Time Alerts** — Instant notifications for detected threats
- **📥 Export History** — Download transaction logs as CSV

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  ┌─────────┐ ┌──────────────┐ ┌─────────────┐ ┌──────────┐  │
│  │  Stats  │ │ 3D Graph View│ │ Transaction │ │ Settings │  │
│  │  Cards  │ │  (Force 3D)  │ │    Feed     │ │  Modal   │  │
│  └─────────┘ └──────────────┘ └─────────────┘ └──────────┘  │
└─────────────────────────┬───────────────────────────────────┘
                          │ REST API
┌─────────────────────────▼───────────────────────────────────┐
│                     Backend (FastAPI)                        │
│  ┌──────────────┐ ┌──────────────┐ ┌─────────────────────┐  │
│  │  GNN Model   │ │ Pattern Algo │ │  Blockchain Service │  │
│  │ (PyTorch Geo)│ │ (NetworkX)   │ │     (Web3.py)       │  │
│  └──────────────┘ └──────────────┘ └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **npm 9+**

### 1. Clone the Repository

```bash
git clone https://github.com/nikhiljainnnn/FraudNets.git
cd FraudNets
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\activate

# Activate (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start server
python -m uvicorn main:app --reload
```

Backend runs at: `http://localhost:8000`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend runs at: `http://localhost:5173`

### 4. Using Batch Scripts (Windows)

```bash
# Start backend
.\start_backend.bat

# Start frontend (new terminal)
.\start_frontend.bat
```

---

## 📁 Project Structure

```
FraudNets/
├── backend/
│   ├── main.py              # FastAPI endpoints
│   ├── gnn_model.py         # GNN architecture (GCN)
│   ├── data_loader.py       # Synthetic data generator
│   └── requirements.txt     # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── GraphView.jsx
│   │   │   ├── StatsCard.jsx
│   │   │   ├── TransactionFeed.jsx
│   │   │   ├── RiskMeter.jsx
│   │   │   ├── FraudPatterns.jsx
│   │   │   ├── AlertsPanel.jsx
│   │   │   └── SettingsModal.jsx
│   │   ├── context/
│   │   │   └── ThemeContext.jsx
│   │   ├── App.jsx
│   │   └── index.css
│   └── package.json
│
├── contracts/
│   └── FraudRegistry.sol    # Solidity smart contract
│
├── start_frontend.bat
├── start_backend.bat
└── README.md
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/stats` | Get dashboard statistics |
| `GET` | `/graph` | Get network graph data |
| `POST` | `/analyze` | Analyze transactions for fraud |
| `POST` | `/demo/generate-sample` | Generate sample transactions |

### Example: Analyze Transactions

```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "transactions": [
      {"tx_id": "TX001", "sender": "A", "receiver": "B", "amount": 5000},
      {"tx_id": "TX002", "sender": "B", "receiver": "C", "amount": 5000},
      {"tx_id": "TX003", "sender": "C", "receiver": "A", "amount": 5000}
    ],
    "bank_id": "DEMO_BANK"
  }'
```

---

## 🎯 Fraud Patterns Detected

| Pattern | Description |
|---------|-------------|
| **Cycle Detection** | A → B → C → A circular money flow |
| **Smurfing** | Multiple small transactions to avoid thresholds |
| **Structuring** | Breaking large amounts into smaller chunks |
| **GNN Flagged** | AI model detects anomalous node behavior |

---

## ⚙️ Configuration

### Environment Variables (Backend)

Create `backend/.env`:

```env
# Optional: Blockchain Integration
GANACHE_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS=0x...
PRIVATE_KEY=0x...
```

---

## 🛠️ Tech Stack

**Backend:**
- FastAPI
- PyTorch + PyTorch Geometric
- NetworkX
- Web3.py
- Pydantic

**Frontend:**
- React 18
- Vite
- Tailwind CSS
- Three.js / react-force-graph-3d
- Axios
- Lucide Icons

**Blockchain:**
- Solidity
- Ethereum (Ganache/Testnet)

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 👤 Author

**Nikhil Jain**  
GitHub: [@nikhiljainnnn](https://github.com/nikhiljainnnn)

---

## 🙏 Acknowledgments

- PyTorch Geometric for GNN implementation
- react-force-graph-3d for network visualization
- FastAPI for high-performance backend
