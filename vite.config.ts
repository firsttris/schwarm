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
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
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
    chunkSizeWarningLimit: 500,
    rolldownOptions: {
      output: {
        // Libraries change less often than the app: own files, so an update of Schwarm
        // keeps them in the browser cache (qBittorrent caches JS for 12 h, names are hashed)
        codeSplitting: {
          groups: [
            { name: "react", test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: "tanstack", test: /node_modules[\\/]@tanstack[\\/]/ },
            { name: "radix", test: /node_modules[\\/](@radix-ui|radix-ui|@floating-ui)[\\/]/ },
            // uPlot stays with the details, which load on demand
            { name: "vendor", test: /node_modules[\\/](?!uplot[\\/])/ },
          ],
        },
      },
    },
  },
  server: {
    proxy: { "/api": `http://localhost:${mockPort}` },
  },
});
