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
  server: {
    port: 5173,
    proxy: {
      "/auth": "http://localhost:4000",
      "/me": "http://localhost:4000",
      "/rides": "http://localhost:4000",
      "/driver": "http://localhost:4000",
      "/admin": "http://localhost:4000",
      "/quotes": "http://localhost:4000",
      "/public": "http://localhost:4000"
    }
  }
});
