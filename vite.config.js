import { defineConfig } from "vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

// base "./" keeps every asset path relative, so the built site works from any folder or sub-path.
//
// `npm run dev`        http://localhost:5173, for this computer only.
// `npm run dev:phone`  https on port 5174, reachable from phones on the same Wi-Fi. Phones only allow the
//                      camera on https pages, so this mode serves a self-signed certificate; the phone's
//                      browser shows a warning once, which you accept.
export default defineConfig(({ mode }) => {
  const phone = mode === "phone";
  return {
    base: "./",
    plugins: phone ? [basicSsl()] : [],
    server: phone ? { host: true, port: 5174, strictPort: true } : { port: 5173, strictPort: true },
    preview: { port: 4173 },
    build: { target: "es2022", chunkSizeWarningLimit: 900 }
  };
});
