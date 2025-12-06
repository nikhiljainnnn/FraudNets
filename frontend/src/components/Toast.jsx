import React from 'react';
import { CheckCircle, AlertTriangle, X } from 'lucide-react';

const Toast = ({ message, type, onClose }) => {
    const config = {
        success: { icon: CheckCircle, color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' },
        error: { icon: AlertTriangle, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
        warning: { icon: AlertTriangle, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' }
    };

    const { icon: Icon, color, bg } = config[type] || config.success;

    return (
        <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 18px',
            background: 'var(--bg-secondary)',
            border: `1px solid ${color}`,
            borderRadius: '8px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            animation: 'slideIn 0.3s ease'
        }}>
            <div style={{ padding: '6px', background: bg, borderRadius: '6px' }}>
                <Icon size={18} style={{ color }} />
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>
                    {message}
                </div>
            </div>
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
                <X size={16} />
            </button>
        </div>
    );
};

export default Toast;
