import { m } from "@/paraglide/messages.js";
import type { StatusFilter, StatusKind } from "./torrents";

export function statusLabel(filter: StatusFilter): string {
  switch (filter) {
    case "all":
      return m.filter_all();
    case "downloading":
      return m.filter_downloading();
    case "seeding":
      return m.filter_seeding();
    case "stopped":
      return m.filter_stopped();
    case "errored":
      return m.filter_errored();
    case "completed":
      return m.filter_completed();
    case "running":
      return m.filter_running();
    case "active":
      return m.filter_active();
    case "inactive":
      return m.filter_inactive();
    case "stalled":
      return m.filter_stalled();
    case "stalled_uploading":
      return m.filter_stalled_uploading();
    case "stalled_downloading":
      return m.filter_stalled_downloading();
    case "checking":
      return m.filter_checking();
    case "moving":
      return m.filter_moving();
  }
}

export function kindLabel(kind: StatusKind): string {
  switch (kind) {
    case "downloading":
      return m.state_downloading();
    case "metadata":
      return m.state_metadata();
    case "stalled":
      return m.state_stalled();
    case "queued":
      return m.state_queued();
    case "checking":
      return m.state_checking();
    case "seeding":
      return m.state_seeding();
    case "stopped":
      return m.state_stopped();
    case "moving":
      return m.state_moving();
    case "missing":
      return m.state_missing();
    case "error":
      return m.state_error();
  }
}
