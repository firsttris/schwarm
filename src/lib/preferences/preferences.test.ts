import { describe, expect, it } from "vitest";
import keys from "../../../dev/qbt-preference-keys.json";
import { fieldByKey, looksLikeVpnInterface, maskApiKey, matchesQuery, preferenceFields } from ".";

describe("preference table", () => {
  it("covers every field of app/preferences in qBittorrent 5.3.0", () => {
    const all = new Set([...keys.readable, ...keys.writable]);
    expect([...all].filter((k) => !fieldByKey.has(k))).toEqual([]);
    expect(preferenceFields.filter((f) => !all.has(f.key)).map((f) => f.key)).toEqual([]);
    expect(preferenceFields).toHaveLength(all.size);
  });

  it("marks read-only and write-only fields like the API", () => {
    for (const f of preferenceFields) {
      expect(f.readOnly ?? false, f.key).toBe(!keys.writable.includes(f.key));
      expect(f.writeOnly ?? false, f.key).toBe(!keys.readable.includes(f.key));
    }
  });

  it("has a label and, for choices, options", () => {
    for (const f of preferenceFields) {
      expect(f.label().length, f.key).toBeGreaterThan(0);
      if (f.type === "enum") expect(f.options?.length, f.key).toBeGreaterThan(1);
    }
  });

  it("finds fields by German, English and key", () => {
    const save = fieldByKey.get("save_path")!;
    expect(matchesQuery(save, "standardordner")).toBe(true);
    expect(matchesQuery(save, "default save")).toBe(true);
    expect(matchesQuery(save, "save_path")).toBe(true);
    expect(matchesQuery(save, "proxy")).toBe(false);
  });

  it("recognises VPN interfaces", () => {
    expect(looksLikeVpnInterface("tun0")).toBe(true);
    expect(looksLikeVpnInterface("wg0")).toBe(true);
    expect(looksLikeVpnInterface("eth0")).toBe(false);
    expect(looksLikeVpnInterface("")).toBe(false);
  });
});

describe("API key", () => {
  it("is shown masked like in the stock WebUI", () => {
    const key = "qbt_ABCDEFGHJKLMNPQRSTUVWXYZabcd";
    expect(maskApiKey(key)).toHaveLength(key.length);
    expect(maskApiKey(key).startsWith("qbt_")).toBe(true);
    expect(maskApiKey(key).endsWith("YZabcd")).toBe(true);
    expect(maskApiKey("short")).toBe("•••••");
  });
});
