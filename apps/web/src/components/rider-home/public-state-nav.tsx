import { Compass, LayoutGrid, Map, UserRound } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const publicStateItems = [
  {
    id: "home",
    label: "Home",
    description: "Overview",
    to: "/",
    icon: LayoutGrid
  },
  {
    id: "book",
    label: "Book",
    description: "Ride now",
    to: "/book",
    icon: Compass
  },
  {
    id: "rider",
    label: "Rider",
    description: "Tools",
    to: "/rider",
    icon: UserRound
  },
  {
    id: "more",
    label: "More",
    description: "Access",
    to: "/more",
    icon: Map
  }
];

function isActive(pathname: string, to: string) {
  if (to === "/") {
    return pathname === "/";
  }

  return pathname === to;
}

export function PublicStateNav() {
  const location = useLocation();

  return (
    <>
      <div className="hidden rounded-[1.6rem] border border-ops-border-soft bg-[linear-gradient(180deg,rgba(14,18,27,0.96),rgba(9,13,20,0.98))] p-2 shadow-panel md:block">
        <div className="grid grid-cols-4 gap-2">
          {publicStateItems.map((item) => {
            const active = isActive(location.pathname, item.to);
            const Icon = item.icon;

            return (
              <Link
                key={item.id}
                to={item.to}
                  className={cn(
                    "rounded-[1.15rem] border px-3 py-3 text-left transition",
                  active
                      ? "border-ops-primary/40 bg-[linear-gradient(180deg,rgba(54,91,255,0.22),rgba(54,91,255,0.1))] text-white shadow-[0_14px_26px_rgba(54,91,255,0.12)]"
                      : "border-white/8 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className={cn("h-4 w-4", active ? "text-white" : "text-slate-400")} />
                  <p className="text-sm font-semibold">{item.label}</p>
                </div>
                <p className={cn("mt-1 text-[11px] leading-4", active ? "text-white/80" : "text-slate-500")}>{item.description}</p>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(4.2rem+env(safe-area-inset-bottom))] z-30 px-3 md:hidden">
        <div className="mx-auto max-w-md rounded-[1.45rem] border border-white/10 bg-[linear-gradient(180deg,rgba(11,15,23,0.95),rgba(8,12,18,0.98))] p-1.5 shadow-[0_24px_48px_rgba(2,6,23,0.3)] backdrop-blur-2xl">
          <div className="mx-auto mb-1.5 h-1 w-10 rounded-full bg-white/10" />
          <div className="grid grid-cols-4 gap-1.5">
            {publicStateItems.map((item) => {
              const active = isActive(location.pathname, item.to);
              const Icon = item.icon;

              return (
                <Link
                  key={`mobile-${item.id}`}
                  to={item.to}
                  className={cn(
                    "rounded-[1.05rem] border px-1.5 py-2.5 text-center transition",
                    active
                      ? "border-white/12 bg-white/[0.08] text-white shadow-[0_12px_24px_rgba(2,6,23,0.16)]"
                      : "border-white/6 bg-white/[0.02] text-slate-300"
                  )}
                >
                  <Icon className={cn("mx-auto h-4 w-4", active ? "text-white" : "text-slate-400")} />
                  <p className="mt-1.5 text-[11px] font-semibold leading-none">{item.label}</p>
                  <span className={cn("mx-auto mt-1 block h-1 rounded-full transition-all", active ? "w-5 bg-ops-primary" : "w-3 bg-white/10")} />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
