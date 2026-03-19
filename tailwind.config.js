/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'lucra-dark': '#0b161b',      // Background
        'lucra-card': '#16242a',      // Section background
        'lucra-green': '#00ff88',     // Neon accents
        'lucra-text-dim': '#94a3b8',  // Muted text
        'lucra-border': '#1e293b',    // Subtle borders
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
