import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    // Nahrazuje (ne extend) celou výchozí škálu — "minimum radiusů" je
    // základní princip designu (viz app/styles/gembl-newspaper.css), takže
    // i kdyby někde zůstalo zapomenuté rounded-lg/2xl, vykreslí se jako
    // minimální 2px, ne jako měkký neonový roh. `full` zůstává skutečný
    // kruh — pro případ, kdy je opravdu potřeba (ikonové kolečko apod.).
    borderRadius: {
      none: "0px",
      sm: "var(--gembl-radius)",
      DEFAULT: "var(--gembl-radius)",
      md: "var(--gembl-radius)",
      lg: "var(--gembl-radius)",
      xl: "var(--gembl-radius)",
      "2xl": "var(--gembl-radius)",
      "3xl": "var(--gembl-radius)",
      full: "9999px",
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-body)", ...defaultTheme.fontFamily.sans],
        serif: ["var(--font-heading)", ...defaultTheme.fontFamily.serif],
      },
      colors: {
        // Novinový/plakátový design systém — viz app/styles/gembl-newspaper.css
        // pro definici proměnných a odůvodnění (krémové pozadí, černý
        // text, červená jen jako akcent, žádné neonové/gradientové barvy).
        gembl: {
          paper: "var(--gembl-paper)",
          "paper-dark": "var(--gembl-paper-dark)",
          ink: "var(--gembl-ink)",
          red: "var(--gembl-red)",
          muted: "var(--gembl-muted)",
          line: "var(--gembl-line)",
        },
      },
      boxShadow: {
        // Tvrdý "plakátový" stín — ostrý posun bez rozostření/glow,
        // náhrada za předchozí neonové shadow-glow-* efekty.
        hard: "var(--gembl-shadow-hard)",
        "hard-red": "var(--gembl-shadow-hard-red)",
        "hard-sm": "var(--gembl-shadow-hard-sm)",
      },
    },
  },
  plugins: [],
} satisfies Config;
