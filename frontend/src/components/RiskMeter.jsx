import React from 'react';

const RiskMeter = ({ score }) => {
    const getColor = () => {
        if (score < 30) return { main: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' };
        if (score < 60) return { main: '#eab308', bg: 'rgba(234, 179, 8, 0.1)' };
        return { main: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
    };

    const getLabel = () => {
        if (score < 30) return 'Low Risk';
        if (score < 60) return 'Medium Risk';
        return 'High Risk';
    };

    const color = getColor();

    return (
        <div className="metric-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ position: 'relative', width: '64px', height: '64px' }}>
                <svg width="64" height="64" style={{ transform: 'rotate(-90deg)' }}>
                    <circle
                        cx="32"
                        cy="32"
                        r="26"
                        fill="none"
                        stroke="var(--border-primary)"
                        strokeWidth="6"
                    />
                    <circle
                        cx="32"
                        cy="32"
                        r="26"
                        fill="none"
                        stroke={color.main}
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 26}
                        strokeDashoffset={(2 * Math.PI * 26) - (score / 100) * (2 * Math.PI * 26)}
                        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                    />
                </svg>
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: color.main
                }}>
                    {score}%
                </div>
            </div>

            <div>
                <div style={{
                    fontSize: '11px',
                    color: 'var(--text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '4px'
                }}>
                    Risk Level
                </div>
                <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: color.main
                }}>
                    {getLabel()}
                </div>
            </div>
        </div>
    );
};

export default RiskMeter;
