import React from 'react';

const StatsCard = ({ label, value, icon: Icon, variant, trend }) => {
    return (
        <div className="metric-card">
            <div className="flex items-center justify-between mb-2">
                <span className="metric-label">{label}</span>
                <Icon
                    size={14}
                    style={{
                        color: variant === 'danger' ? 'var(--accent-red)' : 'var(--text-tertiary)'
                    }}
                />
            </div>
            <div
                className="metric-value mono"
                style={{
                    fontSize: '24px',
                    color: variant === 'danger' && value > 0 ? 'var(--accent-red)' : 'var(--text-primary)'
                }}
            >
                {value.toLocaleString()}
            </div>
            {trend && (
                <div style={{
                    fontSize: '11px',
                    color: 'var(--text-tertiary)',
                    marginTop: '6px'
                }}>
                    {trend}
                </div>
            )}
        </div>
    );
};

export default StatsCard;
