import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface DriverMockBottomSheetProps {
  children: ReactNode;
  className?: string;
}

export function DriverMockBottomSheet({ children, className }: DriverMockBottomSheetProps) {
  return (
    <div className={cn("mx-auto w-full max-w-xl", className)}>
      <div className="overflow-hidden rounded-[1.9rem] border border-slate-700/50 bg-slate-900/95 shadow-2xl backdrop-blur-xl">
        <div className="flex justify-center pb-2 pt-3">
          <div className="h-1 w-10 rounded-full bg-slate-700" />
        </div>
        <div className="px-5 pb-4">{children}</div>
      </div>
    </div>
  );
}
