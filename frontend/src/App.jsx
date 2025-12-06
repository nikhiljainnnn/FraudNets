import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Activity, Shield, AlertTriangle, Network, Clock, Zap, Settings, Sun, Moon, LogOut } from 'lucide-react';
import { useTheme } from './context/ThemeContext';
import StatsCard from './components/StatsCard';
import TransactionFeed from './components/TransactionFeed';
import GraphView from './components/GraphView';
import RiskMeter from './components/RiskMeter';
import FraudPatterns from './components/FraudPatterns';
import AlertsPanel from './components/AlertsPanel';
import SettingsModal from './components/SettingsModal';
import LoginPage from './components/LoginPage';
import Toast from './components/Toast';

const API_URL = 'https://fraudnets.onrender.com';

const PATTERN_SEQUENCE = ['normal', 'cycle', 'smurf', 'structuring', 'normal', 'gnn_trigger'];

function App() {
  const { theme, toggleTheme, settings } = useTheme();
  const [showSettings, setShowSettings] = useState(false);
  const [user, setUser] = useState(null);
  const [toast, setToast] = useState(null);
  const [patternIndex, setPatternIndex] = useState(0);

  const [stats, setStats] = useState({
    total_analyses: 0,
    frauds_detected: 0,
    blacklisted_count: 0,
    current_graph_nodes: 0
  });

  const [transactions, setTransactions] = useState([]);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [isSimulating, setIsSimulating] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [blacklistedAccounts, setBlacklistedAccounts] = useState(new Set());
  const [fraudPatterns, setFraudPatterns] = useState({
    CYCLE_DETECTED: 0,
    SMURFING: 0,
    GNN_FLAGGED: 0,
    STRUCTURING: 0
  });

  useEffect(() => {
    const savedUser = localStorage.getItem('fraudnets_user');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setUser(userData);

      const savedState = localStorage.getItem(`fraudnets_state_${userData.username}`);
      if (savedState) {
        const state = JSON.parse(savedState);
        setTransactions(state.transactions || []);
        setAlerts(state.alerts || []);
        setFraudPatterns(state.fraudPatterns || {
          CYCLE_DETECTED: 0,
          SMURFING: 0,
          GNN_FLAGGED: 0,
          STRUCTURING: 0
        });
        setPatternIndex(state.patternIndex || 0);
        setBlacklistedAccounts(new Set(state.blacklisted || []));
        setStats(state.stats || {
          total_analyses: 0,
          frauds_detected: 0,
          blacklisted_count: 0,
          current_graph_nodes: 0
        });
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      const state = {
        transactions,
        alerts,
        fraudPatterns,
        patternIndex,
        blacklisted: Array.from(blacklistedAccounts),
        stats
      };
      localStorage.setItem(`fraudnets_state_${user.username}`, JSON.stringify(state));
    }
  }, [user, transactions, alerts, fraudPatterns, patternIndex, blacklistedAccounts, stats]);

  const handleLogin = (userData) => {
    setUser(userData);

    const savedState = localStorage.getItem(`fraudnets_state_${userData.username}`);
    if (!savedState) {
      setTransactions([]);
      setAlerts([]);
      setFraudPatterns({
        CYCLE_DETECTED: 0,
        SMURFING: 0,
        GNN_FLAGGED: 0,
        STRUCTURING: 0
      });
      setPatternIndex(0);
      setBlacklistedAccounts(new Set());
      setStats({
        total_analyses: 0,
        frauds_detected: 0,
        blacklisted_count: 0,
        current_graph_nodes: 0
      });
    }

    showToast(`Welcome, ${userData.username}!`, 'success');
  };

  const handleLogout = () => {
    localStorage.removeItem('fraudnets_user');
    setUser(null);
    setTransactions([]);
    setAlerts([]);
    setFraudPatterns({
      CYCLE_DETECTED: 0,
      SMURFING: 0,
      GNN_FLAGGED: 0,
      STRUCTURING: 0
    });
    setPatternIndex(0);
    setBlacklistedAccounts(new Set());
    setStats({
      total_analyses: 0,
      frauds_detected: 0,
      blacklisted_count: 0,
      current_graph_nodes: 0
    });
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const buildGraphFromTransactions = useCallback((txs, blacklisted) => {
    const nodeMap = new Map();
    const links = [];

    txs.forEach(tx => {
      if (!nodeMap.has(tx.sender)) {
        nodeMap.set(tx.sender, { id: tx.sender, name: tx.sender, inDegree: 0, outDegree: 0 });
      }
      if (!nodeMap.has(tx.receiver)) {
        nodeMap.set(tx.receiver, { id: tx.receiver, name: tx.receiver, inDegree: 0, outDegree: 0 });
      }
      nodeMap.get(tx.sender).outDegree += 1;
      nodeMap.get(tx.receiver).inDegree += 1;
      links.push({ source: tx.sender, target: tx.receiver, value: tx.amount });
    });

    const nodes = Array.from(nodeMap.values()).map(n => ({
      ...n,
      isBlacklisted: blacklisted.has(n.id)
    }));

    return { nodes, links };
  }, []);

  const simulateTraffic = async () => {
    if (isSimulating) return;
    setIsSimulating(true);

    try {
      const currentPattern = PATTERN_SEQUENCE[patternIndex % PATTERN_SEQUENCE.length];
      setPatternIndex(prev => prev + 1);

      const sampleRes = await axios.post(`${API_URL}/demo/generate-sample?pattern=${currentPattern}`);
      const txs = sampleRes.data.transactions;
      const pattern = sampleRes.data.pattern;

      const analyzeRes = await axios.post(`${API_URL}/analyze`, {
        transactions: txs,
        bank_id: user?.sessionId || "DEMO_BANK",
        expected_pattern: pattern
      });

      const result = analyzeRes.data;

      if (result.is_fraud && result.fraud_type) {
        setFraudPatterns(prev => ({
          ...prev,
          [result.fraud_type]: (prev[result.fraud_type] || 0) + 1
        }));

        const newAlert = {
          id: Date.now(),
          type: result.fraud_type,
          message: `${result.fraud_type.replace(/_/g, ' ')} - ${result.flagged_accounts.length} account(s) blacklisted`,
          accounts: result.flagged_accounts,
          timestamp: new Date().toISOString(),
          severity: result.fraud_type === 'CYCLE_DETECTED' ? 'high' : 'medium'
        };
        setAlerts(prev => [newAlert, ...prev].slice(0, 10));

        setBlacklistedAccounts(prev => {
          const newSet = new Set(prev);
          result.flagged_accounts.forEach(acc => newSet.add(acc));
          return newSet;
        });

        showToast(`🚨 ${result.fraud_type.replace(/_/g, ' ')}: ${result.flagged_accounts.length} account(s) permanently blacklisted!`, 'warning');

        setStats(prev => ({
          ...prev,
          total_analyses: prev.total_analyses + 1,
          frauds_detected: prev.frauds_detected + 1,
          blacklisted_count: prev.blacklisted_count + result.flagged_accounts.length
        }));
      } else {
        showToast(`✓ ${txs.length} valid transaction(s) processed`, 'success');
        setStats(prev => ({
          ...prev,
          total_analyses: prev.total_analyses + 1
        }));
      }

      const newTxs = txs.map(tx => ({
        ...tx,
        is_fraud: result.flagged_accounts?.includes(tx.sender) || result.flagged_accounts?.includes(tx.receiver),
        fraud_type: result.is_fraud ? result.fraud_type : null,
        timestamp: tx.timestamp || new Date().toISOString()
      }));

      setTransactions(prev => {
        const updated = [...newTxs, ...prev].slice(0, 100);
        const graph = buildGraphFromTransactions(updated, blacklistedAccounts);
        setGraphData(graph);
        setStats(s => ({ ...s, current_graph_nodes: graph.nodes.length }));
        return updated;
      });

    } catch (error) {
      console.error("Simulation error:", error);
      showToast('Failed to run simulation. Check if backend is running.', 'error');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleClearHistory = () => {
    setTransactions([]);
    setAlerts([]);
    setGraphData({ nodes: [], links: [] });
    setFraudPatterns({
      CYCLE_DETECTED: 0,
      SMURFING: 0,
      GNN_FLAGGED: 0,
      STRUCTURING: 0
    });
    setPatternIndex(0);
    setBlacklistedAccounts(new Set());
    setStats({
      total_analyses: 0,
      frauds_detected: 0,
      blacklisted_count: 0,
      current_graph_nodes: 0
    });
    showToast('All data cleared', 'success');
  };

  const handleExportHistory = () => {
    if (transactions.length === 0) {
      showToast('No transactions to export', 'error');
      return;
    }

    const headers = ['TX_ID', 'Sender', 'Receiver', 'Amount', 'Fraud', 'Type', 'Timestamp'];
    const csvContent = [
      headers.join(','),
      ...transactions.map(tx => [
        tx.tx_id || '',
        tx.sender,
        tx.receiver,
        tx.amount,
        tx.is_fraud ? 'Yes' : 'No',
        tx.fraud_type || 'VALID',
        tx.timestamp || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fraudnets_${user?.username || 'export'}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported successfully', 'success');
  };

  useEffect(() => {
    if (transactions.length > 0) {
      const graph = buildGraphFromTransactions(transactions, blacklistedAccounts);
      setGraphData(graph);
    }
  }, [blacklistedAccounts, buildGraphFromTransactions]);

  const riskScore = stats.total_analyses > 0
    ? Math.round((stats.frauds_detected / stats.total_analyses) * 100)
    : 0;

  const detectionRate = stats.total_analyses > 0
    ? ((stats.frauds_detected / stats.total_analyses) * 100).toFixed(1)
    : 0;

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <header style={{
        borderBottom: '1px solid var(--border-primary)',
        background: 'var(--bg-secondary)'
      }}>
        <div className="container flex items-center justify-between" style={{ padding: '12px 24px' }}>
          <div className="flex items-center gap-3">
            <div style={{
              padding: '6px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              borderRadius: '8px'
            }}>
              <Shield size={18} style={{ color: 'white' }} />
            </div>
            <div>
              <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>
                FraudNets
              </span>
              <span style={{
                fontSize: '10px',
                color: 'var(--text-tertiary)',
                marginLeft: '8px',
                padding: '2px 6px',
                background: 'var(--bg-tertiary)',
                borderRadius: '4px'
              }}>
                AI-Powered
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              background: 'var(--bg-tertiary)',
              borderRadius: '6px',
              fontSize: '12px',
              color: 'var(--text-secondary)'
            }}>
              <span>👤 {user.username}</span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '6px 12px',
              background: 'var(--bg-tertiary)',
              borderRadius: '6px',
              fontSize: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                <Clock size={12} />
                <span>Live</span>
              </div>
              <div className="status-indicator">
                <span className="status-dot"></span>
                <span>Connected</span>
              </div>
            </div>

            <button
              onClick={simulateTraffic}
              disabled={isSimulating}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Zap size={14} />
              {isSimulating ? 'Processing...' : 'Run Simulation'}
            </button>

            <button
              onClick={toggleTheme}
              className="btn btn-icon"
              title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button
              onClick={() => setShowSettings(true)}
              className="btn btn-icon"
              title="Settings"
            >
              <Settings size={18} />
            </button>

            <button
              onClick={handleLogout}
              className="btn btn-icon"
              title="Logout"
              style={{ color: 'var(--accent-red)' }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="container" style={{ padding: '20px 24px' }}>
        <div className="grid grid-cols-5 gap-4 mb-5">
          <StatsCard
            label="Total Transactions"
            value={stats.total_analyses}
            icon={Activity}
            trend={`${detectionRate}% flagged`}
          />
          <StatsCard
            label="Fraud Detected"
            value={stats.frauds_detected}
            icon={AlertTriangle}
            variant="danger"
            trend={stats.frauds_detected > 0 ? 'Active threats' : 'No threats'}
          />
          <StatsCard
            label="Blacklisted"
            value={stats.blacklisted_count}
            icon={Shield}
            trend="Permanent"
          />
          <StatsCard
            label="Network Nodes"
            value={stats.current_graph_nodes}
            icon={Network}
            trend={`${graphData.links.length} connections`}
          />
          <RiskMeter score={riskScore} />
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="col-span-3 space-y-4">
            <div className="card" style={{ height: '420px' }}>
              <div className="card-header">
                <span className="card-title">Network Topology</span>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  {graphData.nodes.length} nodes · {graphData.links.length} edges
                </span>
              </div>
              <div style={{ height: 'calc(100% - 49px)' }}>
                <GraphView graphData={graphData} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FraudPatterns patterns={fraudPatterns} />
              <AlertsPanel alerts={alerts} />
            </div>
          </div>

          <div className="card" style={{ height: '600px' }}>
            <div className="card-header">
              <span className="card-title">Live Feed</span>
              <span className="badge badge-neutral">{transactions.length}</span>
            </div>
            <div style={{ height: 'calc(100% - 49px)', overflow: 'hidden' }}>
              <TransactionFeed transactions={transactions} />
            </div>
          </div>
        </div>
      </main>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        history={transactions}
        onClearHistory={handleClearHistory}
        onExportHistory={handleExportHistory}
      />
    </div>
  );
}

export default App;