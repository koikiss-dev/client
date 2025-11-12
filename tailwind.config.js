/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class', // importante para alternar entre oscuro y claro con una clase en <html>

  theme: {
    extend: {
      colors: {
        // 🎨 Paleta modo claro
        light: {
          bg: '#f8fafc',        // fondo general
          card: '#ffffff',      // paneles
          text: '#1e293b',      // texto principal
          secondary: '#475569', // texto secundario
          border: '#e2e8f0',    // bordes suaves
        },
        // 🌑 Paleta modo oscuro
        dark: {
          bg: '#0f172a',
          card: '#1e293b',
          text: '#f8fafc',
          border: '#334155',
        },
        // 💡 Colores neón para botones y acentos
        neon: {
          blue: '#00ffff',
          green: '#00ff99',
          purple: '#a855f7',
          pink: '#ec4899',
        },
      },
      boxShadow: {
        card: '0 4px 16px rgba(0,0,0,0.08)',
        cardDark: '0 4px 16px rgba(0,0,0,0.25)',
      },
    },
  },
  plugins: [],
};
