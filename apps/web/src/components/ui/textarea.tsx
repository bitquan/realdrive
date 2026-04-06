import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-24 w-full rounded-2xl border border-ops-border bg-gradient-to-b from-ops-panel to-[#111a2a] px-4 py-3 text-sm text-ops-text outline-none transition placeholder:text-ops-muted focus:border-ops-primary/40",
        className
      )}
      {...props}
    />
  );
});
