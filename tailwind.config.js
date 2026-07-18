/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
        },
        "brand-violet": "#8b5cf6",
        "func-success": "#10b981",
        "func-warn": "#f59e0b",
        "func-info": "#3b82f6",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
      },
      boxShadow: {
        soft: "0 4px 24px rgba(0, 0, 0, 0.05)",
        card: "0 8px 32px rgba(0, 0, 0, 0.06)",
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', "system-ui", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ['"JetBrains Mono"', '"Fira Code"', "monospace"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};
