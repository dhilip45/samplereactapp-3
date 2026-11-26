import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    watch: { usePolling: true },
    // only used by `npm run dev` (outside Docker): forward /api to a local backend
    proxy: { "/api": "http://localhost:5000" },
  },
});
