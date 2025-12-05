import React from 'react';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

const AlertsPanel = ({ alerts }) => {
    const getSeverityConfig = (severity) => {
        switch (severity) {
            case 'high':
                return { icon: AlertCircle, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
            case 'medium':
                return { icon: AlertTriangle, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
            default:
                return { icon: Info, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' };
        }
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    return (
        <div className="card">
            <div className="card-header">
                <span className="card-title">Recent Alerts</span>
                {alerts.length > 0 && (
                    <span className="badge badge-danger">{alerts.length} new</span>
                )}
            </div>
            <div className="card-body" style={{ padding: '0', maxHeight: '200px', overflowY: 'auto' }}>
                {alerts.length === 0 ? (
                    <div style={{
                        padding: '24px',
                        textAlign: 'center',
                        color: 'var(--text-tertiary)',
                        fontSize: '12px'
                    }}>
                        No alerts yet
                    </div>
                ) : (
                    <div>
                        {alerts.map((alert) => {
                            const config = getSeverityConfig(alert.severity);
                            const Icon = config.icon;

                            return (
                                <div
                                    key={alert.id}
                                    style={{
                                        padding: '10px 16px',
                                        borderBottom: '1px solid var(--border-primary)',
                                        display: 'flex',
                                        gap: '10px',
                                        alignItems: 'flex-start'
                                    }}
                                >
                                    <div style={{
                                        padding: '4px',
                                        background: config.bg,
                                        borderRadius: '4px',
                                        marginTop: '2px'
                                    }}>
                                        <Icon size={12} style={{ color: config.color }} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontSize: '12px',
                                            color: 'var(--text-primary)',
                                            marginBottom: '2px'
                                        }}>
                                            {alert.message}
                                        </div>
                                        <div style={{
                                            fontSize: '10px',
                                            color: 'var(--text-tertiary)'
                                        }}>
                                            {formatTime(alert.timestamp)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AlertsPanel;
