import React from 'react';
import { GitBranch, Users, Brain, Layers } from 'lucide-react';

const FraudPatterns = ({ patterns }) => {
    const patternConfig = {
        CYCLE_DETECTED: {
            label: 'Cycle Detection',
            description: 'Circular money flow patterns',
            icon: GitBranch,
            color: '#ef4444'
        },
        SMURFING: {
            label: 'Smurfing',
            description: 'Structured small transactions',
            icon: Users,
            color: '#f59e0b'
        },
        GNN_FLAGGED: {
            label: 'AI Flagged',
            description: 'GNN model predictions',
            icon: Brain,
            color: '#8b5cf6'
        },
        STRUCTURING: {
            label: 'Structuring',
            description: 'Threshold avoidance',
            icon: Layers,
            color: '#3b82f6'
        }
    };

    const total = Object.values(patterns).reduce((a, b) => a + b, 0);

    return (
        <div className="card">
            <div className="card-header">
                <span className="card-title">Fraud Patterns</span>
                <span className="badge badge-neutral">{total} detected</span>
            </div>
            <div className="card-body" style={{ padding: '12px 16px' }}>
                <div className="space-y-3">
                    {Object.entries(patterns).map(([key, count]) => {
                        const config = patternConfig[key];
                        if (!config) return null;

                        const Icon = config.icon;
                        const percentage = total > 0 ? (count / total) * 100 : 0;

                        return (
                            <div key={key}>
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <Icon size={12} style={{ color: config.color }} />
                                        <span style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                                            {config.label}
                                        </span>
                                    </div>
                                    <span className="mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                        {count}
                                    </span>
                                </div>
                                <div style={{
                                    height: '4px',
                                    background: 'var(--bg-tertiary)',
                                    borderRadius: '2px',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        width: `${percentage}%`,
                                        height: '100%',
                                        background: config.color,
                                        borderRadius: '2px',
                                        transition: 'width 0.3s ease'
                                    }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default FraudPatterns;
