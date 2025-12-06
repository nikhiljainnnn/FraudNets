import React, { useState } from 'react';
import { Shield, User, Lock, ArrowRight } from 'lucide-react';

const LoginPage = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!username.trim() || !password.trim()) {
            setError('Please enter both username and password');
            return;
        }

        setIsLoading(true);

        setTimeout(() => {
            const sessionId = `session_${username}_${Date.now()}`;
            const user = {
                username: username,
                sessionId: sessionId,
                loginTime: new Date().toISOString()
            };

            localStorage.setItem('fraudnets_user', JSON.stringify(user));
            onLogin(user);
            setIsLoading(false);
        }, 800);
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '400px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                borderRadius: '12px',
                padding: '40px',
                textAlign: 'center'
            }}>
                <div style={{
                    display: 'inline-flex',
                    padding: '12px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                    borderRadius: '12px',
                    marginBottom: '24px'
                }}>
                    <Shield size={32} style={{ color: 'white' }} />
                </div>

                <h1 style={{
                    fontSize: '24px',
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    marginBottom: '8px'
                }}>
                    FraudNets
                </h1>

                <p style={{
                    fontSize: '14px',
                    color: 'var(--text-tertiary)',
                    marginBottom: '32px'
                }}>
                    AI-Powered Fraud Detection System
                </p>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: 'var(--bg-tertiary)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: '8px',
                            padding: '0 12px'
                        }}>
                            <User size={18} style={{ color: 'var(--text-tertiary)' }} />
                            <input
                                type="text"
                                placeholder="Username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                style={{
                                    flex: 1,
                                    background: 'transparent',
                                    border: 'none',
                                    padding: '12px',
                                    fontSize: '14px',
                                    color: 'var(--text-primary)',
                                    outline: 'none'
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: 'var(--bg-tertiary)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: '8px',
                            padding: '0 12px'
                        }}>
                            <Lock size={18} style={{ color: 'var(--text-tertiary)' }} />
                            <input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={{
                                    flex: 1,
                                    background: 'transparent',
                                    border: 'none',
                                    padding: '12px',
                                    fontSize: '14px',
                                    color: 'var(--text-primary)',
                                    outline: 'none'
                                }}
                            />
                        </div>
                    </div>

                    {error && (
                        <div style={{
                            padding: '10px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '6px',
                            color: 'var(--accent-red)',
                            fontSize: '13px',
                            marginBottom: '16px'
                        }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            opacity: isLoading ? 0.7 : 1
                        }}
                    >
                        {isLoading ? 'Signing in...' : 'Sign In'}
                        {!isLoading && <ArrowRight size={16} />}
                    </button>
                </form>

                <p style={{
                    marginTop: '24px',
                    fontSize: '12px',
                    color: 'var(--text-tertiary)'
                }}>
                    Demo: Use any username/password to login
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
