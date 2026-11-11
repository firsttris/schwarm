import { BoxIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** The app mark: a neutral tile, as in the mockup (no brand colour). */
export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground",
        className,
      )}
    >
      <BoxIcon className="size-4" aria-hidden />
    </span>
  );
}
