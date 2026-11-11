import { describe, expect, it } from "vitest";
import { baseName, formatPieceSize, hasV2, pieceSizes, urlLines } from "./creator";

describe("torrent creator", () => {
  it("offers the piece sizes of the stock WebUI", () => {
    expect(pieceSizes[0]).toBe(0);
    expect(pieceSizes[1]).toBe(16 * 1024);
    expect(pieceSizes.at(-1)).toBe(128 * 1024 * 1024);
    expect(formatPieceSize(16 * 1024)).toBe("16 KiB");
    expect(formatPieceSize(4 * 1024 * 1024)).toBe("4 MiB");
  });

  it("keeps one empty line between tracker tiers", () => {
    expect(urlLines("\n udp://a \n\n\nudp://b\nudp://c\n\n")).toEqual(["udp://a", "", "udp://b", "udp://c"]);
    expect(urlLines("  ")).toEqual([]);
  });

  it("names a task after its folder", () => {
    expect(baseName("/downloads/urlaub/")).toBe("urlaub");
    expect(baseName("C:\\Videos\\film.mkv")).toBe("film.mkv");
  });

  it("knows which libtorrent makes v2 torrents", () => {
    expect(hasV2("2.0.11.0")).toBe(true);
    expect(hasV2("1.2.20.0")).toBe(false);
    expect(hasV2(undefined)).toBe(true);
  });
});
