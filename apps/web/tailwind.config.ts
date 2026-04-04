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
          bg: "#080b12",
          surface: "#0f1623",
          panel: "#151f31",
          border: "#243247",
          "border-soft": "#1b2638",
          text: "#e5ecf6",
          muted: "#90a0b8",
          primary: "#2f81f7",
          destructive: "#e55263",
          success: "#2fbc7d",
          warning: "#d4a64e",
          error: "#e55263"
        }
      },
      boxShadow: {
        soft: "0 24px 56px -34px rgba(4, 10, 18, 0.9)",
        panel: "0 18px 44px -28px rgba(5, 11, 20, 0.95)",
        elevated: "0 26px 70px -40px rgba(0, 0, 0, 0.95)",
        glow: "0 0 0 1px rgba(47,129,247,0.20), 0 10px 38px -26px rgba(47,129,247,0.65)"
      },
      borderRadius: {
        "4xl": "1.5rem"
      },
      fontFamily: {
        sans: ["'Sora'", "'Inter'", "ui-sans-serif", "system-ui"]
      }
    }
  },
  plugins: []
} satisfies Config;
