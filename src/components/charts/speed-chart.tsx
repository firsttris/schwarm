import "uplot/dist/uPlot.min.css";
import { useEffect, useRef } from "react";
import uPlot from "uplot";
import type { SpeedSample } from "@/api/queries";
import { formatSpeed } from "@/lib/format";
import { useTheme } from "@/lib/theme";
import { rgba, themeRgb } from "./colors";

/**
 * Download and upload speed over the last minutes, drawn with uPlot (docs/spec.md: charts
 * with uPlot and a small wrapper that reads the colours from the CSS variables).
 */
export function SpeedChart({
  samples,
  label,
  height = 110,
}: {
  samples: SpeedSample[];
  label: string;
  height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const plot = useRef<uPlot | null>(null);
  const { resolved } = useTheme();

  // Build once per theme; data updates go through setData
  // biome-ignore lint/correctness/useExhaustiveDependencies: the colours change with the theme
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const dl = themeRgb("--chart-1");
    const up = themeRgb("--chart-2");
    const grid = rgba(themeRgb("--border"), 1);
    const muted = rgba(themeRgb("--muted-foreground"), 1);
    const opts: uPlot.Options = {
      width: el.clientWidth || 440,
      height,
      legend: { show: false },
      cursor: { show: false },
      padding: [6, 0, 0, 0],
      scales: { x: { time: true }, y: { range: (_u, _min, max) => [0, Math.max(max * 1.15, 1024)] } },
      axes: [
        { show: false },
        {
          size: 64,
          stroke: muted,
          grid: { stroke: grid, dash: [3, 3], width: 1 },
          ticks: { show: false },
          splits: (_u, _ax, _min, max) => [max / 3, (max * 2) / 3],
          values: (_u, splits) => splits.map((v) => formatSpeed(v)),
          font: "11px Geist Variable, sans-serif",
        },
      ],
      series: [
        {},
        { stroke: rgba(dl), fill: rgba(dl, 0.22), width: 2, points: { show: false } },
        { stroke: rgba(up), fill: rgba(up, 0.22), width: 2, points: { show: false } },
      ],
    };
    plot.current = new uPlot(opts, [[], [], []], el);
    const resize = new ResizeObserver(() => plot.current?.setSize({ width: el.clientWidth, height }));
    resize.observe(el);
    return () => {
      resize.disconnect();
      plot.current?.destroy();
      plot.current = null;
    };
  }, [resolved, height]);

  useEffect(() => {
    if (!plot.current) return;
    const xs = samples.map((s) => s.t / 1000);
    plot.current.setData([xs, samples.map((s) => s.dl), samples.map((s) => s.up)]);
  });

  return <div ref={ref} role="img" aria-label={label} className="w-full" style={{ height }} />;
}
