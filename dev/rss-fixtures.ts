/** RSS feeds, articles and auto-download rules of the mock (docs/mockup/RSS.dc.html, Regeln.dc.html). */

export interface MockArticle {
  id: string;
  title: string;
  ageMinutes: number;
  description: string;
  torrentURL: string;
  link: string;
  isRead: boolean;
}

export interface MockFeed {
  kind: "feed";
  uid: string;
  url: string;
  title: string;
  hasError?: boolean;
  articles: MockArticle[];
}

export interface MockFolder {
  kind: "folder";
  children: Record<string, MockFeed | MockFolder>;
}

const magnet = (name: string) =>
  `magnet:?xt=urn:btih:${name
    .split("")
    .reduce((h, c) => (h * 33 + c.charCodeAt(0)) >>> 0, 5381)
    .toString(16)
    .padStart(8, "0")
    .repeat(5)}&dn=${encodeURIComponent(name)}`;

let counter = 0;
const article = (title: string, ageMinutes: number, description: string, isRead = false): MockArticle => ({
  id: `a${++counter}`,
  title,
  ageMinutes,
  description,
  torrentURL: magnet(title),
  link: `https://example.org/${encodeURIComponent(title)}`,
  isRead,
});

const feed = (uid: string, url: string, title: string, articles: MockArticle[], hasError = false): MockFeed => ({
  kind: "feed",
  uid,
  url,
  title,
  articles,
  hasError,
});

export function makeRssTree(): MockFolder {
  counter = 0;
  return {
    kind: "folder",
    children: {
      Linux: {
        kind: "folder",
        children: {
          "Ubuntu Releases": feed(
            "{11111111-0000-0000-0000-000000000001}",
            "https://releases.ubuntu.com/feed.xml",
            "Ubuntu Releases",
            [
              article(
                "Ubuntu 26.04.1 LTS Desktop (amd64)",
                60 * 7,
                "Erstes Point-Release von Ubuntu 26.04 LTS mit aktualisiertem Kernel und allen Sicherheitsupdates seit April.",
              ),
              article("Ubuntu 26.04.1 LTS Server (amd64)", 60 * 7, "Server-Variante des ersten Point-Releases."),
              article("Ubuntu 26.04 LTS Desktop (amd64)", 60 * 24 * 21, "Ubuntu 26.04 LTS.", true),
            ],
          ),
          "Linuxtracker – Neu": feed(
            "{11111111-0000-0000-0000-000000000002}",
            "https://linuxtracker.org/rss.php",
            "Linuxtracker – Neu",
            [
              article("Fedora-Workstation-Live-x86_64-44", 60 * 3, "Fedora Workstation 44 Live-Image."),
              article("Ubuntu 26.04 Desktop (arm64)", 60 * 5, "Ubuntu für ARM64."),
              article("linuxmint-22.3-cinnamon-64bit", 60 * 26, "Linux Mint 22.3 Cinnamon."),
              article("debian-13.2.0-amd64-DVD-1", 60 * 30, "Debian 13.2 DVD.", true),
              article("archlinux-2026.11.01-x86_64", 60 * 50, "Arch Linux November."),
              article("kubuntu-26.04-desktop-amd64", 60 * 70, "Kubuntu 26.04."),
              article("openSUSE-Tumbleweed-DVD-x86_64-Snapshot20261108", 60 * 80, "Tumbleweed."),
              article("Rocky-10.1-x86_64-dvd", 60 * 100, "Rocky Linux 10.1."),
            ],
          ),
        },
      },
      Sonstiges: {
        kind: "folder",
        children: {
          "Blender Open Movies": feed(
            "{11111111-0000-0000-0000-000000000003}",
            "https://studio.blender.org/films/feed/",
            "Blender Open Movies",
            [
              article("Sprite Fright (2021) 4K", 60 * 24 * 3, "Open Movie des Blender Studios."),
              article("Big Buck Bunny 60fps 4K", 60 * 24 * 30, "Neu gemastert.", true),
            ],
          ),
          "Archive.org – Neu": feed(
            "{11111111-0000-0000-0000-000000000004}",
            "https://archive.org/services/collection-rss.php",
            "Archive.org – Neu",
            [
              article("Night of the Living Dead (1968)", 60 * 9, "Public-Domain-Klassiker."),
              article("Nosferatu (1922) restored", 60 * 12, "Restaurierte Fassung."),
              article("Metropolis (1927)", 60 * 15, "Stummfilm."),
              article("His Girl Friday (1940)", 60 * 18, "Komödie."),
            ],
          ),
        },
      },
      "Alter Feed": feed(
        "{11111111-0000-0000-0000-000000000005}",
        "https://old.example.org/rss",
        "Alter Feed",
        [],
        true,
      ),
    },
  };
}

/** RFC 2822 date, as qBittorrent stores lastMatch (rss_autodownloadrule.cpp). */
const ago = (now: number, hours: number) => new Date((now - hours * 3600) * 1000).toUTCString().replace("GMT", "+0000");

export function makeRssRules(now: number): Record<string, Record<string, unknown>> {
  const base = {
    enabled: true,
    priority: 0,
    useRegex: false,
    mustNotContain: "",
    episodeFilter: "",
    ignoreDays: 0,
    smartFilter: false,
    previouslyMatchedEpisodes: [],
    lastMatch: "",
  };
  return {
    "Ubuntu LTS": {
      ...base,
      mustContain: "ubuntu 26.04 desktop amd64",
      mustNotContain: "beta | daily | arm64",
      smartFilter: true,
      affectedFeeds: ["https://releases.ubuntu.com/feed.xml", "https://linuxtracker.org/rss.php"],
      lastMatch: ago(now, 7),
      ignoreDays: 7,
      torrentParams: { category: "Linux", tags: ["behalten"], save_path: "/downloads/linux" },
    },
    "Blender Open Movies": {
      ...base,
      mustContain: "4K",
      affectedFeeds: ["https://studio.blender.org/films/feed/"],
      lastMatch: ago(now, 21 * 24),
      torrentParams: { category: "Filme", tags: [], save_path: "" },
    },
    "Fedora Workstation": {
      ...base,
      enabled: false,
      mustContain: "fedora*workstation",
      affectedFeeds: ["https://linuxtracker.org/rss.php"],
      torrentParams: { category: "Linux", tags: [], save_path: "" },
    },
  };
}
