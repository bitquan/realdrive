import { DataField } from "@/components/layout/ops-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";

export interface DriverEarningsMiniProps {
  projectedTotal: number;
  jobsInFlow: number;
}

export function DriverEarningsMini({ projectedTotal, jobsInFlow }: DriverEarningsMiniProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Projected live earnings</CardTitle>
        <CardDescription>Quick visibility for the work already in motion.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <DataField label="Projected total" value={formatMoney(projectedTotal)} subtle="Active trips plus the current top offer" />
        <DataField label="Jobs in flow" value={jobsInFlow} subtle="Accepted rides plus the current live offer" />
      </CardContent>
    </Card>
  );
}
