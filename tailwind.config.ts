import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#070B14",
        panel: "#0C1220",
        panel2: "#101828",
        line: "#1E2A3D",
        mint: "#2DD4A7",
        sky2: "#38BDF8",
        amber2: "#FBBF24",
        rose2: "#FB7185",
      },
      fontFamily: {
        sans: ["ui-sans-system", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(45,212,167,.25), 0 12px 40px -12px rgba(45,212,167,.35)",
        card: "0 10px 30px -12px rgba(0,0,0,.6)",
      },
    },
  },
  plugins: [],
};
export default config;
