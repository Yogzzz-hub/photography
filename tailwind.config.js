/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        vault: {
          void: '#040508',
          dark: '#080A10',
          card: '#10131C',
          surface: '#151924',
          border: 'rgba(255, 255, 255, 0.08)',
          borderHover: 'rgba(255, 255, 255, 0.20)',
          gold: '#E5C07B',
          goldMuted: '#C29B38',
          goldGlow: 'rgba(229, 192, 123, 0.35)',
          glow: '#8B5CF6',
          cyan: '#06B6D4',
          silver: '#94A3B8',
          textMuted: '#64748B',
          textSubtle: '#475569',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['Cormorant Garamond', 'Cinzel', 'Playfair Display', 'serif'],
        cinzel: ['Cinzel', 'serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
        glass: '16px',
        ultra: '24px',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        glow: '0 0 25px -5px rgba(124, 58, 237, 0.4)',
        cyanGlow: '0 0 25px -5px rgba(6, 182, 212, 0.4)',
      },
      animation: {
        'pulse-subtle': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        }
      }
    },
  },
  plugins: [],
}
