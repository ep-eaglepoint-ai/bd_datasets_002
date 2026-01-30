import type { Config } from 'tailwindcss'

export default {
  content: [
    './app.vue',
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './composables/**/*.{js,ts}',
    './plugins/**/*.{js,ts}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f9ff',
          100: '#e8f0ff',
          200: '#cfdfff',
          300: '#a6c4ff',
          400: '#74a3ff',
          500: '#4a7dff',
          600: '#2f5cf1',
          700: '#2448c6',
          800: '#213d9a',
          900: '#1f356f'
        }
      },
      boxShadow: {
        soft: '0 10px 30px rgba(17, 24, 39, 0.08)'
      }
    }
  },
  plugins: []
} satisfies Config
