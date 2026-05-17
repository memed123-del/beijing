import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const port = Number(process.env.PORT) || 5173;
const basePath = process.env.BASE_PATH || "/";

export default defineConfig({
  base: basePath,

  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
  ],

  resolve: {
    alias: {
      "@": path.resolve(path.dirname(new URL(import.meta.url).pathname), "src"),
      "@assets": path.resolve(
        path.dirname(new URL(import.meta.url).pathname),
        "..",
        "..",
        "attached_assets"
      ),
    },
    dedupe: ["react", "react-dom"],
  },

  root: path.resolve(path.dirname(new URL(import.meta.url).pathname)),

  build: {
    outDir: path.resolve(
      path.dirname(new URL(import.meta.url).pathname),
      "dist/public"
    ),
    emptyOutDir: true,
  },

  server: {
    port,
    strictPort: false,
    host: "0.0.0.0",
  },

  preview: {
    port,
    host: "0.0.0.0",
  },
});
