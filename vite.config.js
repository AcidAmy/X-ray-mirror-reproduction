import { defineConfig } from "vite";

// base "./" keeps every asset path relative, so the built site works from any folder or sub-path.
export default defineConfig({
  base: "./",
  server: { port: 5173, strictPort: true },
  preview: { port: 4173 },
  build: { target: "es2022", chunkSizeWarningLimit: 900 }
});
