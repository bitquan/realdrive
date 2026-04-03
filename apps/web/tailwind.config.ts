import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          ink: "#121110",
          sand: "#f4efe5",
          copper: "#b8613b",
          moss: "#6b7c55",
          mist: "#eef1ed"
        }
      },
      boxShadow: {
        soft: "0 20px 45px -30px rgba(18, 17, 16, 0.35)"
      },
      borderRadius: {
        "4xl": "2rem"
      },
      fontFamily: {
        sans: ["'Sora'", "ui-sans-serif", "system-ui"]
      }
    }
  },
  plugins: []
} satisfies Config;
