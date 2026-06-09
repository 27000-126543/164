/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        navy: {
          950: "#0A1628",
          900: "#0D1B2A",
          800: "#1B2838",
          700: "#243447",
          600: "#2D4056",
        },
        cyber: {
          400: "#00FFD1",
          500: "#00D4AA",
          600: "#00B892",
          700: "#009B7D",
        },
        amber: {
          500: "#FF8C00",
          600: "#E07800",
        },
        coral: {
          400: "#FF6B7A",
          500: "#FF4757",
          600: "#E03E4D",
        },
        warn: {
          red: "#FF4757",
          orange: "#FF8C00",
          yellow: "#FFC312",
          blue: "#3498DB",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
        sans: ["Noto Sans SC", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "slide-up": "slideUp 0.3s ease-out",
        "fade-in": "fadeIn 0.5s ease-out",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 5px rgba(0,212,170,0.3)" },
          "50%": { boxShadow: "0 0 20px rgba(0,212,170,0.6)" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: 0 },
          "100%": { transform: "translateY(0)", opacity: 1 },
        },
        fadeIn: {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
      },
    },
  },
  plugins: [],
};
