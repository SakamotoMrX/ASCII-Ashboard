/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#0a0a0f",
        surface: "#12121a",
        "surface-elevated": "#1a1a26",
        primary: {
          DEFAULT: "#00ff88",
          foreground: "#0a0a0f",
        },
        accent: {
          DEFAULT: "#ff3366",
          foreground: "#f0f0f5",
        },
        muted: {
          DEFAULT: "#8b8b9e",
          foreground: "#f0f0f5",
        },
        border: "#262638",
        foreground: "#f0f0f5",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "IBM Plex Mono", "monospace"],
        grid: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      borderRadius: {
        card: "6px",
        btn: "4px",
        tag: "2px",
      },
      boxShadow: {
        glow: "0 0 12px rgba(0, 255, 136, 0.15)",
        subtle: "0 1px 2px rgba(0, 0, 0, 0.4)",
      },
    },
  },
  plugins: [],
};
