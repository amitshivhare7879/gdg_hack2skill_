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
        // Civic-tech saffron accent — primary actions + brand.
        brand: {
          50: "#FDF4EC",
          100: "#FAE5D2",
          200: "#F3C79E",
          300: "#ECA76A",
          400: "#E68C43",
          500: "#E07A2F",
          600: "#C4661E",
          700: "#A0521A",
          DEFAULT: "#E07A2F",
          dark: "#B85C1B",
          light: "#FCEBD9",
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
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,0.04), 0 4px 12px -4px rgba(15,23,42,0.08)",
        lift: "0 16px 40px -16px rgba(15,23,42,0.28)",
        glow: "0 10px 30px -10px rgba(224,122,47,0.55)",
        ring: "0 0 0 1px rgba(15,23,42,0.05)",
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(135deg, #F59E0B 0%, #E07A2F 55%, #D2601C 100%)",
        "ink-gradient": "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
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
