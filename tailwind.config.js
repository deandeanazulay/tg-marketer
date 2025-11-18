/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter', 
          '-apple-system', 
          'BlinkMacSystemFont', 
          'Segoe UI', 
          'Roboto', 
          'Helvetica Neue', 
          'Arial', 
          'sans-serif'
        ],
      },
      colors: {
        // Telegram-inspired color palette
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        telegram: {
          blue: '#0088cc',
          'light-blue': '#54a9eb',
          navy: '#2c5aa0',
          gray: '#f4f4f5',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'bounce-subtle': 'bounce 2s infinite',
      },
      boxShadow: {
        'telegram': '0 2px 10px rgba(0, 0, 0, 0.1)',
        'telegram-hover': '0 4px 20px rgba(0, 0, 0, 0.15)',
      },
      borderRadius: {
        'telegram': '12px',
      },
    },
  },
  plugins: [],
};