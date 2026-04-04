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
}

export function PageHero({
  title,
  description,
  eyebrow,
  icon: Icon,
  aside,
  className
}: PageHeroProps) {
  return (
    <section
      className={cn(
        "rounded-5xl border border-ops-border-soft/95 bg-[linear-gradient(180deg,rgba(13,17,23,0.98),rgba(9,12,17,0.98))] p-5 shadow-elevated md:p-7",
        className
      )}
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="max-w-3xl">
          {eyebrow ? (
            <Badge className="gap-2 border-ops-border-soft bg-ops-panel/92 text-ops-muted">
              {Icon ? <Icon className="h-4 w-4" /> : null}
              {eyebrow}
            </Badge>
          ) : null}
          <h1
            className={cn(
              "font-extrabold tracking-[-0.035em] text-ops-text",
              eyebrow ? "mt-4 text-[1.8rem] leading-[1.02] md:mt-5 md:text-[3.35rem]" : "text-[1.95rem] leading-[1.04] md:text-[2.85rem]"
            )}
          >
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ops-muted md:text-[0.98rem]">{description}</p>
        </div>
        {aside ? <div className="w-full max-w-[22rem]">{aside}</div> : null}
      </div>
    </section>
  );
}
