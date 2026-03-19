/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}", // Just in case you have a src folder
    "./styles/**/*.css",
  ],
  theme: {
    extend: {
      colors: {
        'lucra-dark': '#0b161b',
        'lucra-card': '#16242a',
        'lucra-green': '#00ff88',
        'lucra-text-dim': '#94a3b8',
      },
    },
  },
  plugins: [],
}
