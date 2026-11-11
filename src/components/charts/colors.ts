/**
 * Reads a theme colour (e.g. "--chart-1") as rgb, so canvas-based charts use the same
 * colours as the CSS in light and dark. The tokens are oklch(); painting one pixel and
 * reading it back converts them reliably in every browser.
 */
export function themeRgb(variable: string, element: Element = document.documentElement): [number, number, number] {
  const value = getComputedStyle(element).getPropertyValue(variable).trim() || "#888";
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [128, 128, 128];
  ctx.fillStyle = "#888";
  ctx.fillStyle = value;
  ctx.fillRect(0, 0, 1, 1);
  const [r = 128, g = 128, b = 128] = ctx.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

export const rgba = ([r, g, b]: [number, number, number], alpha = 1) => `rgba(${r}, ${g}, ${b}, ${alpha})`;
