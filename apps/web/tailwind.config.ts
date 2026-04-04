import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          ink: "#e5ecf6",
          sand: "#111827",
          copper: "#2f81f7",
          moss: "#2fbc7d",
          mist: "#1e293b"
        },
        ops: {
          bg: "#05070b",
          surface: "#0a0d12",
          panel: "#11151d",
          rail: "#090c11",
          border: "#262b35",
          "border-soft": "#1a1f28",
          text: "#f2f5fb",
          muted: "#9aa3b2",
          primary: "#5a7cff",
          destructive: "#ff5f62",
          success: "#40d09a",
          warning: "#f5b244",
          error: "#ff5f62"
        }
      },
      boxShadow: {
        soft: "0 18px 50px -36px rgba(0, 0, 0, 0.85)",
        panel: "0 24px 80px -48px rgba(0, 0, 0, 0.95)",
        elevated: "0 32px 120px -64px rgba(0, 0, 0, 1)",
        glow: "0 0 0 1px rgba(90,124,255,0.24), 0 18px 50px -34px rgba(90,124,255,0.55)"
      },
      borderRadius: {
        "4xl": "1.5rem",
        "5xl": "2rem"
      },
      fontFamily: {
        sans: ["'Sora'", "'Inter'", "ui-sans-serif", "system-ui"]
      }
    }
  },
  plugins: []
} satisfies Config;
