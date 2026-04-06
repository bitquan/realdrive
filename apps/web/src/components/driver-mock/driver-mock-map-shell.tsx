import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface DriverMockMapShellProps {
  children: ReactNode;
  className?: string;
}

export function DriverMockMapShell({ children, className }: DriverMockMapShellProps) {
  return (
    <section
      className={cn(
        "relative min-h-[calc(100vh-7.5rem)] overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-[0_36px_120px_rgba(2,6,23,0.55)]",
        className
      )}
    >
      <div className="absolute inset-0 bg-slate-900" />

      <svg className="absolute inset-0 h-full w-full opacity-30" aria-hidden="true">
        <defs>
          <pattern id="mock-grid" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M 80 0 L 0 0 0 80" fill="none" stroke="rgb(71, 85, 105)" strokeWidth="0.5" />
          </pattern>
          <pattern id="mock-major-grid" width="240" height="240" patternUnits="userSpaceOnUse">
            <rect width="240" height="240" fill="url(#mock-grid)" />
            <path d="M 240 0 L 0 0 0 240" fill="none" stroke="rgb(100, 116, 139)" strokeWidth="1.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#mock-major-grid)" />
      </svg>

      <div className="absolute left-[9%] top-[14%] h-24 w-32 rounded-sm border border-slate-700/30 bg-slate-800/40" />
      <div className="absolute left-[18%] top-[39%] h-28 w-40 rounded-sm border border-slate-700/30 bg-slate-800/50" />
      <div className="absolute right-[14%] top-[24%] h-32 w-36 rounded-sm border border-slate-700/30 bg-slate-800/40" />
      <div className="absolute bottom-[36%] left-[26%] h-20 w-28 rounded-sm border border-slate-700/30 bg-slate-800/50" />
      <div className="absolute bottom-[43%] right-[19%] h-24 w-32 rounded-sm border border-slate-700/30 bg-slate-800/40" />
      <div className="absolute left-[46%] top-[56%] h-28 w-24 rounded-sm border border-slate-700/30 bg-slate-800/50" />

      <div className="absolute left-0 right-0 top-[35%] h-px bg-gradient-to-r from-transparent via-slate-600/40 to-transparent" />
      <div className="absolute left-0 right-0 top-[60%] h-0.5 bg-gradient-to-r from-transparent via-slate-500/50 to-transparent" />
      <div className="absolute bottom-0 top-0 left-[35%] w-px bg-gradient-to-b from-transparent via-slate-600/40 to-transparent" />
      <div className="absolute bottom-0 top-0 left-[65%] w-0.5 bg-gradient-to-b from-transparent via-slate-500/50 to-transparent" />

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative">
          <div className="absolute h-16 w-16 rounded-full bg-teal-500/20 animate-ping" />
          <div className="absolute left-2 top-2 h-12 w-12 rounded-full bg-teal-500/30" />
          <div className="absolute left-6 top-6 h-4 w-4 rounded-full border-2 border-white bg-teal-400 shadow-lg" />
        </div>
      </div>

      <div className="absolute left-[29%] top-[19%] h-64 w-64 rounded-full bg-cyan-500/5 blur-3xl" />
      <div className="absolute bottom-[18%] right-[24%] h-80 w-80 rounded-full bg-teal-500/5 blur-3xl" />

      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-slate-950/30 via-transparent to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-slate-950/55 via-slate-950/10 to-transparent" />

      <div className="relative z-10 flex min-h-[calc(100vh-7.5rem)] flex-col justify-between p-4 md:p-6">
        {children}
      </div>
    </section>
  );
}
