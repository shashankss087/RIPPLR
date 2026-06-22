import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ripplr: {
          50: "#eef9f3",
          100: "#d6f0e2",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          900: "#064e3b",
        },
        ink: {
          900: "#0b1220",
          800: "#111a2b",
          700: "#1c2740",
          600: "#2a3654",
        },
      },
    },
  },
  plugins: [],
};

export default config;
