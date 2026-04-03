import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RideType } from "@shared/contracts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform market rates</CardTitle>
        <CardDescription>Configure state-based market pricing and keep `DEFAULT` as the fallback for unmatched pickups.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-3 rounded-4xl border border-brand-ink/10 p-4 md:flex-row md:items-end">
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

        {Object.entries(markets).map(([marketKey, rateForm]) => (
          <div key={marketKey} className="rounded-4xl border border-brand-ink/10 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">{marketKey}</h3>
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
                <div key={`${marketKey}-${rideType}`} className="rounded-4xl border border-brand-ink/10 p-4">
                  <h4 className="mb-4 font-semibold capitalize">{rideType}</h4>
                  <div className="grid gap-4 md:grid-cols-4">
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

        {updateMutation.error ? <p className="text-sm text-red-600">{updateMutation.error.message}</p> : null}
        <Button onClick={() => updateMutation.mutate()}>Save platform rates</Button>
      </CardContent>
    </Card>
  );
}
