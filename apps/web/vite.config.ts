import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "../../shared")
    }
  },
  build: {
    target: "es2019",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }

          if (id.includes("mapbox-gl") || id.includes("react-map-gl")) {
            return "mapbox";
          }

          if (id.includes("react-router")) {
            return "router";
          }

          if (id.includes("@tanstack/react-query")) {
            return "query";
          }

          if (id.includes("socket.io-client")) {
            return "socket";
          }

          if (id.includes("lucide-react")) {
            return "icons";
          }

          if (id.includes("react") || id.includes("scheduler")) {
            return "react-vendor";
          }
        }
      }
    }
  },
  server: {
    port: 5173
  }
});
