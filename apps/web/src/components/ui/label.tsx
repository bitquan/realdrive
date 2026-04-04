import type { LabelHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("text-[11px] font-semibold uppercase tracking-[0.18em] text-ops-muted", className)}
      {...props}
    />
  );
}
