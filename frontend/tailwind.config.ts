import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "authority-indigo": "#4f46e5",
        "safety-emerald": "#10b981",
        "mission-amber": "#f59e0b",
        "guardian-black": "#0f172a",
        "primary": "#3525cd",
        "primary-container": "#4f46e5",
        "on-primary-container": "#dad7ff",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#eff4ff",
        "surface-container": "#e5eeff",
        "surface-container-high": "#dce9ff",
        "surface-container-highest": "#d3e4fe",
        "on-surface-variant": "#464555",
        "outline-variant": "#c7c4d8",
      },
      fontFamily: {
        heading: ["Geist", "Inter", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
