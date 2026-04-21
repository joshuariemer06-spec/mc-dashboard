/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      borderRadius: {
        '2xl': '1.25rem'
      },
      keyframes: {
        glow: {
          '0%, 100%': { boxShadow: '0 0 12px rgba(0,255,255,.22), 0 0 36px rgba(167,139,250,.16)' },
          '50%': { boxShadow: '0 0 18px rgba(0,255,255,.35), 0 0 52px rgba(167,139,250,.22)' }
        }
      },
      animation: {
        glow: 'glow 2.5s ease-in-out infinite'
      }
    },
  },
  plugins: [],
}
