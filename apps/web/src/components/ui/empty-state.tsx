import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  icon: Icon,
  className
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div className={cn("rounded-[1.4rem] border border-dashed border-ops-border p-6 text-sm text-ops-muted", className)}>
      {Icon ? <Icon className="mb-3 h-4 w-4 text-ops-muted" /> : null}
      <p className="font-semibold text-ops-text">{title}</p>
      {description ? <p className="mt-2 leading-6">{description}</p> : null}
    </div>
  );
}
