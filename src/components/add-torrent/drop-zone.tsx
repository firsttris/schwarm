import { FileUpIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { openAddDialog } from "@/lib/add-dialog";
import { m } from "@/paraglide/messages.js";

const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes("Files") ?? false;

/** Drop .torrent files (or a magnet link) anywhere on the page to add them. */
export function DropZone() {
  const [active, setActive] = useState(false);
  const depth = useRef(0);

  useEffect(() => {
    const enter = (e: DragEvent) => {
      if (!hasFiles(e) && !e.dataTransfer?.types.includes("text/uri-list")) return;
      e.preventDefault();
      depth.current++;
      setActive(true);
    };
    const over = (e: DragEvent) => {
      if (depth.current > 0) e.preventDefault();
    };
    const leave = () => {
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setActive(false);
    };
    const drop = (e: DragEvent) => {
      if (depth.current === 0) return;
      e.preventDefault();
      depth.current = 0;
      setActive(false);
      const files = [...(e.dataTransfer?.files ?? [])].filter((f) => f.name.endsWith(".torrent"));
      const links = e.dataTransfer?.getData("text/uri-list") || e.dataTransfer?.getData("text/plain") || "";
      if (files.length || links) openAddDialog({ files, links: files.length ? "" : links });
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragover", over);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragover", over);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
    };
  }, []);

  if (!active) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-10 py-12 text-center">
        <FileUpIcon className="size-6" aria-hidden />
        <p className="font-medium">{m.drop_title()}</p>
        <p className="text-muted-foreground text-sm">{m.drop_text()}</p>
      </div>
    </div>
  );
}
