import { describe, expect, it } from "vitest";
import { formatLimitPair, formatMbps, formatSchedule, parseMbps, schedulerDaysLabel } from "./limits";

describe("limits", () => {
  it("formats and parses MB/s", () => {
    expect(formatMbps(0, "de")).toBe("");
    expect(formatMbps(2.5e6, "de")).toBe("2,5");
    expect(formatMbps(10e6, "en")).toBe("10");
    expect(parseMbps("")).toBe(0);
    expect(parseMbps("2,5")).toBe(2_500_000);
    expect(parseMbps(" 10 ")).toBe(10_000_000);
    expect(parseMbps("viel")).toBeNaN();
    expect(parseMbps("-1")).toBeNaN();
  });
  it("describes limits and the schedule", () => {
    expect(formatLimitPair(0, 5e6, "de")).toBe("unbegrenzt / 5 MB/s");
    expect(schedulerDaysLabel(1, "de")).toBe("Mo–Fr");
    expect(schedulerDaysLabel(3, "de")).toBe("Montag");
    expect(schedulerDaysLabel(9, "en")).toBe("Sunday");
    expect(
      formatSchedule(
        { schedule_from_hour: 8, schedule_from_min: 0, schedule_to_hour: 18, schedule_to_min: 30, scheduler_days: 1 },
        "de",
      ),
    ).toBe("Mo–Fr 08:00–18:30");
  });
});
