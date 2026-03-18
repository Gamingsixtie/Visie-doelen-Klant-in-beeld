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
        "shimmer": "shimmer 2s linear infinite",
        "float": "float 6s ease-in-out infinite",
        "sparkle": "sparkle 1.5s ease-in-out infinite",
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
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-20px) rotate(5deg)" },
        },
        "sparkle": {
          "0%, 100%": { opacity: "0", transform: "scale(0)" },
          "50%": { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
