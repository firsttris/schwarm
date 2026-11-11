/** Search plugins and results of the mock, from docs/mockup/Suche.dc.html. */

const KB = 1000;
const MB = 1000 * KB;
const GB = 1000 * MB;
const day = 86400;

export interface MockPlugin {
  name: string;
  fullName: string;
  version: string;
  url: string;
  enabled: boolean;
  categories: string[];
}

export function makePlugins(): MockPlugin[] {
  return [
    {
      name: "linuxtracker",
      fullName: "Linuxtracker",
      version: "1.6",
      url: "https://linuxtracker.org",
      enabled: true,
      categories: ["software"],
    },
    {
      name: "archiveorg",
      fullName: "Archive.org",
      version: "2.3",
      url: "https://archive.org",
      enabled: true,
      categories: ["software", "movies", "books", "music"],
    },
    {
      name: "academictorrents",
      fullName: "Academic Torrents",
      version: "1.2",
      url: "https://academictorrents.com",
      enabled: true,
      categories: ["software", "books"],
    },
    {
      name: "publicdomain",
      fullName: "Public Domain Torrents",
      version: "0.9",
      url: "https://www.publicdomaintorrents.info",
      enabled: false,
      categories: ["movies"],
    },
  ];
}

export interface MockResult {
  fileName: string;
  fileSize: number;
  nbSeeders: number;
  nbLeechers: number;
  engine: string;
  age: number;
  category: string;
}

const corpus: MockResult[] = [
  {
    fileName: "ubuntu-26.04-desktop-amd64.iso",
    fileSize: 6.1 * GB,
    nbSeeders: 1204,
    nbLeechers: 96,
    engine: "linuxtracker",
    age: 21 * day,
    category: "software",
  },
  {
    fileName: "ubuntu-26.04-live-server-amd64.iso",
    fileSize: 3.2 * GB,
    nbSeeders: 488,
    nbLeechers: 31,
    engine: "linuxtracker",
    age: 21 * day,
    category: "software",
  },
  {
    fileName: "ubuntu-25.10-desktop-amd64.iso",
    fileSize: 5.9 * GB,
    nbSeeders: 402,
    nbLeechers: 12,
    engine: "archiveorg",
    age: 210 * day,
    category: "software",
  },
  {
    fileName: "kubuntu-26.04-desktop-amd64.iso",
    fileSize: 4.4 * GB,
    nbSeeders: 211,
    nbLeechers: 18,
    engine: "linuxtracker",
    age: 21 * day,
    category: "software",
  },
  {
    fileName: "xubuntu-26.04-desktop-amd64.iso",
    fileSize: 3.9 * GB,
    nbSeeders: 96,
    nbLeechers: 7,
    engine: "linuxtracker",
    age: 21 * day,
    category: "software",
  },
  {
    fileName: "ubuntu-26.04-desktop-arm64.iso",
    fileSize: 5.8 * GB,
    nbSeeders: 74,
    nbLeechers: 9,
    engine: "archiveorg",
    age: 21 * day,
    category: "software",
  },
  {
    fileName: "ubuntustudio-26.04-dvd-amd64.iso",
    fileSize: 6.9 * GB,
    nbSeeders: 31,
    nbLeechers: 2,
    engine: "academictorrents",
    age: 14 * day,
    category: "software",
  },
  {
    fileName: "ubuntu-26.04-netboot-amd64.tar.gz",
    fileSize: 86 * MB,
    nbSeeders: 12,
    nbLeechers: 1,
    engine: "archiveorg",
    age: 21 * day,
    category: "software",
  },
  {
    fileName: "debian-13.2.0-amd64-DVD-1.iso",
    fileSize: 3.9 * GB,
    nbSeeders: 230,
    nbLeechers: 12,
    engine: "linuxtracker",
    age: 40 * day,
    category: "software",
  },
  {
    fileName: "Sintel (2010) 4K Open Movie",
    fileSize: 14.8 * GB,
    nbSeeders: 139,
    nbLeechers: 30,
    engine: "archiveorg",
    age: 900 * day,
    category: "movies",
  },
  {
    fileName: "Night of the Living Dead (1968)",
    fileSize: 1.4 * GB,
    nbSeeders: 58,
    nbLeechers: 4,
    engine: "publicdomain",
    age: 2000 * day,
    category: "movies",
  },
  {
    fileName: "ImageNet ILSVRC 2012 (validation)",
    fileSize: 6.7 * GB,
    nbSeeders: 44,
    nbLeechers: 11,
    engine: "academictorrents",
    age: 700 * day,
    category: "books",
  },
];

export function searchCorpus(pattern: string, category: string, engines: string[]): MockResult[] {
  const terms = pattern.toLowerCase().split(/\s+/).filter(Boolean);
  return corpus.filter(
    (r) =>
      engines.includes(r.engine) &&
      (category === "all" || r.category === category) &&
      terms.every((t) => r.fileName.toLowerCase().includes(t)),
  );
}

export const units = { KB, MB, GB };
