/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
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
