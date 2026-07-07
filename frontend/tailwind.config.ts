import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#FFF7ED",
          100: "#FFEDD5",
          200: "#FED7AA",
          300: "#FDBA74",
          400: "#FB923C",
          500: "#C2410C", // Indore Rust
          600: "#EA580C",
          700: "#9A3412",
          DEFAULT: "#C2410C",
          dark: "#9A3412",
          light: "#FFF7ED",
        },
        ink: {
          DEFAULT: "#0F172A",
          soft: "#334155",
          muted: "#64748B",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "Inter",
          "system-ui",
          "Segoe UI",
          "Nirmala UI",
          "Noto Sans Devanagari",
          "Roboto",
          "sans-serif",
        ],
        heading: [
          "var(--font-heading)",
          "DM Serif Display",
          "serif",
        ],
      },
      boxShadow: {
        card: "none",
        lift: "none",
        glow: "none",
        ring: "none",
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(135deg, #9A3412 0%, #C2410C 55%, #7C2D12 100%)",
        "ink-gradient": "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)",
        "sand-gradient": "linear-gradient(135deg, #FCFBF9 0%, #F5F4F0 100%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.97)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "bar-grow": {
          "0%": { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(1)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s cubic-bezier(0.2,0.8,0.2,1) both",
        "pop-in": "pop-in 0.25s cubic-bezier(0.2,0.8,0.2,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
