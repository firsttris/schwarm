import { readFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

/**
 * Renders the app icons for the web app manifest from the SVG sources in public/icons
 * (`bun run icons`). The PNGs are committed; run this again after changing an SVG.
 */
const sizes: [source: string, size: number, out: string][] = [
  ["icon.svg", 192, "icon-192.png"],
  ["icon.svg", 512, "icon-512.png"],
  ["maskable.svg", 512, "maskable-512.png"],
  // iOS rounds the corners itself
  ["maskable.svg", 180, "apple-touch-icon.png"],
];

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const [source, size, out] of sizes) {
  const svg = await readFile(`public/icons/${source}`, "utf8");
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
  );
  await page.screenshot({ path: `public/icons/${out}`, omitBackground: true });
  console.log(`public/icons/${out}`);
}
await browser.close();
