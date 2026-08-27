import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-body)", ...defaultTheme.fontFamily.sans],
        serif: ["var(--font-heading)", ...defaultTheme.fontFamily.serif],
      },
      colors: {
        // Neonová paleta pro dark-mode "kasino" vzhled — pink/cyan jako
        // hlavní akcenty, gold pro kredity ("G"), zbytek zůstává
        // standardní Tailwind gray na pozadí/textu.
        neon: {
          pink: "#ff2e9a",
          cyan: "#22e5ff",
          gold: "#ffcc33",
          purple: "#8b2fff",
        },
      },
      boxShadow: {
        "glow-pink": "0 0 20px rgba(255, 46, 154, 0.5)",
        "glow-cyan": "0 0 20px rgba(34, 229, 255, 0.4)",
        "glow-gold": "0 0 16px rgba(255, 204, 51, 0.45)",
      },
    },
  },
  plugins: [],
} satisfies Config;
