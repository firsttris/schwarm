/**
 * Sample data of the mock qBittorrent, taken from the design mockup (docs/mockup/Main.dc.html,
 * Details/Dateien/Peers/Tracker.dc.html). Field names follow serialize_torrent.cpp.
 */

export interface MockFile {
  name: string;
  size: number;
  progress: number;
  priority: number;
}

export interface MockPeer {
  ip: string;
  port: number;
  country_code: string;
  country: string;
  client: string;
  flags: string;
  progress: number;
  dl_speed: number;
  up_speed: number;
  connection: string;
}

export interface MockTracker {
  url: string;
  tier: number;
  status: number;
  msg: string;
  num_seeds: number;
  num_peers: number;
  num_leeches: number;
  num_downloaded: number;
  next_in: number;
}

export interface MockTorrent {
  hash: string;
  name: string;
  category: string;
  tags: string[];
  state: string;
  size: number;
  progress: number;
  dlspeed: number;
  upspeed: number;
  ratio: number;
  num_seeds: number;
  num_complete: number;
  num_leechs: number;
  num_incomplete: number;
  added_ago: number;
  time_active: number;
  piece_size: number;
  save_path: string;
  comment: string;
  created_by: string;
  seq_dl?: boolean;
  f_l_piece_prio?: boolean;
  auto_tmm?: boolean;
  super_seeding?: boolean;
  force_start?: boolean;
  private?: boolean;
  files: MockFile[];
  trackers: MockTracker[];
  webseeds: string[];
  peers: MockPeer[];
  error?: string;
  dl_limit?: number;
  up_limit?: number;
  share?: {
    ratioLimit: number;
    seedingTimeLimit: number;
    inactiveSeedingTimeLimit: number;
    shareLimitAction: string;
    shareLimitsMode: string;
  };
}

const KB = 1000;
const MB = 1000 * KB;
const GB = 1000 * MB;

const opentrackr = (seeds: number, peers: number, next = 24 * 60): MockTracker => ({
  url: "udp://tracker.opentrackr.org:1337/announce",
  tier: 0,
  status: 2,
  msg: "",
  num_seeds: seeds,
  num_peers: peers,
  num_leeches: peers,
  num_downloaded: seeds * 9,
  next_in: next,
});

const tracker = (url: string, tier: number, seeds: number, peers: number, next: number): MockTracker => ({
  url,
  tier,
  status: 2,
  msg: "",
  num_seeds: seeds,
  num_peers: peers,
  num_leeches: peers,
  num_downloaded: seeds * 7,
  next_in: next,
});

const deadTracker: MockTracker = {
  url: "udp://tracker.dead.example:6969/announce",
  tier: 2,
  status: 4,
  msg: "Zeitüberschreitung: Tracker antwortet nicht.",
  num_seeds: -1,
  num_peers: -1,
  num_leeches: -1,
  num_downloaded: -1,
  next_in: 3 * 60,
};

const sintelPeers: MockPeer[] = [
  peer("203.0.113.42", 51413, "DE", "Germany", "qBittorrent 5.1.2", "D E I", 1, 1.9 * MB, 0),
  peer("198.51.100.7", 6881, "NL", "Netherlands", "Transmission 4.0.6", "D E P", 1, 1.4 * MB, 0),
  peer("192.0.2.88", 50321, "SE", "Sweden", "Deluge 2.1.1", "D U E", 0.64, 820 * KB, 210 * KB),
  peer("203.0.113.150", 6889, "FR", "France", "libtorrent 2.0.11", "D E", 1, 610 * KB, 0),
  peer("198.51.100.201", 49152, "US", "United States", "qBittorrent 5.3.0", "U E I", 0.12, 0, 340 * KB),
  peer("192.0.2.14", 4240, "CH", "Switzerland", "rqbit 8.1", "D P", 1, 290 * KB, 0),
  peer("203.0.113.9", 55000, "PL", "Poland", "BiglyBT 3.8", "D U", 0.87, 140 * KB, 45 * KB),
];

function peer(
  ip: string,
  port: number,
  country_code: string,
  country: string,
  client: string,
  flags: string,
  progress: number,
  dl_speed: number,
  up_speed: number,
): MockPeer {
  return {
    ip,
    port,
    country_code: country_code.toLowerCase(),
    country,
    client,
    flags,
    progress,
    dl_speed,
    up_speed,
    connection: flags.includes("P") ? "μTP" : "BT",
  };
}

function single(name: string, size: number, progress: number): MockFile[] {
  return [{ name, size, progress, priority: 1 }];
}

function hash(seed: string): string {
  // Stable 40-hex-digit "info hash" from the name
  let h1 = 0x811c9dc5;
  let out = "";
  for (let round = 0; out.length < 40; round++) {
    for (const ch of `${seed}#${round}`) {
      h1 ^= ch.charCodeAt(0);
      h1 = Math.imul(h1, 0x01000193) >>> 0;
    }
    out += h1.toString(16).padStart(8, "0");
  }
  return out.slice(0, 40);
}

export function makeFixtures(): MockTorrent[] {
  const ubuntuHash = "3b245504cf5f11bbdbe1201cea6a6bf45aee1bc0";
  const base = {
    tags: [] as string[],
    num_seeds: 0,
    num_complete: 0,
    num_leechs: 0,
    num_incomplete: 0,
    piece_size: 4 * 1024 * 1024,
    comment: "",
    created_by: "mktorrent 1.1",
    webseeds: [] as string[],
    peers: [] as MockPeer[],
    auto_tmm: true,
  };
  const list: MockTorrent[] = [
    {
      ...base,
      hash: ubuntuHash,
      name: "ubuntu-26.04-desktop-amd64.iso",
      category: "Linux",
      state: "downloading",
      size: 6.1 * GB,
      progress: 0.73,
      dlspeed: 18.4 * MB,
      upspeed: 1.2 * MB,
      ratio: 0.12,
      num_seeds: 412,
      num_complete: 1204,
      num_leechs: 38,
      num_incomplete: 96,
      added_ago: 7 * 60 + 20,
      time_active: 7 * 60,
      save_path: "/downloads/linux",
      comment: "Ubuntu CD releases.ubuntu.com",
      files: single("ubuntu-26.04-desktop-amd64.iso", 6.1 * GB, 0.73),
      trackers: [
        tracker("https://torrent.ubuntu.com/announce", 0, 1180, 88, 24 * 60),
        tracker("https://ipv6.torrent.ubuntu.com/announce", 1, 24, 8, 18 * 60),
      ],
      peers: sintelPeers.slice(0, 5).map((p) => ({ ...p, dl_speed: p.dl_speed * 3 })),
    },
    {
      ...base,
      hash: hash("sintel"),
      name: "Sintel (2010) 4K Open Movie",
      category: "Filme",
      tags: ["4K", "behalten"],
      state: "downloading",
      size: 14.8 * GB,
      progress: 0.41,
      dlspeed: 12.9 * MB,
      upspeed: 0.4 * MB,
      ratio: 0.05,
      num_seeds: 14,
      num_complete: 139,
      num_leechs: 7,
      num_incomplete: 30,
      added_ago: 25 * 60,
      time_active: 24 * 60,
      save_path: "/downloads/filme",
      comment: "Sintel – Blender Foundation, CC BY 3.0",
      created_by: "Blender Foundation",
      files: [
        { name: "Sintel (2010) 4K/Sintel.2010.4K.mkv", size: 13.9 * GB, progress: 0.39, priority: 1 },
        { name: "Sintel (2010) 4K/Untertitel/Sintel.de.srt", size: 62 * KB, progress: 1, priority: 6 },
        { name: "Sintel (2010) 4K/Untertitel/Sintel.en.srt", size: 58 * KB, progress: 1, priority: 1 },
        { name: "Sintel (2010) 4K/Untertitel/Sintel.fr.srt", size: 60 * KB, progress: 0, priority: 0 },
        { name: "Sintel (2010) 4K/Extras/Making-of.mkv", size: 820 * MB, progress: 0, priority: 0 },
        { name: "Sintel (2010) 4K/Extras/Poster.jpg", size: 4.1 * MB, progress: 1, priority: 7 },
      ],
      trackers: [opentrackr(87, 21), tracker("https://tracker.example.org/announce", 1, 52, 9, 18 * 60), deadTracker],
      webseeds: ["https://download.blender.org/durian/movies/"],
      peers: sintelPeers,
    },
    {
      ...base,
      hash: hash("fedora"),
      name: "Fedora-Workstation-Live-x86_64-44",
      category: "Linux",
      state: "downloading",
      size: 1.1 * GB,
      progress: 0.961,
      dlspeed: 7.1 * MB,
      upspeed: 184 * KB,
      ratio: 0.31,
      num_seeds: 96,
      num_complete: 410,
      num_leechs: 12,
      num_incomplete: 44,
      added_ago: 3 * 60,
      time_active: 3 * 60,
      save_path: "/downloads/linux",
      files: [
        {
          name: "Fedora-Workstation-Live-x86_64-44/Fedora-Workstation-Live-x86_64-44.iso",
          size: 1.1 * GB,
          progress: 0.961,
          priority: 1,
        },
        { name: "Fedora-Workstation-Live-x86_64-44/CHECKSUM", size: 1 * KB, progress: 1, priority: 1 },
      ],
      trackers: [tracker("http://torrent.fedoraproject.org:6969/announce", 0, 410, 44, 12 * 60)],
    },
    {
      ...base,
      hash: hash("debian"),
      name: "debian-13.2.0-amd64-DVD-1.iso",
      category: "Linux",
      tags: ["Archiv"],
      state: "uploading",
      size: 3.9 * GB,
      progress: 1,
      dlspeed: 0,
      upspeed: 820 * KB,
      ratio: 2.41,
      num_seeds: 0,
      num_complete: 230,
      num_leechs: 4,
      num_incomplete: 12,
      added_ago: 9 * 86400,
      time_active: 8 * 86400,
      save_path: "/downloads/linux",
      files: single("debian-13.2.0-amd64-DVD-1.iso", 3.9 * GB, 1),
      trackers: [tracker("http://bttracker.debian.org:6969/announce", 0, 230, 12, 28 * 60)],
    },
    {
      ...base,
      hash: hash("bbb"),
      name: "Big Buck Bunny 60fps 4K",
      category: "Filme",
      tags: ["4K"],
      state: "uploading",
      size: 10.2 * GB,
      progress: 1,
      dlspeed: 0,
      upspeed: 1.4 * MB,
      ratio: 1.87,
      num_seeds: 0,
      num_complete: 88,
      num_leechs: 6,
      num_incomplete: 15,
      added_ago: 4 * 86400,
      time_active: 4 * 86400,
      save_path: "/downloads/filme",
      files: [
        {
          name: "Big Buck Bunny 60fps 4K/bbb_sunflower_2160p_60fps_normal.mp4",
          size: 10.2 * GB,
          progress: 1,
          priority: 1,
        },
      ],
      trackers: [opentrackr(88, 15, 9 * 60)],
    },
    {
      ...base,
      hash: hash("arch"),
      name: "archlinux-2026.11.01-x86_64.iso",
      category: "Linux",
      state: "uploading",
      size: 1.4 * GB,
      progress: 1,
      dlspeed: 0,
      upspeed: 96 * KB,
      ratio: 5.02,
      num_seeds: 0,
      num_complete: 520,
      num_leechs: 1,
      num_incomplete: 9,
      added_ago: 10 * 86400,
      time_active: 10 * 86400,
      save_path: "/downloads/linux",
      files: single("archlinux-2026.11.01-x86_64.iso", 1.4 * GB, 1),
      trackers: [],
      webseeds: ["https://geo.mirror.pkgbuild.com/iso/2026.11.01/"],
    },
    {
      ...base,
      hash: hash("tears"),
      name: "Tears of Steel (2012) 1080p",
      category: "Filme",
      tags: ["behalten"],
      state: "stalledUP",
      size: 1.8 * GB,
      progress: 1,
      dlspeed: 0,
      upspeed: 0,
      ratio: 0.94,
      num_seeds: 0,
      num_complete: 31,
      num_leechs: 0,
      num_incomplete: 2,
      added_ago: 2 * 86400,
      time_active: 2 * 86400,
      save_path: "/downloads/filme",
      files: single("tears_of_steel_1080p.mkv", 1.8 * GB, 1),
      trackers: [opentrackr(31, 2, 20 * 60)],
    },
    {
      ...base,
      hash: hash("mint"),
      name: "linuxmint-22.3-cinnamon-64bit.iso",
      category: "Linux",
      state: "stoppedDL",
      size: 2.9 * GB,
      progress: 0.58,
      dlspeed: 0,
      upspeed: 0,
      ratio: 0.02,
      added_ago: 5 * 86400,
      time_active: 40 * 60,
      save_path: "/downloads/linux",
      files: single("linuxmint-22.3-cinnamon-64bit.iso", 2.9 * GB, 0.58),
      trackers: [tracker("https://linuxtracker.org/announce.php", 0, 140, 22, 0)],
    },
    {
      ...base,
      hash: hash("enwiki"),
      name: "enwiki-20261101-pages-articles.xml.bz2",
      category: "Daten",
      tags: ["Archiv"],
      state: "stoppedDL",
      size: 24.6 * GB,
      progress: 0.12,
      dlspeed: 0,
      upspeed: 0,
      ratio: 0,
      added_ago: 6 * 86400,
      time_active: 2 * 3600,
      save_path: "/downloads/daten",
      files: single("enwiki-20261101-pages-articles.xml.bz2", 24.6 * GB, 0.12),
      trackers: [tracker("https://linuxtracker.org/announce.php", 0, 19, 4, 0)],
    },
    {
      ...base,
      hash: hash("0ad"),
      name: "0 A.D. Alpha 27 (Linux)",
      category: "Spiele",
      state: "error",
      size: 2.2 * GB,
      progress: 0.34,
      dlspeed: 0,
      upspeed: 0,
      ratio: 0.08,
      added_ago: 1 * 86400,
      time_active: 3 * 3600,
      save_path: "/downloads/spiele",
      error: "Tracker antwortet nicht",
      files: single("0ad-0.27.0-linux.tar.xz", 2.2 * GB, 0.34),
      trackers: [{ ...deadTracker, tier: 0 }, tracker("https://linuxtracker.org/announce.php", 1, 8, 2, 0)],
    },
  ];
  return list;
}

export const fixtureCategories: Record<string, { name: string; savePath: string }> = {
  Filme: { name: "Filme", savePath: "/downloads/filme" },
  Linux: { name: "Linux", savePath: "/downloads/linux" },
  Spiele: { name: "Spiele", savePath: "/downloads/spiele" },
  Daten: { name: "Daten", savePath: "/downloads/daten" },
};

export const fixtureTags = ["4K", "Archiv", "behalten"];

export const units = { KB, MB, GB };
