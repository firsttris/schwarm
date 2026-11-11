import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/api/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { systemStore } from "@/lib/system";
import { m } from "@/paraglide/messages.js";

/** "qBittorrent beenden": app/shutdown quits the program, the web UI goes with it. */
export function ShutdownDialog() {
  const open = systemStore.use().shutdown;
  const [busy, setBusy] = useState(false);
  const close = () => systemStore.set((s) => ({ ...s, shutdown: false }));
  const shutdown = async () => {
    setBusy(true);
    try {
      await api.shutdown();
      systemStore.set({ creator: false, shutdown: false, stopped: true });
    } catch (e) {
      toast.error(m.error_action(), { description: e instanceof Error ? e.message : undefined });
      setBusy(false);
    }
  };
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && close()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{m.shutdown_question()}</AlertDialogTitle>
          <AlertDialogDescription>{m.shutdown_text()}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{m.cancel()}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={busy}
            onClick={(e) => {
              e.preventDefault();
              void shutdown();
            }}
          >
            {m.shutdown_button()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
