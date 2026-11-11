import type { LucideIcon } from "lucide-react";
import { m } from "@/paraglide/messages.js";
import { PageHeader } from "./page-header";

/** Areas that follow in later milestones (docs/spec.md) keep their place in the navigation. */
export function ComingSoon({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <>
      <PageHeader crumbs={[title]} title={title} />
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 pb-24 text-center">
        <div className="flex size-10 items-center justify-center rounded-lg border">
          <Icon className="size-5" aria-hidden />
        </div>
        <h2 className="font-semibold">{m.coming_soon_title()}</h2>
        <p className="max-w-sm text-muted-foreground text-sm">{m.coming_soon_text()}</p>
      </div>
    </>
  );
}
