/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Newsreader', 'Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        editorial: {
          bg: '#FBF9F5',
          paper: '#F7F4EE',
          card: '#FFFFFF',
          text: '#1A1917',
          muted: '#6E6B65',
          subtle: '#8C8880',
          border: '#E5E0D8',
          'border-dark': '#D3CFC6',
          maroon: '#6B1D1D',
          'maroon-hover': '#541616',
          'maroon-light': '#F5EEEE',
          tag: '#ECE7DF',
          dot: '#9E988E',
        },
        sift: {
          dark: '#0B0F17',
          surface: '#121824',
          card: '#192231',
          border: '#243044',
          accent: '#3B82F6',
          cyan: '#06B6D4',
          emerald: '#10B981',
          amber: '#F59E0B',
          rose: '#F43F5E'
        }
      }
    },
  },
  plugins: [],
}
