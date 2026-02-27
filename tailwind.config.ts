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
        // Cito kleuren
        "cito-blue": "#003366",
        "cito-light-blue": "#E6F0FA",
        "cito-green": "#2E7D32",
        "cito-light-green": "#E8F5E9",
        "cito-orange": "#E65100",
        "cito-light-orange": "#FFF3E0",
        "cito-purple": "#7B1FA2",
        "cito-light-purple": "#F3E5F5",
        // Status kleuren
        "consensus-high": "#C8E6C9",
        "consensus-medium": "#FFCC80",
        "consensus-low": "#EF9A9A",
        // Gold voor celebration
        "gold": "#FFD700",
      },
      fontFamily: {
        cinzel: ["Cinzel", "serif"],
      },
      animation: {
        "title-glow": "title-glow 2s ease-in-out infinite",
        "slide-in": "slide-in 0.5s ease-out",
        "roll-up": "roll-up 4s linear",
        "pulse-slow": "pulse 3s ease-in-out infinite",
      },
      keyframes: {
        "title-glow": {
          "0%, 100%": { textShadow: "0 0 20px rgba(255, 215, 0, 0.8)" },
          "50%": { textShadow: "0 0 40px rgba(255, 215, 0, 1)" },
        },
        "slide-in": {
          "0%": { transform: "translateX(-100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "roll-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(-100%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
