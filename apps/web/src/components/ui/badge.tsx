import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-brand-ink/10 bg-brand-sand px-3 py-1 text-xs font-semibold text-brand-ink/75",
        className
      )}
      {...props}
    />
  );
}
