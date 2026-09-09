import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        arena: {
          navy: "#0a192f",
          dark: "#030b17",
          primary: "#023e8a",
          accent: "#c59b27",
          gold: "#e5a823",
          surface: "#ffffff",
          muted: "#f1f5f9",
          border: "#e2e8f0"
        }
      },
      fontFamily: {
        sans: ["var(--font-prompt)", "Prompt", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        prompt: ["var(--font-prompt)", "Prompt", "sans-serif"],
      }
    },
  },
  plugins: [],
};
export default config;
