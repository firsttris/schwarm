import { useEffect, useRef } from "react";
import { useTheme } from "@/lib/theme";
import { rgba, themeRgb } from "./colors";

/**
 * The pieces of a torrent (torrents/pieceStates: 0 missing, 1 downloading, 2 done) as one
 * bar; with more pieces than pixels each pixel shows its share of done pieces.
 */
export function PiecesBar({ states, label }: { states: number[]; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { resolved } = useTheme();

  // biome-ignore lint/correctness/useExhaustiveDependencies: the colours change with the theme
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const draw = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      const ctx = canvas.getContext("2d");
      if (!ctx || !width) return;
      ctx.scale(ratio, ratio);
      const primary = themeRgb("--primary");
      const chart = themeRgb("--chart-1");
      ctx.fillStyle = rgba(primary, 0.15);
      ctx.fillRect(0, 0, width, height);
      const n = states.length;
      if (!n) return;
      const cols = Math.min(n, Math.floor(width));
      const per = n / cols;
      const w = width / cols;
      for (let c = 0; c < cols; c++) {
        let done = 0;
        let busy = 0;
        const from = Math.floor(c * per);
        const to = Math.max(from + 1, Math.floor((c + 1) * per));
        for (let i = from; i < to; i++) {
          if (states[i] === 2) done++;
          else if (states[i] === 1) busy++;
        }
        const total = to - from;
        if (busy) {
          ctx.fillStyle = rgba(chart, 1);
          ctx.fillRect(c * w, 0, w + 0.5, height);
        } else if (done) {
          ctx.fillStyle = rgba(primary, done / total);
          ctx.fillRect(c * w, 0, w + 0.5, height);
        }
      }
    };
    draw();
    const resize = new ResizeObserver(draw);
    resize.observe(canvas);
    return () => resize.disconnect();
  }, [states, resolved]);

  return <canvas ref={ref} role="img" aria-label={label} className="h-2 w-full rounded-full" />;
}
