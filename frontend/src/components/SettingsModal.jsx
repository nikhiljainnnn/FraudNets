import React, { useState } from 'react';
import { X, Sun, Moon, Bell, RefreshCw, Trash2, Download, Clock } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const SettingsModal = ({ isOpen, onClose, history, onClearHistory, onExportHistory }) => {
    const { theme, toggleTheme, settings, updateSettings } = useTheme();
    const [activeTab, setActiveTab] = useState('appearance');

    if (!isOpen) return null;

    const tabs = [
        { id: 'appearance', label: 'Appearance', icon: Sun },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'history', label: 'History', icon: Clock },
        { id: 'data', label: 'Data & Privacy', icon: Download }
    ];

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
        >
            <div
                className="settings-modal"
                onClick={e => e.stopPropagation()}
                style={{
                    width: '600px',
                    maxHeight: '80vh',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '12px',
                    overflow: 'hidden'
                }}
            >
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--border-primary)'
                }}>
                    <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>
                        Settings
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            color: 'var(--text-tertiary)'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div style={{ display: 'flex', minHeight: '400px' }}>
                    <div style={{
                        width: '180px',
                        borderRight: '1px solid var(--border-primary)',
                        padding: '12px'
                    }}>
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '10px 12px',
                                        borderRadius: '6px',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        fontWeight: '500',
                                        background: activeTab === tab.id ? 'var(--bg-tertiary)' : 'transparent',
                                        color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                                        marginBottom: '4px'
                                    }}
                                >
                                    <Icon size={16} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
                        {activeTab === 'appearance' && (
                            <div className="space-y-4">
                                <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>
                                    Appearance
                                </h3>

                                <div className="setting-row">
                                    <div>
                                        <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>
                                            Theme
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                                            Choose between light and dark mode
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => theme !== 'light' && toggleTheme()}
                                            className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                                        >
                                            <Sun size={16} />
                                            Light
                                        </button>
                                        <button
                                            onClick={() => theme !== 'dark' && toggleTheme()}
                                            className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                                        >
                                            <Moon size={16} />
                                            Dark
                                        </button>
                                    </div>
                                </div>

                                <div className="setting-row">
                                    <div>
                                        <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>
                                            Compact Mode
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                                            Reduce spacing for more content
                                        </div>
                                    </div>
                                    <label className="toggle">
                                        <input
                                            type="checkbox"
                                            checked={settings.compactMode}
                                            onChange={e => updateSettings('compactMode', e.target.checked)}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>

                                <div className="setting-row">
                                    <div>
                                        <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>
                                            Animations
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                                            Enable UI animations and transitions
                                        </div>
                                    </div>
                                    <label className="toggle">
                                        <input
                                            type="checkbox"
                                            checked={settings.showAnimations}
                                            onChange={e => updateSettings('showAnimations', e.target.checked)}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {activeTab === 'notifications' && (
                            <div className="space-y-4">
                                <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>
                                    Notifications
                                </h3>

                                <div className="setting-row">
                                    <div>
                                        <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>
                                            Push Notifications
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                                            Get notified about fraud alerts
                                        </div>
                                    </div>
                                    <label className="toggle">
                                        <input
                                            type="checkbox"
                                            checked={settings.notifications}
                                            onChange={e => updateSettings('notifications', e.target.checked)}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>

                                <div className="setting-row">
                                    <div>
                                        <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>
                                            Sound Alerts
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                                            Play sound when fraud is detected
                                        </div>
                                    </div>
                                    <label className="toggle">
                                        <input
                                            type="checkbox"
                                            checked={settings.soundAlerts}
                                            onChange={e => updateSettings('soundAlerts', e.target.checked)}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>

                                <div className="setting-row">
                                    <div>
                                        <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>
                                            Auto Refresh
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                                            Automatically refresh data
                                        </div>
                                    </div>
                                    <label className="toggle">
                                        <input
                                            type="checkbox"
                                            checked={settings.autoRefresh}
                                            onChange={e => updateSettings('autoRefresh', e.target.checked)}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>

                                {settings.autoRefresh && (
                                    <div className="setting-row">
                                        <div>
                                            <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>
                                                Refresh Interval
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                                                How often to refresh data
                                            </div>
                                        </div>
                                        <select
                                            value={settings.refreshInterval}
                                            onChange={e => updateSettings('refreshInterval', parseInt(e.target.value))}
                                            className="settings-select"
                                        >
                                            <option value={3}>3 seconds</option>
                                            <option value={5}>5 seconds</option>
                                            <option value={10}>10 seconds</option>
                                            <option value={30}>30 seconds</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'history' && (
                            <div className="space-y-4">
                                <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>
                                    Transaction History
                                </h3>

                                <div style={{
                                    background: 'var(--bg-tertiary)',
                                    borderRadius: '8px',
                                    padding: '16px',
                                    marginBottom: '16px'
                                }}>
                                    <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                        {history?.length || 0}
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                        Transactions recorded this session
                                    </div>
                                </div>

                                <div style={{
                                    maxHeight: '200px',
                                    overflowY: 'auto',
                                    border: '1px solid var(--border-primary)',
                                    borderRadius: '8px'
                                }}>
                                    {history && history.length > 0 ? (
                                        history.slice(0, 20).map((tx, i) => (
                                            <div
                                                key={i}
                                                style={{
                                                    padding: '10px 12px',
                                                    borderBottom: '1px solid var(--border-primary)',
                                                    fontSize: '12px'
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: 'var(--text-primary)' }}>
                                                        {tx.sender} → {tx.receiver}
                                                    </span>
                                                    <span style={{ color: tx.is_fraud ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                                                        {tx.is_fraud ? 'Fraud' : 'Safe'}
                                                    </span>
                                                </div>
                                                <div style={{ color: 'var(--text-tertiary)', marginTop: '2px' }}>
                                                    ${tx.amount?.toLocaleString()}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                                            No history yet
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                                    <button onClick={onExportHistory} className="btn btn-secondary" style={{ flex: 1 }}>
                                        <Download size={14} />
                                        Export CSV
                                    </button>
                                    <button onClick={onClearHistory} className="btn btn-danger" style={{ flex: 1 }}>
                                        <Trash2 size={14} />
                                        Clear History
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'data' && (
                            <div className="space-y-4">
                                <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>
                                    Data & Privacy
                                </h3>

                                <div style={{
                                    background: 'var(--bg-tertiary)',
                                    borderRadius: '8px',
                                    padding: '16px',
                                    marginBottom: '16px'
                                }}>
                                    <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '8px' }}>
                                        Local Storage
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                        Your settings and preferences are stored locally in your browser. No data is sent to external servers.
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        localStorage.clear();
                                        window.location.reload();
                                    }}
                                    className="btn btn-danger"
                                    style={{ width: '100%' }}
                                >
                                    <Trash2 size={14} />
                                    Clear All Data & Reset
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
