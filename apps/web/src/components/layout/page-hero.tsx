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
    <section className={cn("rounded-4xl border border-ops-border-soft/90 bg-gradient-to-b from-ops-surface to-[#0d1523] p-4 shadow-elevated md:p-7", className)}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="max-w-3xl">
          {eyebrow ? (
            <Badge className="gap-2 border-ops-border bg-ops-panel/85 text-ops-muted">
              {Icon ? <Icon className="h-4 w-4" /> : null}
              {eyebrow}
            </Badge>
          ) : null}
          <h1 className={cn("font-extrabold tracking-tight text-ops-text", eyebrow ? "mt-3 text-[1.75rem] leading-tight md:mt-5 md:text-[3.35rem]" : "text-[1.85rem] md:text-[2.7rem]")}>
            {title}
          </h1>
          <p className="mt-2.5 max-w-2xl text-sm leading-5.5 text-ops-muted md:mt-3 md:leading-6 md:text-[0.96rem]">{description}</p>
        </div>
        {aside ? <div className="w-full max-w-[22rem]">{aside}</div> : null}
      </div>
    </section>
  );
}
