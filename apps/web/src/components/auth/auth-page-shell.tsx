import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type AuthHighlight = {
  title: string;
  description: string;
  icon?: LucideIcon;
};

export function AuthPageShell({
  eyebrow,
  title,
  description,
  highlights,
  helper,
  children,
  className
}: {
  eyebrow: string;
  title: string;
  description: string;
  highlights: AuthHighlight[];
  helper?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-5 md:gap-6 lg:grid-cols-[0.98fr_1.02fr]", className)}>
      <section className="rounded-[2rem] border border-ops-border-soft bg-[linear-gradient(180deg,rgba(13,17,23,0.98),rgba(9,12,17,0.98))] p-5 shadow-elevated md:p-8">
        <Badge className="border-ops-border-soft bg-ops-panel/92 text-ops-muted">{eyebrow}</Badge>
        <h1 className="mt-4 text-[2rem] font-extrabold tracking-[-0.04em] text-ops-text md:text-[3rem]">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ops-muted md:text-base">{description}</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {highlights.map((highlight) => {
            const Icon = highlight.icon ?? BadgeCheck;
            return (
              <div
                key={highlight.title}
                className="rounded-[1.6rem] border border-ops-border-soft/90 bg-ops-panel/55 p-4 shadow-soft"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl border border-ops-border-soft bg-ops-surface/90 p-2.5 text-ops-primary">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-ops-text">{highlight.title}</p>
                    <p className="mt-1.5 text-sm leading-6 text-ops-muted">{highlight.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {helper ? <div className="mt-5">{helper}</div> : null}
      </section>

      <div className="min-w-0">{children}</div>
    </div>
  );
}
