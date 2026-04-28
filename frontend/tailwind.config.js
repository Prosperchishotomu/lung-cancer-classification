/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'medical-primary': '#0ea5e9', // Cyan-blue primary
        'medical-secondary': '#6366f1', // Indigo secondary
        'medical-accent': '#22d3ee', // Bright cyan accent
        'medical-bg-dark': '#020617', // Deep navy background
        'medical-bg-card': 'rgba(15, 23, 42, 0.6)', // Glassmorphic card background
        'medical-text-primary': '#f8fafc', // Near white text
        'medical-text-secondary': '#94a3b8', // Muted slate text
        'medical-success': '#10b981',
        'medical-warning': '#f59e0b',
        'medical-error': '#ef4444',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'neon': '0 0 15px rgba(14, 165, 233, 0.4)',
      },
      backdropBlur: {
        'xs': '2px',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan 3s linear infinite',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-100%)', opacity: 0 },
          '50%': { opacity: 1 },
          '100%': { transform: 'translateY(100%)', opacity: 0 },
        }
      }
    },
  },
  plugins: [],
};
