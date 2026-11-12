import { defineConfig } from "vite";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// Gives the offline cache (public/sw.js) a new name on every build, so a deploy replaces what browsers have stored.
const stampServiceWorker = () => {
  let outDir = "dist";
  return {
    name: "stamp-service-worker",
    apply: "build",
    configResolved(config) { outDir = resolve(config.root, config.build.outDir); },
    closeBundle() {
      const file = resolve(outDir, "sw.js");
      if (existsSync(file)) writeFileSync(file, readFileSync(file, "utf8").replaceAll("__BUILD__", Date.now().toString(36)));
    }
  };
};

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
    plugins: [stampServiceWorker(), ...(phone ? [basicSsl()] : [])],
    server: phone ? { host: true, port: 5174, strictPort: true } : { port: 5173, strictPort: true },
    preview: { port: 4173 },
    build: { target: "es2022", chunkSizeWarningLimit: 900 }
  };
});
