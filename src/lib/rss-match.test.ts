import { describe, expect, it } from "vitest";
import { matchesEpisodeFilter, matchRule, wildcardToRegex } from "./rss-match";

const rule = (o: Partial<Parameters<typeof matchRule>[1]>) => ({
  mustContain: "",
  mustNotContain: "",
  useRegex: false,
  episodeFilter: "",
  ...o,
});

describe("matchRule (rss_autodownloadrule.cpp)", () => {
  it("needs every wildcard of one alternative, in any order, case-insensitive", () => {
    const r = rule({ mustContain: "ubuntu 26.04 desktop amd64" });
    expect(matchRule("Ubuntu 26.04.1 LTS Desktop (amd64)", r)).toEqual({
      ok: true,
      highlights: ["Ubuntu", "26.04", "Desktop", "amd64"],
    });
    expect(matchRule("Ubuntu 26.04.1 LTS Server (amd64)", r)).toEqual({
      ok: false,
      reason: "missing",
      detail: "desktop",
    });
  });

  it("treats | as alternatives and wildcards as * and ?", () => {
    const r = rule({ mustContain: "fedora*workstation | debian" });
    expect(matchRule("Fedora-Workstation-Live-44", r).ok).toBe(true);
    expect(matchRule("debian 13", r).ok).toBe(true);
    expect(matchRule("arch", r).ok).toBe(false);
    expect(wildcardToRegex("a.b*c?")).toBe("a\\.b.*c.");
  });

  it("excludes with must-not-contain", () => {
    const r = rule({ mustContain: "ubuntu", mustNotContain: "beta | daily | arm64" });
    expect(matchRule("Ubuntu 26.04 Desktop (arm64)", r)).toEqual({ ok: false, reason: "excluded", detail: "arm64" });
    expect(matchRule("Ubuntu 26.04 Desktop (amd64)", r).ok).toBe(true);
  });

  it("uses the whole field as one regex", () => {
    const r = rule({ mustContain: "ubuntu.*(amd64|arm64)", useRegex: true });
    expect(matchRule("Ubuntu 26.04 arm64", r).ok).toBe(true);
    expect(matchRule("Ubuntu 26.04 i386", r).ok).toBe(false);
    expect(matchRule("x", rule({ mustContain: "(", useRegex: true }))).toEqual({ ok: false, reason: "invalid" });
  });

  it("episode filter: single episodes, ranges and open ranges", () => {
    expect(matchesEpisodeFilter("Show S01E05 1080p", "1x5;")).toBe(true);
    expect(matchesEpisodeFilter("Show 1x05", "1x5;")).toBe(true);
    expect(matchesEpisodeFilter("Show S01E06", "1x5;")).toBe(false);
    expect(matchesEpisodeFilter("Show S01E09", "1x8-15;")).toBe(true);
    expect(matchesEpisodeFilter("Show S01E16", "1x8-15;")).toBe(false);
    expect(matchesEpisodeFilter("Show S02E01", "1x20-;")).toBe(true);
    expect(matchesEpisodeFilter("Show S01E21", "1x20-;")).toBe(true);
    expect(matchesEpisodeFilter("Show S01E19", "1x20-;")).toBe(false);
    expect(matchesEpisodeFilter("anything", "nonsense")).toBe(false);
    expect(matchRule("Show S01E19", rule({ episodeFilter: "1x20-;" }))).toEqual({ ok: false, reason: "episode" });
  });
});
