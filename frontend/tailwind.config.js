/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
            },
            colors: {
                deep: '#0f172a',
                surface: 'rgba(30, 41, 59, 0.6)',
                elevated: 'rgba(51, 65, 85, 0.4)',
                accent: {
                    primary: '#6366f1',
                    success: '#10b981',
                    danger: '#f87171',
                    warning: '#fbbf24',
                    purple: '#a78bfa',
                }
            },
            borderRadius: {
                'xl': '12px',
            },
            boxShadow: {
                'glow': '0 0 40px rgba(99, 102, 241, 0.15)',
                'card': '0 4px 24px rgba(0, 0, 0, 0.3)',
            }
        },
    },
    plugins: [],
}
