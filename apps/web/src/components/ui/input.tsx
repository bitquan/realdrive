import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-2xl border border-brand-ink/15 bg-white px-4 text-sm text-brand-ink outline-none transition placeholder:text-brand-ink/45 focus:border-brand-copper focus:ring-2 focus:ring-brand-copper/10",
        className
      )}
      {...props}
    />
  )
);

Input.displayName = "Input";
