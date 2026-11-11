import { describe, expect, it } from "vitest";
import {
  formatBytes,
  formatDate,
  formatDuration,
  formatEta,
  formatPercent,
  formatRatio,
  formatSpeed,
  MAX_ETA,
  percentValue,
  trackerHost,
} from "./format";

describe("format", () => {
  it("sizes and speeds with three significant digits", () => {
    expect(formatBytes(6.1e9, "de")).toBe("6,1 GB");
    expect(formatBytes(4.453e9, "de")).toBe("4,45 GB");
    expect(formatBytes(820e3, "de")).toBe("820 KB");
    expect(formatBytes(0, "de")).toBe("0 B");
    expect(formatSpeed(18.4e6, "en")).toBe("18.4 MB/s");
  });

  it("percent never reaches 100 before the end", () => {
    expect(percentValue(0.58)).toBe(58);
    expect(percentValue(0.9999)).toBe(99);
    expect(percentValue(1)).toBe(100);
    expect(formatPercent(0.73, "de")).toBe("73 %");
  });

  it("ratio and infinity", () => {
    expect(formatRatio(2.41, "de")).toBe("2,41");
    expect(formatRatio(-1, "de")).toBe("∞");
  });

  it("durations with two units at most", () => {
    expect(formatDuration(6, "de")).toBe("6 s");
    expect(formatDuration(11 * 60 + 20, "de")).toBe("11 Min");
    expect(formatDuration(2 * 3600 + 5 * 60, "de")).toBe("2 Std 5 Min");
    expect(formatDuration(3 * 86400 + 4 * 3600, "en")).toBe("3 d 4 h");
    expect(formatDuration(86400, "de")).toBe("1 Tag");
    expect(formatEta(MAX_ETA, "de")).toBe("–");
    expect(formatEta(0, "de")).toBe("–");
  });

  it("dates relative to today", () => {
    const now = new Date(2026, 10, 11, 21, 0);
    const today = new Date(2026, 10, 11, 20, 58).getTime() / 1000;
    const yesterday = new Date(2026, 10, 10, 8, 12).getTime() / 1000;
    expect(formatDate(today, now, "de")).toBe("heute, 20:58");
    expect(formatDate(yesterday, now, "en")).toMatch(/^yesterday, /);
    expect(formatDate(-1, now, "de")).toBe("–");
  });

  it("tracker host", () => {
    expect(trackerHost("udp://tracker.opentrackr.org:1337/announce")).toBe("tracker.opentrackr.org");
    expect(trackerHost("not a url")).toBe("not a url");
  });
});
