import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FormLayout({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("space-y-4", className)}>{children}</div>;
}

export function FormField({
  label,
  htmlFor,
  hint,
  children,
  className
}: {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-ops-text">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-ops-muted">{hint}</p> : null}
    </div>
  );
}

export function FormActions({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("flex flex-wrap gap-2", className)}>{children}</div>;
}
