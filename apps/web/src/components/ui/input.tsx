import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-xl border border-ops-border/90 bg-gradient-to-b from-ops-panel to-[#111a2a] px-3.5 text-sm text-ops-text shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] outline-none transition placeholder:text-ops-muted/80 focus:border-ops-primary/70 focus:ring-2 focus:ring-ops-primary/20",
        className
      )}
      {...props}
    />
  )
);

Input.displayName = "Input";
