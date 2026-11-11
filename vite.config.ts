import { fileURLToPath, URL } from "node:url";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const mockPort = Number(process.env.MOCK_PORT ?? 8899);

export default defineConfig({
  // qBittorrent serves the folder under any path and has no SPA fallback
  // (src/webui/webapplication.cpp): relative asset paths, hash routing.
  base: "./",
  plugins: [
    paraglideVitePlugin({
      project: "./project.inlang",
      outdir: "./src/paraglide",
      strategy: ["localStorage", "preferredLanguage", "baseLocale"],
    }),
    tanstackRouter({ target: "react", autoCodeSplitting: false }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  build: {
    // The release ZIP contains schwarm/public/…, which qBittorrent serves.
    outDir: "dist/public",
    emptyOutDir: true,
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 900,
  },
  server: {
    proxy: { "/api": `http://localhost:${mockPort}` },
  },
});
