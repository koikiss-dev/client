// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "localhost",   // o "0.0.0.0" si quieres acceder desde el cel
    port: 3000,
    open: false,
    // 👇 seguimos teniendo el proxy a tu backend
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
