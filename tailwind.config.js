/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'lucra-dark': '#0b161b',      // Dark background
        'lucra-card': '#16242a',      // Card background
        'lucra-green': '#00ff88',     // Neon green accent
        'lucra-text-dim': '#94a3b8',  // Muted text
      },
    },
  },
  plugins: [],
}
