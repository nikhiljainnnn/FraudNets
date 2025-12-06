import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Activity, Shield, AlertTriangle, Network, Clock, Zap, Settings, Sun, Moon } from 'lucide-react';
import { useTheme } from './context/ThemeContext';
import StatsCard from './components/StatsCard';
import TransactionFeed from './components/TransactionFeed';
import GraphView from './components/GraphView';
import RiskMeter from './components/RiskMeter';
import FraudPatterns from './components/FraudPatterns';
import AlertsPanel from './components/AlertsPanel';
import SettingsModal from './components/SettingsModal';

const API_URL = 'https://fraudnets.onrender.com';

function App() {
  const { theme, toggleTheme, settings } = useTheme();
  const [showSettings, setShowSettings] = useState(false);

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
  const [fraudPatterns, setFraudPatterns] = useState({
    CYCLE_DETECTED: 0,
    SMURFING: 0,
    GNN_FLAGGED: 0,
    STRUCTURING: 0
  });

  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/stats`);
      setStats(res.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, []);

  const fetchGraph = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/graph`);
      setGraphData(res.data);
    } catch (error) {
      console.error("Error fetching graph:", error);
    }
  }, []);

  const simulateTraffic = async () => {
    if (isSimulating) return;
    setIsSimulating(true);

    try {
      const sampleRes = await axios.post(`${API_URL}/demo/generate-sample`);
      const txs = sampleRes.data.transactions;

      const analyzeRes = await axios.post(`${API_URL}/analyze`, {
        transactions: txs,
        bank_id: "DEMO_BANK"
      });

      const result = analyzeRes.data;

      if (result.fraud_type) {
        setFraudPatterns(prev => ({
          ...prev,
          [result.fraud_type]: (prev[result.fraud_type] || 0) + 1
        }));
      }

      if (result.is_fraud) {
        const newAlert = {
          id: Date.now(),
          type: result.fraud_type,
          message: `${result.fraud_type} detected involving ${result.flagged_accounts.length} accounts`,
          accounts: result.flagged_accounts,
          timestamp: new Date().toISOString(),
          severity: result.fraud_type === 'CYCLE_DETECTED' ? 'high' : 'medium'
        };
        setAlerts(prev => [newAlert, ...prev].slice(0, 10));
      }

      const newTxs = txs.map(tx => ({
        ...tx,
        is_fraud: result.flagged_accounts.includes(tx.sender) || result.flagged_accounts.includes(tx.receiver),
        fraud_type: result.fraud_type,
        timestamp: new Date().toISOString()
      }));

      setTransactions(prev => [...newTxs, ...prev].slice(0, 100));
      await fetchStats();
      await fetchGraph();

    } catch (error) {
      console.error("Simulation error:", error);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleClearHistory = () => {
    setTransactions([]);
    setAlerts([]);
    setFraudPatterns({
      CYCLE_DETECTED: 0,
      SMURFING: 0,
      GNN_FLAGGED: 0,
      STRUCTURING: 0
    });
  };

  const handleExportHistory = () => {
    if (transactions.length === 0) return;

    const headers = ['Sender', 'Receiver', 'Amount', 'Fraud', 'Type', 'Timestamp'];
    const csvContent = [
      headers.join(','),
      ...transactions.map(tx => [
        tx.sender,
        tx.receiver,
        tx.amount,
        tx.is_fraud ? 'Yes' : 'No',
        tx.fraud_type || 'N/A',
        tx.timestamp || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fraudnets_history_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchStats();
    fetchGraph();

    if (settings.autoRefresh) {
      const interval = setInterval(() => {
        fetchStats();
        fetchGraph();
      }, settings.refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [fetchStats, fetchGraph, settings.autoRefresh, settings.refreshInterval]);

  const riskScore = stats.total_analyses > 0
    ? Math.round((stats.frauds_detected / stats.total_analyses) * 100)
    : 0;

  const detectionRate = stats.total_analyses > 0
    ? ((stats.frauds_detected / stats.total_analyses) * 100).toFixed(1)
    : 0;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
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
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
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
            trend="On-chain"
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                    {graphData.nodes.length} nodes · {graphData.links.length} edges
                  </span>
                </div>
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