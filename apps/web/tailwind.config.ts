import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#0a0a0a",
          raised: "#0d0d0d",
          overlay: "#111111",
        },
        line: {
          subtle: "rgba(255,255,255,0.05)",
          muted: "rgba(255,255,255,0.1)",
        },
        content: {
          primary: "#e8e8e8",
          secondary: "#999999",
          muted: "#666666",
          dim: "#444444",
          faint: "#333333",
        },
        ember: {
          DEFAULT: "#f97316",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
          hover: "#fb923c",
          glow: "rgba(249,115,22,0.15)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-cinzel)", "Georgia", "serif"],
      },
      letterSpacing: {
        monument: "0.3em",
        headline: "0.15em",
        subtitle: "0.2em",
        label: "0.25em",
        nav: "0.1em",
      },
      fontSize: {
        hero: "clamp(80px, 12vw, 160px)",
        section: "clamp(32px, 5vw, 56px)",
        statement: "clamp(24px, 3vw, 36px)",
      },
    },
  },
  plugins: [],
};

export default config;
