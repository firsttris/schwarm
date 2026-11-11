import { ShieldAlertIcon, ShieldCheckIcon, ShieldXIcon } from "lucide-react";
import { useMaindata } from "@/api/queries";
import { Badge } from "@/components/ui/badge";
import { formatBytes, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages.js";

/**
 * Connection state from sync/maindata → server_state (connection_status, set in
 * getTransferInfo() of synccontroller.cpp: "connected", "firewalled" or "disconnected").
 * Schwarm does not talk to a VPN container; it shows what qBittorrent knows.
 */
function useConnection() {
  const { data } = useMaindata();
  const s = data?.serverState ?? {};
  const status = s.connection_status ?? "disconnected";
  const label =
    status === "connected"
      ? m.connection_connected()
      : status === "firewalled"
        ? m.connection_firewalled()
        : m.connection_disconnected();
  return { s, status, label };
}

export function ConnectionCard() {
  const { s, status, label } = useConnection();
  const Icon = status === "connected" ? ShieldCheckIcon : status === "firewalled" ? ShieldAlertIcon : ShieldXIcon;
  return (
    <div
      className="flex flex-col gap-1.5 rounded-lg border bg-background p-3 text-sm group-data-[collapsible=icon]:hidden"
      data-testid="connection-card"
    >
      <div className="flex items-center gap-2 font-medium">
        <Icon
          className={cn(
            "size-4",
            status === "connected" && "text-success",
            status === "disconnected" && "text-destructive",
          )}
          aria-hidden
        />
        {label}
      </div>
      <div className="text-muted-foreground text-xs/relaxed tabular-nums">
        <span className="font-mono">{s.last_external_address_v4 || s.last_external_address_v6 || "–"}</span>
        <br />
        {m.connection_details({
          nodes: formatNumber(s.dht_nodes ?? 0),
          free: formatBytes(s.free_space_on_disk ?? 0),
        })}
      </div>
    </div>
  );
}

export function ConnectionBadge() {
  const { status, label } = useConnection();
  return (
    <Badge variant="outline" className="h-7" title={label}>
      <span
        className={cn(
          "size-1.5 rounded-full",
          status === "connected" ? "bg-success" : status === "firewalled" ? "bg-muted-foreground" : "bg-destructive",
        )}
      />
      {m.connection_short()}
    </Badge>
  );
}
