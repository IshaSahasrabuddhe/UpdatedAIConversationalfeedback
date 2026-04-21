/** @type {import("tailwindcss").Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        mist: "#e2e8f0",
        accent: "#f97316",
        accentSoft: "#fdba74",
      },
      boxShadow: {
        panel: "0 24px 80px rgba(15, 23, 42, 0.35)",
      },
      fontFamily: {
        sans: ["'Space Grotesk'", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        grid: "radial-gradient(circle at top, rgba(249, 115, 22, 0.16), transparent 35%), linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "100% 100%, 32px 32px, 32px 32px",
      },
    },
  },
  plugins: [],
};
