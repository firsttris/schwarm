import { PowerIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages.js";

/** After app/shutdown: qBittorrent is gone, and with it the web UI. */
export function StoppedScreen() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-xl border bg-background p-6 text-center shadow-sm">
        <div className="flex size-10 items-center justify-center rounded-lg border">
          <PowerIcon className="size-5" aria-hidden />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="font-semibold text-xl">{m.stopped_title()}</h1>
          <p className="text-muted-foreground text-sm">{m.stopped_text()}</p>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          {m.stopped_reload()}
        </Button>
      </div>
    </main>
  );
}
