import { FilePriority, type TorrentFile } from "@/api/schemas";

export const MIXED = -1;

export interface FileNode {
  /** Full path inside the torrent ("Sintel/Untertitel/Sintel.de.srt"). */
  path: string;
  name: string;
  depth: number;
  isDir: boolean;
  size: number;
  /** 0…1, weighted by size for folders. */
  progress: number;
  /** A FilePriority, or MIXED for a folder with different priorities. */
  priority: number;
  /** The file indices under this node, for torrents/filePrio. */
  indices: number[];
  children: FileNode[];
}

/** Builds the folder tree from the flat list of torrents/files ("a/b/c.mkv"). */
export function buildFileTree(files: TorrentFile[]): FileNode[] {
  const root: FileNode = {
    path: "",
    name: "",
    depth: -1,
    isDir: true,
    size: 0,
    progress: 0,
    priority: 0,
    indices: [],
    children: [],
  };
  for (const file of files) {
    const parts = file.name.replaceAll("\\", "/").split("/");
    let parent = root;
    parts.forEach((part, i) => {
      const path = parts.slice(0, i + 1).join("/");
      const isFile = i === parts.length - 1;
      let node = parent.children.find((c) => c.name === part && c.isDir === !isFile);
      if (!node) {
        node = {
          path,
          name: part,
          depth: i,
          isDir: !isFile,
          size: isFile ? file.size : 0,
          progress: isFile ? file.progress : 0,
          priority: isFile ? file.priority : 0,
          indices: isFile ? [file.index] : [],
          children: [],
        };
        parent.children.push(node);
      }
      parent = node;
    });
  }
  summarize(root);
  sortTree(root);
  return root.children;
}

function summarize(node: FileNode): void {
  if (!node.isDir) return;
  let size = 0;
  let done = 0;
  const priorities = new Set<number>();
  node.indices = [];
  for (const child of node.children) {
    summarize(child);
    size += child.size;
    done += child.size * child.progress;
    priorities.add(child.priority);
    node.indices.push(...child.indices);
  }
  node.size = size;
  node.progress = size > 0 ? done / size : 1;
  node.priority = priorities.size === 1 ? [...priorities][0]! : MIXED;
}

function sortTree(node: FileNode): void {
  node.children.sort((a, b) => (a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1));
  for (const child of node.children) sortTree(child);
}

/** Depth-first list of the visible nodes; folders in `collapsed` hide their children. */
export function flattenTree(nodes: FileNode[], collapsed: Set<string> = new Set()): FileNode[] {
  const out: FileNode[] = [];
  const walk = (list: FileNode[]) => {
    for (const node of list) {
      out.push(node);
      if (node.isDir && !collapsed.has(node.path)) walk(node.children);
    }
  };
  walk(nodes);
  return out;
}

/** Keeps files whose path contains the text, and the folders above them. */
export function filterTree(nodes: FileNode[], text: string): FileNode[] {
  const needle = text.trim().toLowerCase();
  if (!needle) return nodes;
  const walk = (list: FileNode[]): FileNode[] =>
    list.flatMap((node) => {
      if (!node.isDir) return node.name.toLowerCase().includes(needle) ? [node] : [];
      const children = walk(node.children);
      return children.length ? [{ ...node, children }] : [];
    });
  return walk(nodes);
}

export function isWanted(priority: number): boolean {
  return priority !== FilePriority.Ignored;
}
