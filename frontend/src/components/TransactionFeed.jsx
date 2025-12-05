import React from 'react';
import { ArrowRight } from 'lucide-react';

const TransactionFeed = ({ transactions }) => {
    if (transactions.length === 0) {
        return (
            <div style={{
                padding: '24px',
                textAlign: 'center',
                color: 'var(--text-tertiary)',
                fontSize: '12px'
            }}>
                No transactions yet. Click "Run Simulation" to generate data.
            </div>
        );
    }

    return (
        <div style={{ height: '100%', overflowY: 'auto' }}>
            {transactions.map((tx, index) => (
                <div
                    key={`${tx.tx_id}-${index}`}
                    style={{
                        padding: '10px 12px',
                        borderBottom: '1px solid var(--border-primary)',
                        fontSize: '12px'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                            <span style={{ fontWeight: '500' }}>{tx.sender}</span>
                            <ArrowRight size={12} style={{ color: 'var(--text-tertiary)' }} />
                            <span style={{ fontWeight: '500' }}>{tx.receiver}</span>
                        </div>
                        <span className={tx.is_fraud ? 'badge badge-danger' : 'badge badge-success'}>
                            {tx.is_fraud ? 'Fraud' : 'Clear'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-tertiary)' }}>
                        <span className="mono">${tx.amount?.toLocaleString()}</span>
                        {tx.fraud_type && <span>{tx.fraud_type}</span>}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default TransactionFeed;
