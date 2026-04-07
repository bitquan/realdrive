import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { ShellAction } from "@/lib/shell";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function actionClassName(variant: ShellAction["variant"] = "secondary") {
  if (variant === "primary") {
    return "border-ops-primary/45 bg-ops-primary text-white shadow-glow hover:bg-[#6887ff]";
  }

  if (variant === "ghost") {
    return "border-transparent bg-transparent text-ops-muted hover:border-ops-border-soft hover:bg-ops-panel/72 hover:text-ops-text";
  }

  return "border-ops-border bg-[linear-gradient(180deg,rgba(21,26,34,0.96),rgba(12,15,21,0.96))] text-ops-text hover:border-ops-primary/35 hover:bg-ops-panel";
}

export function SurfaceHeader({
  eyebrow,
  title,
  description,
  actions,
  aside,
  className
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ShellAction[];
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-[2rem] border border-ops-border-soft/95 bg-[linear-gradient(180deg,rgba(13,17,23,0.98),rgba(9,12,17,0.98))] p-4 shadow-panel md:rounded-5xl md:p-7", className)}>
      <div className="flex flex-col gap-4 md:gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          {eyebrow ? <Badge className="border-ops-border-soft bg-ops-panel/92 px-2.5 py-1 text-[11px] md:px-3 md:py-1.5">{eyebrow}</Badge> : null}
          <h2 className="mt-3 text-[1.45rem] font-extrabold tracking-[-0.04em] text-ops-text md:mt-4 md:text-[2.5rem]">{title}</h2>
          {description ? <p className="mt-2 max-w-2xl text-sm leading-5 text-ops-muted md:mt-3 md:text-base md:leading-6">{description}</p> : null}
          {actions?.length ? (
            <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap sm:gap-2.5 md:mt-5">
              {actions.map((action) => {
                const Icon = action.icon;

                return (
                  <Link
                    key={`${action.to}-${action.label}`}
                    to={action.to}
                    className={cn(
                      "inline-flex h-10 items-center justify-center rounded-2xl border px-3.5 text-sm font-semibold transition sm:h-11 sm:px-4",
                      actionClassName(action.variant)
                    )}
                  >
                    {Icon ? <Icon className="mr-2 h-4 w-4" /> : null}
                    {action.label}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>
        {aside ? <div className="w-full max-w-[24rem]">{aside}</div> : null}
      </div>
    </section>
  );
}

export function MetricStrip({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-4", className)}>{children}</div>;
}

export function MetricCard({
  label,
  value,
  meta,
  icon: Icon,
  tone = "default",
  className
}: {
  label: string;
  value: ReactNode;
  meta?: ReactNode;
  icon?: LucideIcon;
  tone?: "default" | "primary" | "success" | "warning" | "danger";
  className?: string;
}) {
  const toneClassName =
    tone === "primary"
      ? "border-ops-primary/28"
      : tone === "success"
        ? "border-ops-success/28"
        : tone === "warning"
          ? "border-ops-warning/28"
          : tone === "danger"
            ? "border-ops-destructive/28"
            : "border-ops-border-soft/95";

  return (
    <Card className={cn("overflow-hidden", toneClassName, className)}>
      <CardContent className="flex min-h-[8.35rem] flex-col justify-between p-4 md:min-h-[9.75rem] md:p-6">
        <div className="flex items-start justify-between gap-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ops-muted">{label}</p>
          {Icon ? (
            <div className="rounded-2xl border border-ops-border-soft bg-ops-panel/85 p-2 text-ops-muted md:p-2.5">
              <Icon className="h-4 w-4" />
            </div>
          ) : null}
        </div>
        <div>
          <p className="text-[1.85rem] font-extrabold tracking-[-0.045em] text-ops-text md:text-[2.8rem]">{value}</p>
          {meta ? <p className="mt-1.5 text-[13px] leading-5 text-ops-muted md:mt-2 md:text-sm">{meta}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function PanelSection({
  title,
  description,
  actions,
  children,
  className,
  contentClassName
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-col gap-3 border-b border-ops-border-soft/80 pb-3.5 md:gap-4 md:pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription className="mt-1.5 md:mt-2">{description}</CardDescription> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </CardHeader>
      <CardContent className={cn("pt-4 md:pt-5", contentClassName)}>{children}</CardContent>
    </Card>
  );
}

export function EntityList({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("space-y-2.5 md:space-y-3", className)}>{children}</div>;
}

export function EntityListItem({
  active,
  onClick,
  children,
  className
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  const Comp = onClick ? "button" : "div";

  return (
    <Comp
      {...(onClick ? { type: "button", onClick } : {})}
      className={cn(
        "w-full rounded-[1.25rem] border px-3.5 py-3 text-left transition md:rounded-[1.4rem] md:px-4",
        active
          ? "border-ops-primary/35 bg-ops-panel text-ops-text shadow-soft"
          : "border-ops-border-soft/90 bg-ops-surface/72 text-ops-text hover:border-ops-border hover:bg-ops-panel/72",
        className
      )}
    >
      {children}
    </Comp>
  );
}

export function MapPanel({
  title,
  meta,
  children,
  footer,
  className
}: {
  title: string;
  meta?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="border-b border-ops-border-soft/80 pb-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>{title}</CardTitle>
            {meta ? <CardDescription className="mt-2">{meta}</CardDescription> : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        {children}
        {footer ? <div className="border-t border-ops-border-soft/80 pt-4">{footer}</div> : null}
      </CardContent>
    </Card>
  );
}

export function BottomActionBar({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "sticky bottom-[5.4rem] z-20 rounded-[1.7rem] border border-ops-border bg-[linear-gradient(180deg,rgba(18,22,29,0.98),rgba(11,14,20,0.98))] px-3 py-3 shadow-elevated backdrop-blur md:bottom-5 md:px-4",
        className
      )}
    >
      <div className="flex flex-wrap gap-2.5">{children}</div>
    </div>
  );
}

export function DataField({
  label,
  value,
  subtle,
  className
}: {
  label: string;
  value: ReactNode;
  subtle?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-[1.2rem] border border-ops-border-soft/90 bg-ops-panel/45 p-3.5 md:rounded-[1.35rem] md:p-4", className)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ops-muted">{label}</p>
      <div className="mt-2.5 text-base font-semibold leading-6 text-ops-text md:mt-3 md:leading-7">{value}</div>
      {subtle ? <div className="mt-1.5 text-sm leading-5 text-ops-muted md:mt-2 md:leading-6">{subtle}</div> : null}
    </div>
  );
}

export function ListRowLink({
  to,
  title,
  description,
  badge,
  meta,
  className
}: {
  to: string;
  title: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center justify-between gap-4 rounded-[1.4rem] border border-ops-border-soft/90 bg-ops-surface/72 px-4 py-4 transition hover:border-ops-border hover:bg-ops-panel/72",
        className
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-ops-text">{title}</p>
          {badge}
        </div>
        {description ? <p className="mt-1.5 text-sm text-ops-muted">{description}</p> : null}
        {meta ? <p className="mt-2 text-xs uppercase tracking-[0.18em] text-ops-muted">{meta}</p> : null}
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-ops-muted" />
    </Link>
  );
}
