/**
 * Log, cookies and torrent creator of the mock qBittorrent. Messages follow what
 * qBittorrent 5.3.0 writes at start-up (src/app/application.cpp, src/base/bittorrent/sessionimpl.cpp).
 */

export interface MockLogMessage {
  id: number;
  timestamp: number;
  /** 1 normal, 2 info, 4 warning, 8 critical (src/base/logger.h) */
  type: number;
  message: string;
}

export interface MockLogPeer {
  id: number;
  timestamp: number;
  ip: string;
  blocked: boolean;
  reason: string;
}

export interface MockCookie {
  name: string;
  domain: string;
  path: string;
  value: string;
  expirationDate: number;
}

export function makeLog(now: number): MockLogMessage[] {
  const start = now - 3 * 86400;
  const lines: [number, number, string][] = [
    [0, 1, "qBittorrent v5.3.0 started. Process ID: 1"],
    [1, 2, "Using config directory: /config/qBittorrent"],
    [1, 2, 'Trying to listen on the following list of IP addresses: "tun0:52761"'],
    [2, 2, 'Successfully listening on IP. IP: "10.2.0.2". Port: "TCP/52761"'],
    [2, 2, 'Successfully listening on IP. IP: "10.2.0.2". Port: "UTP/52761"'],
    [3, 1, 'Peer ID: "-qB5300-"'],
    [3, 1, 'HTTP User-Agent: "qBittorrent/5.3.0"'],
    [3, 2, "Distributed Hash Table (DHT) support: ON"],
    [3, 2, "Local Peer Discovery support: ON"],
    [4, 2, "Encryption support: ON"],
    [5, 1, "WebUI: Now listening on IP: *, port: 8080"],
    [6, 4, "UPnP/NAT-PMP support: OFF"],
    [9, 1, 'Restored torrent. Torrent: "ubuntu-26.04-desktop-amd64.iso"'],
    [9, 1, 'Restored torrent. Torrent: "debian-13.2.0-amd64-netinst.iso"'],
    [12, 2, 'Detected external IP. IP: "193.29.106.24"'],
    [3600, 4, 'Failed to load RSS feed. Feed: "https://example.org/broken.xml". Reason: Host example.org not found'],
    [
      7200,
      8,
      'Tracker error. Torrent: "Big Buck Bunny 4K". Tracker: "udp://tracker.dead.example:1337/announce". Error: Host not found',
    ],
    [86400, 1, 'Torrent download finished. Torrent: "archlinux-2026.11.01-x86_64.iso"'],
  ];
  return lines.map(([offset, type, message], i) => ({ id: i, timestamp: start + offset, type, message }));
}

export function makePeerLog(now: number): MockLogPeer[] {
  return [
    { id: 0, timestamp: now - 7200, ip: "45.142.120.18", blocked: true, reason: "IP filter" },
    { id: 1, timestamp: now - 3600, ip: "185.220.101.7", blocked: false, reason: "Manually banned" },
    { id: 2, timestamp: now - 600, ip: "2a01:4f8:c0c:1a2::1", blocked: true, reason: "port filter" },
  ];
}

export function makeCookies(now: number): MockCookie[] {
  return [
    {
      name: "session",
      domain: "tracker.example.org",
      path: "/",
      value: "c2Nod2FybS1kZW1v",
      expirationDate: now + 30 * 86400,
    },
  ];
}

export interface MockCreatorTask {
  taskID: string;
  params: URLSearchParams;
  timeAdded: number;
  polls: number;
}

/** Each status request moves a task on: queued → running (progress in steps) → finished or failed. */
export function creatorStatus(task: MockCreatorTask, now: number) {
  const p = task.params;
  const failing = (p.get("sourcePath") ?? "").includes("missing");
  const progress = Math.min(100, Math.max(0, (task.polls - 1) * 40));
  const status = task.polls === 0 ? "Queued" : progress < 100 ? "Running" : failing ? "Failed" : "Finished";
  // empty entries between trackers start a new tier and stay (torrentcreatorcontroller.cpp, parseUrls)
  const list = (key: string) =>
    p.get(key)
      ? p
          .get(key)!
          .split("|")
          .map((u) => decodeURIComponent(u))
      : [];
  const out: Record<string, unknown> = {
    taskID: task.taskID,
    sourcePath: p.get("sourcePath") ?? "",
    pieceSize: Number(p.get("pieceSize") ?? 0) || (status === "Finished" ? 4 * 1024 * 1024 : 0),
    ignoreDotfiles: p.get("ignoreDotfiles") !== "false",
    private: p.get("private") === "true",
    timeAdded: task.timeAdded,
    format: p.get("format") ?? "hybrid",
    status,
  };
  if (p.get("comment")) out.comment = p.get("comment");
  if (p.get("source")) out.source = p.get("source");
  if (p.get("torrentFilePath")) out.torrentFilePath = p.get("torrentFilePath");
  if (list("trackers").length) out.trackers = list("trackers");
  if (list("urlSeeds").length) out.urlSeeds = list("urlSeeds");
  if (status !== "Queued") out.timeStarted = task.timeAdded + 1;
  if (status === "Running") out.progress = progress;
  if (status === "Finished" || status === "Failed") out.timeFinished = now;
  if (status === "Failed") out.errorMessage = "Create new torrent file failed. Reason: The path does not exist.";
  task.polls++;
  return out;
}
