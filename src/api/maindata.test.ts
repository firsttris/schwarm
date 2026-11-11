import { describe, expect, it } from "vitest";
import { mergeMaindata, mergePeers } from "./maindata";
import type { MaindataResponse } from "./schemas";

const full: MaindataResponse = {
  rid: 1,
  full_update: true,
  torrents: {
    a: { name: "A", state: "downloading", progress: 0.5, dlspeed: 100, tags: "" },
    b: { name: "B", state: "uploading", progress: 1, dlspeed: 0, tags: "x" },
  },
  categories: { Linux: { name: "Linux", savePath: "/l" } },
  tags: ["x", "a"],
  trackers: { "udp://t/announce": ["a", "b"] },
  server_state: { dl_info_speed: 100, connection_status: "connected" },
};

describe("mergeMaindata", () => {
  it("takes a full update as is", () => {
    const s = mergeMaindata(undefined, full);
    expect(s.rid).toBe(1);
    expect(Object.keys(s.torrents)).toEqual(["a", "b"]);
    expect(s.torrents.a?.hash).toBe("a");
    expect(s.tags).toEqual(["a", "x"]);
  });

  it("merges changed fields and keeps unchanged torrents identical", () => {
    const s1 = mergeMaindata(undefined, full);
    const s2 = mergeMaindata(s1, { rid: 2, torrents: { a: { progress: 0.6 } }, server_state: { dl_info_speed: 50 } });
    expect(s2.torrents.a?.progress).toBe(0.6);
    expect(s2.torrents.a?.name).toBe("A");
    expect(s2.torrents.b).toBe(s1.torrents.b);
    expect(s2.serverState).toEqual({ dl_info_speed: 50, connection_status: "connected" });
    expect(s2.categories).toBe(s1.categories);
  });

  it("applies the *_removed lists", () => {
    const s1 = mergeMaindata(undefined, full);
    const s2 = mergeMaindata(s1, {
      rid: 2,
      torrents_removed: ["b"],
      categories_removed: ["Linux"],
      tags_removed: ["x"],
      trackers_removed: ["udp://t/announce"],
    });
    expect(Object.keys(s2.torrents)).toEqual(["a"]);
    expect(s2.categories).toEqual({});
    expect(s2.tags).toEqual(["a"]);
    expect(s2.trackers).toEqual({});
  });

  it("starts over on a full update", () => {
    const s1 = mergeMaindata(undefined, full);
    const s2 = mergeMaindata(s1, { rid: 3, full_update: true, torrents: { c: { name: "C" } } });
    expect(Object.keys(s2.torrents)).toEqual(["c"]);
    expect(s2.tags).toEqual([]);
  });
});

describe("mergePeers", () => {
  it("merges and removes peers by ip:port", () => {
    const p1 = mergePeers(undefined, {
      rid: 1,
      full_update: true,
      show_flags: true,
      peers: { "1.2.3.4:1": { client: "x", dl_speed: 1 } },
    });
    const p2 = mergePeers(p1, { rid: 2, peers: { "1.2.3.4:1": { dl_speed: 5 }, "5.6.7.8:2": { client: "y" } } });
    expect(p2.peers["1.2.3.4:1"]).toMatchObject({ client: "x", dl_speed: 5, key: "1.2.3.4:1" });
    expect(p2.showFlags).toBe(true);
    const p3 = mergePeers(p2, { rid: 3, peers_removed: ["1.2.3.4:1"] });
    expect(Object.keys(p3.peers)).toEqual(["5.6.7.8:2"]);
  });
});
