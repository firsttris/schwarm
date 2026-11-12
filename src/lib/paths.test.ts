import { describe, expect, it } from "vitest";
import { folderOf, suggestPaths } from "./paths";

describe("path suggestions", () => {
  it("asks for the folder of what is typed", () => {
    expect(folderOf("/downloads/fi")).toBe("/downloads/");
    expect(folderOf("/downloads/")).toBe("/downloads/");
    expect(folderOf("/")).toBe("/");
    expect(folderOf("C:\\Videos\\Fi")).toBe("C:\\Videos\\");
    expect(folderOf("downloads")).toBeUndefined();
    expect(folderOf("")).toBeUndefined();
  });

  it("keeps what starts with the typed text, as folders", () => {
    const entries = ["/downloads/linux", "/downloads/filme", "/downloads/Fotos", "/downloads/spiele"];
    expect(suggestPaths("/downloads/f", entries)).toEqual(["/downloads/filme/", "/downloads/Fotos/"]);
    expect(suggestPaths("/downloads/", entries)).toHaveLength(4);
    expect(suggestPaths("/downloads/linux", entries)).toEqual([]);
    expect(suggestPaths("C:\\V", ["C:\\Videos"])).toEqual(["C:\\Videos\\"]);
  });
});
