import { describe, expect, it } from "vitest";
import { createMockApi } from "./mock-api";

const call = async (api: ReturnType<typeof createMockApi>, path: string, init?: RequestInit) =>
  (await api.handle(new Request(`http://x/api/v2/${path}`, init)))!;

describe("mock qBittorrent", () => {
  it("answers 403 without a session and 401 for a wrong login", async () => {
    const api = createMockApi({ auth: true, frozen: true });
    expect((await call(api, "app/version")).status).toBe(403);
    const bad = await call(api, "auth/login", {
      method: "POST",
      body: new URLSearchParams({ username: "admin", password: "x" }),
    });
    expect(bad.status).toBe(401);
    const ok = await call(api, "auth/login", {
      method: "POST",
      body: new URLSearchParams({ username: "admin", password: "adminadmin" }),
    });
    const cookie = ok.headers.get("set-cookie")!.split(";")[0]!;
    expect((await call(api, "app/version", { headers: { cookie } })).status).toBe(200);
  });

  it("sends a full update first, then only the changes", async () => {
    const api = createMockApi({ frozen: true });
    const first = await (await call(api, "sync/maindata?rid=0")).json();
    expect(first.full_update).toBe(true);
    expect(Object.keys(first.torrents)).toHaveLength(10);
    const quiet = await (await call(api, `sync/maindata?rid=${first.rid}`)).json();
    expect(quiet.torrents).toBeUndefined();
    const hash = Object.keys(first.torrents)[0] as string;
    await call(api, "torrents/stop", { method: "POST", body: new URLSearchParams({ hashes: hash }) });
    const delta = await (await call(api, `sync/maindata?rid=${quiet.rid}`)).json();
    expect(delta.full_update).toBeUndefined();
    expect(delta.torrents[hash].state).toBe("stoppedDL");
    expect(Object.keys(delta.torrents)).toEqual([hash]);
  });
});
