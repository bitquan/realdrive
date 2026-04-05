import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";

export interface DriverToolsSectionProps {
  open: boolean;
  onToggle: () => void;
  outstandingTotal: number;
  children: ReactNode;
}

export function DriverToolsSection({
  open,
  onToggle,
  outstandingTotal,
  children
}: DriverToolsSectionProps) {
  return (
    <Card className="overflow-hidden border-ops-border-soft/95 bg-[linear-gradient(180deg,rgba(12,16,22,0.98),rgba(8,11,16,0.96))] shadow-panel">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Driver tools</CardTitle>
            <CardDescription className="mt-2">Account and platform tools stay available, but no longer crowd the live work surface.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-ops-border-soft bg-ops-panel/75 text-ops-text">Dues {formatMoney(outstandingTotal)}</Badge>
            <Button variant="outline" onClick={onToggle}>{open ? "Hide tools" : "Open tools"}</Button>
          </div>
        </div>
      </CardHeader>
      {open ? <CardContent className="space-y-6">{children}</CardContent> : null}
    </Card>
  );
}
