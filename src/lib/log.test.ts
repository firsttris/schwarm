import { describe, expect, it } from "vitest";
import { appendLog, countLevels, filterLog, logLevel } from "./log";

const msg = (id: number, type: number, message = `m${id}`) => ({ id, timestamp: 1000 + id, type, message });

describe("log", () => {
  it("maps the type bits to a level", () => {
    expect(logLevel(1)).toBe("normal");
    expect(logLevel(2)).toBe("info");
    expect(logLevel(4)).toBe("warning");
    expect(logLevel(8)).toBe("critical");
  });

  it("appends only newer messages and keeps the newest", () => {
    const a = appendLog([], [msg(0, 1), msg(1, 2)]);
    expect(a.map((x) => x.id)).toEqual([0, 1]);
    const b = appendLog(a, [msg(2, 4)]);
    expect(b.map((x) => x.id)).toEqual([0, 1, 2]);
    expect(appendLog(b, [])).toBe(b);
    expect(appendLog(b, [msg(3, 1), msg(4, 1)], 3).map((x) => x.id)).toEqual([2, 3, 4]);
  });

  it("starts over when qBittorrent restarted", () => {
    const a = appendLog([], [msg(0, 1), msg(1, 1), msg(2, 1)]);
    expect(appendLog(a, [msg(0, 2), msg(1, 1)]).map((x) => x.type)).toEqual([2, 1]);
  });

  it("filters by level and text, newest first", () => {
    const list = [msg(0, 1, "started"), msg(1, 4, "UPnP off"), msg(2, 8, "Tracker error"), msg(3, 1, "Tracker ok")];
    expect(filterLog(list, ["normal", "info", "warning", "critical"], "").map((x) => x.id)).toEqual([3, 2, 1, 0]);
    expect(filterLog(list, ["warning", "critical"], "").map((x) => x.id)).toEqual([2, 1]);
    expect(filterLog(list, ["normal", "critical"], "tracker").map((x) => x.id)).toEqual([3, 2]);
    expect(countLevels(list)).toEqual({ normal: 2, info: 0, warning: 1, critical: 1 });
  });
});
