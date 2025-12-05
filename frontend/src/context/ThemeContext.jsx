import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => {
        const saved = localStorage.getItem('fraudnets-theme');
        return saved || 'dark';
    });

    const [settings, setSettings] = useState(() => {
        const saved = localStorage.getItem('fraudnets-settings');
        return saved ? JSON.parse(saved) : {
            notifications: true,
            soundAlerts: false,
            autoRefresh: true,
            refreshInterval: 5,
            compactMode: false,
            showAnimations: true
        };
    });

    useEffect(() => {
        localStorage.setItem('fraudnets-theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    useEffect(() => {
        localStorage.setItem('fraudnets-settings', JSON.stringify(settings));
    }, [settings]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    const updateSettings = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, settings, updateSettings }}>
            {children}
        </ThemeContext.Provider>
    );
};

export default ThemeContext;
