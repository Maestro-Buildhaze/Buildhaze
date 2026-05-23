/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          green: '#16a34a',
          'green-light': '#22c55e',
          'green-dark': '#15803d',
          yellow: '#eab308',
          'yellow-light': '#facc15',
          'yellow-dark': '#ca8a04',
          black: '#0a0a0a',
          'black-soft': '#111827',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      animation: {
        'fade-in': 'fadeIn 0.35s ease-out both',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16,1,0.3,1) both',
        'slide-right': 'slideRight 0.35s cubic-bezier(0.16,1,0.3,1) both',
        'scale-in': 'scaleIn 0.25s cubic-bezier(0.16,1,0.3,1) both',
        'blob': 'blob 12s ease-in-out infinite',
        'blob2': 'blob 16s ease-in-out infinite reverse',
        'blob3': 'blob 20s ease-in-out infinite 4s',
        'shimmer': 'shimmer 2s infinite',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideRight: { from: { opacity: '0', transform: 'translateX(-16px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        scaleIn: { from: { opacity: '0', transform: 'scale(0.92)' }, to: { opacity: '1', transform: 'scale(1)' } },
        blob: {
          '0%,100%': { borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%', transform: 'translate(0,0) scale(1)' },
          '33%': { borderRadius: '30% 60% 70% 40% / 50% 60% 30% 60%', transform: 'translate(20px,-15px) scale(1.05)' },
          '66%': { borderRadius: '50% 60% 30% 60% / 30% 40% 70% 50%', transform: 'translate(-15px,10px) scale(0.97)' },
        },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        pulseSoft: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.6' } },
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)',
        'card-dark': '0 1px 3px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.2)',
        'card-hover-dark': '0 4px 24px rgba(0,0,0,0.4)',
        'glow-green': '0 0 24px rgba(22,163,74,0.25)',
        'glow-yellow': '0 0 24px rgba(234,179,8,0.30)',
        'btn': '0 1px 2px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.12)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};
