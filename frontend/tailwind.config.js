/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        carbon: {
          DEFAULT: "#1A1A1A",
          dark: "#0F0F0F",
          light: "#2A2A2A",
          muted: "#333333",
        },
        emerald: {
          tactical: "#059669",
          glow: "#10B981",
          dark: "#064E3B",
        },
        alert: {
          orange: "#EA580C",
          red: "#DC2626",
          glow: "#FB923C",
        },
        security: {
          blue: "#3B82F6",
          cyan: "#06B6D4",
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        tactical: ['JetBrains Mono', 'Outfit', 'monospace'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'tactical': '0 0 15px rgba(5, 150, 105, 0.15)',
        'tactical-glow': '0 0 25px rgba(5, 150, 105, 0.3)',
        'alert-glow': '0 0 25px rgba(234, 88, 12, 0.3)',
        'carbon-inset': 'inset 0 2px 4px rgba(0,0,0,0.5)',
      },
      animation: {
        'glitch': 'glitch 0.3s cubic-bezier(.25,.46,.45,.94) both infinite',
        'pulse-tactical': 'pulseTactical 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan 3s linear infinite',
        'data-injection': 'dataInjection 0.8s ease-out forwards',
      },
      keyframes: {
        glitch: {
          '0%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' },
          '100%': { transform: 'translate(0)' },
        },
        pulseTactical: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(1.05)' },
        },
        scan: {
          '0%': { top: '0%' },
          '100%': { top: '100%' },
        },
        dataInjection: {
          '0%': { transform: 'scaleY(0)', opacity: '0' },
          '50%': { transform: 'scaleY(1)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
