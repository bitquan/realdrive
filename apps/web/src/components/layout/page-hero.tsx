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
    <section className={cn("rounded-[2rem] border border-brand-ink/10 bg-white/90 p-5 shadow-soft md:p-8", className)}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="max-w-3xl">
          {eyebrow ? (
            <Badge className="gap-2 border-brand-moss/20 bg-brand-mist">
              {Icon ? <Icon className="h-4 w-4" /> : null}
              {eyebrow}
            </Badge>
          ) : null}
          <h1 className={cn("font-extrabold tracking-tight", eyebrow ? "mt-4 text-[2rem] leading-tight md:mt-5 md:text-5xl" : "text-3xl md:text-4xl")}>
            {title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-brand-ink/60 md:text-base">{description}</p>
        </div>
        {aside ? <div className="w-full max-w-sm">{aside}</div> : null}
      </div>
    </section>
  );
}
