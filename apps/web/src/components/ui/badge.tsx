import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-ops-border bg-ops-panel/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ops-muted",
        className
      )}
      {...props}
    />
  );
}
