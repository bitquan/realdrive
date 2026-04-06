import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RIDER_FEATURE_ITEMS, type RiderFeatureContext, type RiderFeatureItem } from "@/components/rider-home/rider-feature-catalog";

function phaseLabel(item: RiderFeatureItem) {
  if (item.phase === "live-now") {
    return "Live";
  }

  if (item.phase === "phase-2") {
    return "Phase 2";
  }

  return "Phase 3";
}

function requestPath(item: RiderFeatureItem, contextPath: string) {
  const summary = item.requestSummary ?? `Support ${item.title} in the rider app`;
  return `/request-feature?source=rider_app&contextPath=${encodeURIComponent(contextPath)}&summary=${encodeURIComponent(summary)}`;
}

export function RiderFeatureGrid({
  context,
  contextPath,
  canRequest,
  compact = false,
  title = "Rider features",
  description = "Real rider tools stay live. Future rider tools stay clearly marked and route into feature intake instead of acting like fake flows."
}: {
  context: RiderFeatureContext;
  contextPath: string;
  canRequest: boolean;
  compact?: boolean;
  title?: string;
  description?: string;
}) {
  return (
    <div className={cn("rounded-[1.45rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.78),rgba(9,14,23,0.92))] shadow-[0_20px_48px_rgba(2,6,23,0.28)]", compact ? "p-3" : "p-4") }>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{title}</p>
          <p className={cn("mt-1 text-slate-300", compact ? "text-[11px] leading-4" : "text-xs leading-5")}>{description}</p>
        </div>
        <Badge className="border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] text-slate-200 normal-case tracking-[0.02em]">Mock phase</Badge>
      </div>

      <div className={cn("mt-3 grid grid-cols-4", compact ? "gap-2" : "gap-2.5")}>
        {RIDER_FEATURE_ITEMS.map((item) => {
          const Icon = item.icon;
          const live = item.status === "live";
          const to = live ? item.livePath[context] : canRequest ? requestPath(item, contextPath) : "/rider/login";

          return (
            <Link
              key={item.id}
              to={to}
              className={cn(
                "rounded-[1.15rem] border px-2.5 py-3 transition",
                live
                  ? "border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.1]"
                  : "border-white/8 bg-white/[0.025] text-slate-300 opacity-80 hover:bg-white/[0.05]"
              )}
            >
              <div className={cn("flex items-center justify-center rounded-[0.95rem] border", live ? "border-white/8 bg-slate-950/72 text-teal-300" : "border-white/6 bg-slate-950/52 text-slate-500", compact ? "mx-auto h-9 w-9" : "mx-auto h-10 w-10")}>
                <Icon className={compact ? "h-4 w-4" : "h-4.5 w-4.5"} />
              </div>
              <p className={cn("mt-2 text-center font-semibold", compact ? "text-[11px]" : "text-[11.5px]")}>{item.title}</p>
              <p className="mt-0.5 text-center text-[10px] leading-3.5 text-slate-400">{item.subtitle}</p>
              <div className="mt-2 flex justify-center">
                <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em]", live ? "border-teal-400/18 bg-teal-400/10 text-teal-200" : "border-white/8 bg-white/[0.03] text-slate-400")}>
                  {live ? phaseLabel(item) : `Coming soon · ${phaseLabel(item)}`}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
