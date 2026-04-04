import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calculator, Globe2, MapPinned, Route } from "lucide-react";
import type { RideType } from "@shared/contracts";
import {
  MetricCard,
  MetricStrip,
  PanelSection,
  SurfaceHeader
} from "@/components/layout/ops-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";

type RateForm = Record<RideType, { baseFare: string; perMile: string; perMinute: string; multiplier: string }>;

function emptyRateForm(): RateForm {
  return {
    standard: { baseFare: "0", perMile: "0", perMinute: "0", multiplier: "1" },
    suv: { baseFare: "0", perMile: "0", perMinute: "0", multiplier: "1" },
    xl: { baseFare: "0", perMile: "0", perMinute: "0", multiplier: "1" }
  };
}

export function AdminPricingPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const pricingQuery = useQuery({
    queryKey: ["admin-platform-rates"],
    queryFn: () => api.listPlatformRates(token!)
  });
  const [markets, setMarkets] = useState<Record<string, RateForm>>({});
  const [newMarketKey, setNewMarketKey] = useState("");

  useEffect(() => {
    if (!pricingQuery.data) {
      return;
    }

    const next: Record<string, RateForm> = {};
    for (const rule of pricingQuery.data) {
      next[rule.marketKey] ??= emptyRateForm();
      next[rule.marketKey][rule.rideType] = {
        baseFare: String(rule.baseFare),
        perMile: String(rule.perMile),
        perMinute: String(rule.perMinute),
        multiplier: String(rule.multiplier)
      };
    }

    if (!next.DEFAULT) {
      next.DEFAULT = emptyRateForm();
    }

    setMarkets(next);
  }, [pricingQuery.data]);

  const updateMutation = useMutation({
    mutationFn: () =>
      api.updatePlatformRates(
        {
          rules: Object.entries(markets).flatMap(([marketKey, rateForm]) =>
            (Object.keys(rateForm) as RideType[]).map((rideType) => ({
              marketKey,
              rideType,
              baseFare: Number(rateForm[rideType].baseFare),
              perMile: Number(rateForm[rideType].perMile),
              perMinute: Number(rateForm[rideType].perMinute),
              multiplier: Number(rateForm[rideType].multiplier)
            }))
          )
        },
        token!
      ),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-platform-rates"] })
  });

  const marketCount = Object.keys(markets).length;
  const defaultRuleCount = useMemo(() => Object.values(markets.DEFAULT ?? {}).length, [markets]);

  return (
    <div className="space-y-6">
      <SurfaceHeader
        eyebrow="Pricing"
        title="Tune real market rate cards without inventing new modules"
        description="State-based market pricing already exists in the product. This surface now treats it like a first-class admin tool instead of a buried utility form."
      />

      <MetricStrip>
        <MetricCard label="Markets" value={marketCount} meta="Includes DEFAULT fallback" icon={Globe2} tone="primary" />
        <MetricCard label="Default ride types" value={defaultRuleCount} meta="Standard, SUV, and XL fallback rules" icon={Route} />
        <MetricCard label="Editable rules" value={marketCount * 3} meta="One row per market and ride type" icon={Calculator} />
        <MetricCard label="Market add flow" value={newMarketKey || "Ready"} meta="Add real pickup-state rate keys" icon={MapPinned} />
      </MetricStrip>

      <PanelSection title="Market rate cards" description="Configure state-based pricing and keep DEFAULT as the fallback for unmatched pickups.">
        <div className="mb-6 flex flex-col gap-3 rounded-[1.6rem] border border-ops-border-soft/90 bg-ops-surface/72 p-4 md:flex-row md:items-end">
          <div className="flex-1 space-y-2">
            <Label>Add market key</Label>
            <Input
              value={newMarketKey}
              onChange={(event) => setNewMarketKey(event.target.value.toUpperCase())}
              placeholder="VA"
              maxLength={10}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => {
              if (!newMarketKey || markets[newMarketKey]) {
                return;
              }
              setMarkets((current) => ({
                ...current,
                [newMarketKey]: emptyRateForm()
              }));
              setNewMarketKey("");
            }}
          >
            Add market
          </Button>
        </div>

        <div className="space-y-5">
          {Object.entries(markets).map(([marketKey, rateForm]) => (
            <div key={marketKey} className="rounded-[1.8rem] border border-ops-border-soft/90 bg-ops-surface/72 p-5">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ops-muted">Market key</p>
                  <h3 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-ops-text">{marketKey}</h3>
                </div>
                {marketKey !== "DEFAULT" ? (
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setMarkets((current) => {
                        const next = { ...current };
                        delete next[marketKey];
                        return next;
                      })
                    }
                  >
                    Remove
                  </Button>
                ) : null}
              </div>

              <div className="space-y-4">
                {(Object.keys(rateForm) as RideType[]).map((rideType) => (
                  <div key={`${marketKey}-${rideType}`} className="rounded-[1.45rem] border border-ops-border-soft/90 bg-ops-panel/40 p-4">
                    <h4 className="mb-4 text-lg font-semibold capitalize text-ops-text">{rideType}</h4>
                    <div className="grid gap-4 xl:grid-cols-4">
                      <div className="space-y-2">
                        <Label>Base fare</Label>
                        <Input
                          value={rateForm[rideType].baseFare}
                          onChange={(event) =>
                            setMarkets((current) => ({
                              ...current,
                              [marketKey]: {
                                ...current[marketKey],
                                [rideType]: { ...current[marketKey][rideType], baseFare: event.target.value }
                              }
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Per mile</Label>
                        <Input
                          value={rateForm[rideType].perMile}
                          onChange={(event) =>
                            setMarkets((current) => ({
                              ...current,
                              [marketKey]: {
                                ...current[marketKey],
                                [rideType]: { ...current[marketKey][rideType], perMile: event.target.value }
                              }
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Per minute</Label>
                        <Input
                          value={rateForm[rideType].perMinute}
                          onChange={(event) =>
                            setMarkets((current) => ({
                              ...current,
                              [marketKey]: {
                                ...current[marketKey],
                                [rideType]: { ...current[marketKey][rideType], perMinute: event.target.value }
                              }
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Multiplier</Label>
                        <Input
                          value={rateForm[rideType].multiplier}
                          onChange={(event) =>
                            setMarkets((current) => ({
                              ...current,
                              [marketKey]: {
                                ...current[marketKey],
                                [rideType]: { ...current[marketKey][rideType], multiplier: event.target.value }
                              }
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {updateMutation.error ? <p className="mt-5 text-sm text-ops-error">{updateMutation.error.message}</p> : null}
        <div className="mt-6">
          <Button onClick={() => updateMutation.mutate()}>Save platform rates</Button>
        </div>
      </PanelSection>
    </div>
  );
}
