import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface DriverMockFloatingPillProps {
  children: ReactNode;
  accent?: "teal" | "slate";
  className?: string;
}

export function DriverMockFloatingPill({
  children,
  accent = "slate",
  className
}: DriverMockFloatingPillProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border px-4 py-2.5 shadow-xl backdrop-blur-xl",
        accent === "teal"
          ? "border-teal-500/30 bg-slate-900/90 text-white"
          : "border-slate-700/50 bg-slate-900/80 text-white",
        className
      )}
    >
      {children}
    </div>
  );
}
