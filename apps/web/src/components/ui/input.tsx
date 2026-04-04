import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-2xl border border-ops-border/90 bg-[linear-gradient(180deg,rgba(20,24,31,0.96),rgba(13,16,22,0.96))] px-4 text-base text-ops-text shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] outline-none transition placeholder:text-ops-muted/70 focus:border-ops-primary/70 focus:ring-2 focus:ring-ops-primary/20 md:text-sm",
        className
      )}
      {...props}
    />
  )
);

Input.displayName = "Input";
