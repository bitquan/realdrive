import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PageHeroProps {
  title: string;
  description: string;
  eyebrow?: string;
  icon?: LucideIcon;
  aside?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function PageHero({
  title,
  description,
  eyebrow,
  icon: Icon,
  aside,
  className,
  compact = false
}: PageHeroProps) {
  return (
    <section
      className={cn(
        "rounded-5xl border border-ops-border-soft/95 bg-[linear-gradient(180deg,rgba(13,17,23,0.98),rgba(9,12,17,0.98))] shadow-elevated",
        compact ? "p-4 md:p-6" : "p-5 md:p-7",
        className
      )}
    >
      <div className={cn("flex flex-col md:flex-row md:items-start md:justify-between", compact ? "gap-3.5 md:gap-5" : "gap-5")}>
        <div className="max-w-3xl">
          {eyebrow ? (
            <Badge className={cn("gap-2 border-ops-border-soft bg-ops-panel/92 text-ops-muted", compact && "px-2.5 py-1 text-[11px]")}>
              {Icon ? <Icon className="h-4 w-4" /> : null}
              {eyebrow}
            </Badge>
          ) : null}
          <h1
            className={cn(
              "font-extrabold tracking-[-0.035em] text-ops-text",
              eyebrow
                ? compact
                  ? "mt-3 text-[1.45rem] leading-[1.02] md:mt-4 md:text-[2.6rem]"
                  : "mt-4 text-[1.8rem] leading-[1.02] md:mt-5 md:text-[3.35rem]"
                : compact
                  ? "text-[1.55rem] leading-[1.04] md:text-[2.35rem]"
                  : "text-[1.95rem] leading-[1.04] md:text-[2.85rem]"
            )}
          >
            {title}
          </h1>
          <p className={cn("max-w-2xl text-sm text-ops-muted md:text-[0.98rem]", compact ? "mt-2 leading-5.5 md:leading-6" : "mt-3 leading-6")}>{description}</p>
        </div>
        {aside ? <div className="w-full max-w-[22rem]">{aside}</div> : null}
      </div>
    </section>
  );
}
