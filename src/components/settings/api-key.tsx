import { useQueryClient } from "@tanstack/react-query";
import { CopyIcon, KeyRoundIcon, MailIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/api/client";
import { useRunAction } from "@/api/queries";
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
import { Button } from "@/components/ui/button";
import { copyText } from "@/lib/clipboard";
import { maskApiKey } from "@/lib/preferences";
import { preferencesKey, usePreferencesDraft } from "@/lib/preferences/draft";
import { m } from "@/paraglide/messages.js";

/**
 * The key for programs that use qBittorrent's API without a login (app/rotateAPIKey,
 * app/deleteAPIKey). Generating a new one or deleting it asks first, as the stock WebUI does:
 * the old key stops working at once.
 */
export function ApiKeyControl() {
  const draft = usePreferencesDraft();
  const queryClient = useQueryClient();
  const run = useRunAction();
  const key = String(draft.query.data?.web_ui_api_key ?? "");
  const [ask, setAsk] = useState<"rotate" | "delete" | null>(null);

  const confirm = async () => {
    const what = ask;
    setAsk(null);
    if (what === "rotate") {
      const fresh = await run(() => api.rotateApiKey(), {});
      if (fresh) toast.success(key ? m.api_key_rotated() : m.api_key_created());
    } else if (what === "delete") {
      await run(() => api.deleteApiKey(), { success: m.api_key_deleted() });
    }
    await queryClient.invalidateQueries({ queryKey: preferencesKey });
  };

  return (
    <div className="flex w-full flex-col gap-2" data-testid="api-key">
      <div className="flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-md border bg-muted/40 px-3 py-1.5 font-mono text-[13px]">
          {key ? maskApiKey(key) : <span className="text-muted-foreground">{m.api_key_none()}</span>}
        </code>
        {key && (
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={m.api_key_copy()}
            title={m.api_key_copy()}
            onClick={async () => {
              if (await copyText(key)) toast.success(m.api_key_copied());
              else toast.error(m.toast_copy_failed());
            }}
          >
            <CopyIcon />
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => setAsk("rotate")}>
          <KeyRoundIcon /> {key ? m.api_key_rotate() : m.api_key_create()}
        </Button>
        {key && (
          <Button
            variant="outline"
            size="icon-sm"
            className="text-destructive"
            aria-label={m.api_key_delete()}
            title={m.api_key_delete()}
            onClick={() => setAsk("delete")}
          >
            <Trash2Icon />
          </Button>
        )}
      </div>
      <AlertDialog open={ask !== null} onOpenChange={(o) => !o && setAsk(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {ask === "delete" ? m.api_key_delete() : key ? m.api_key_rotate() : m.api_key_create()}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {ask === "delete" ? m.api_key_delete_text() : key ? m.api_key_rotate_text() : m.api_key_create_text()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{m.cancel()}</AlertDialogCancel>
            <AlertDialogAction variant={ask === "delete" ? "destructive" : "default"} onClick={() => void confirm()}>
              {ask === "delete" ? m.api_key_delete_button() : key ? m.api_key_rotate() : m.api_key_create()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/**
 * "Test-E-Mail senden" (app/sendTestEmail). qBittorrent sends with the saved settings and
 * answers before the mail is out, so unsaved mail settings block it and the result is in the log.
 */
export function TestMailButton() {
  const draft = usePreferencesDraft();
  const run = useRunAction();
  const unsaved = Object.keys(draft.changes).some((k) => k.startsWith("mail_notification_"));
  return (
    <span className="flex flex-wrap items-center gap-2 pt-1">
      <Button
        variant="outline"
        size="sm"
        disabled={unsaved}
        onClick={() => run(() => api.sendTestEmail(), { success: m.test_mail_sent() })}
      >
        <MailIcon /> {m.test_mail()}
      </Button>
      {unsaved && <span className="text-muted-foreground text-xs">{m.test_mail_save_first()}</span>}
    </span>
  );
}
