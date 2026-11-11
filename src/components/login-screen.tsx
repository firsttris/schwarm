import { useQueryClient } from "@tanstack/react-query";
import { LoaderCircleIcon } from "lucide-react";
import { type FormEvent, useState } from "react";
import { ApiError, api } from "@/api/client";
import { authState, resetMaindata } from "@/api/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { m } from "@/paraglide/messages.js";
import { Logo } from "./logo";

/** qBittorrent's own login (auth/login, cookie SID); 401 means wrong credentials (authcontroller.cpp). */
export function LoginScreen() {
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const body = await api.login(username, password);
      // qBittorrent before 5.x answered 200 with "Fails." on wrong credentials
      if (body.trim() === "Fails.") throw new ApiError(401, body);
      resetMaindata();
      queryClient.clear();
      authState.set(false);
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 401
          ? m.login_wrong()
          : e instanceof ApiError && e.status === 403
            ? m.login_banned()
            : m.login_failed(),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <form
        onSubmit={submit}
        className="flex w-full max-w-sm flex-col gap-6 rounded-xl border bg-background p-6 shadow-sm"
        aria-labelledby="login-title"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo className="size-10" />
          <div className="flex flex-col gap-1">
            <h1 id="login-title" className="font-semibold text-xl">
              {m.login_title()}
            </h1>
            <p className="text-muted-foreground text-sm">{m.login_text()}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="username">{m.login_username()}</Label>
          <Input
            id="username"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">{m.login_password()}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy}>
          {busy && <LoaderCircleIcon className="animate-spin" />}
          {m.login_submit()}
        </Button>
      </form>
    </main>
  );
}
