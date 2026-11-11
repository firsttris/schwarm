import { PlusIcon } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import { useMaindata } from "@/api/queries";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { openAddDialog } from "@/lib/add-dialog";
import { formatSpeed } from "@/lib/format";
import { m } from "@/paraglide/messages.js";
import { ConnectionBadge } from "./connection";
import { SpeedMenu } from "./speed-menu";

export function PhoneSpeeds() {
  const { data } = useMaindata();
  const s = data?.serverState ?? {};
  return (
    <span className="text-muted-foreground text-[13px] tabular-nums">
      ↓ {formatSpeed(s.dl_info_speed ?? 0)} · ↑ {formatSpeed(s.up_info_speed ?? 0)}
    </span>
  );
}

/**
 * The header of a page: on the desktop the bar with sidebar toggle, breadcrumb, speeds and
 * "Hinzufügen" (docs/mockup/Main.dc.html); on the phone a large title with the speeds
 * (PhoneListe.dc.html). `phoneExtra` goes below the phone title (e.g. the status tabs).
 */
export function PageHeader({
  crumbs,
  title,
  phoneExtra,
  phoneActions,
}: {
  crumbs: string[];
  title: string;
  phoneExtra?: ReactNode;
  phoneActions?: ReactNode;
}) {
  return (
    <>
      <header className="sticky top-0 z-10 hidden h-[52px] shrink-0 items-center gap-2 rounded-t-xl border-b bg-background px-4 md:flex">
        <SidebarTrigger className="-ml-1" aria-label={m.toggle_sidebar()} />
        <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            {crumbs.map((crumb, i) => (
              <Fragment key={crumb}>
                {i > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {i === crumbs.length - 1 ? <BreadcrumbPage>{crumb}</BreadcrumbPage> : <span>{crumb}</span>}
                </BreadcrumbItem>
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
        <div className="ml-auto flex items-center gap-2">
          <SpeedMenu />
          <Button size="sm" onClick={() => openAddDialog()}>
            <PlusIcon />
            {m.add()}
          </Button>
        </div>
      </header>
      <header className="flex flex-col gap-3.5 px-4 pt-5 pb-3 md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h1 className="font-semibold text-[22px] tracking-tight">{title}</h1>
            <PhoneSpeeds />
          </div>
          <div className="flex items-center gap-2">
            {phoneActions}
            <ConnectionBadge />
            <Button size="icon" className="size-11" aria-label={m.add_torrent()} onClick={() => openAddDialog()}>
              <PlusIcon />
            </Button>
          </div>
        </div>
        {phoneExtra}
      </header>
    </>
  );
}
