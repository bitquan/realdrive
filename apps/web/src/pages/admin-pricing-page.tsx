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
import { formatDateTime } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

type RateForm = Record<RideType, { baseFare: string; perMile: string; perMinute: string; multiplier: string }>;
type BenchmarkForm = Record<"uber" | "lyft", RateForm>;

function emptyRateForm(): RateForm {
  return {
    standard: { baseFare: "0", perMile: "0", perMinute: "0", multiplier: "1" },
    suv: { baseFare: "0", perMile: "0", perMinute: "0", multiplier: "1" },
    xl: { baseFare: "0", perMile: "0", perMinute: "0", multiplier: "1" }
  };
}

function emptyBenchmarkForm(): BenchmarkForm {
  return {
    uber: emptyRateForm(),
    lyft: emptyRateForm()
  };
}

function parseMoneyLike(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Number(parsed.toFixed(2));
}

function cheaperThanBenchmark(uber: string, lyft: string): string {
  const uberValue = parseMoneyLike(uber);
  const lyftValue = parseMoneyLike(lyft);
  const benchmark = Math.min(uberValue, lyftValue);
  return Math.max(0, Number((benchmark - 0.05).toFixed(2))).toFixed(2);
}

function followBenchmark(uber: string, lyft: string): string {
  const uberValue = parseMoneyLike(uber);
  const lyftValue = parseMoneyLike(lyft);
  return Math.min(uberValue, lyftValue).toFixed(2);
}

export function AdminPricingPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const pricingQuery = useQuery({
    queryKey: ["admin-platform-rates"],
    queryFn: () => api.listPlatformRates(token!)
  });
  const benchmarkQuery = useQuery({
    queryKey: ["admin-platform-rate-benchmarks"],
    queryFn: () => api.listPlatformRateBenchmarks(token!),
    enabled: Boolean(token)
  });
  const autoStatusQuery = useQuery({
    queryKey: ["admin-platform-rates-auto-status"],
    queryFn: () => api.getPlatformRateAutoStatus(token!),
    enabled: Boolean(token)
  });
  const [markets, setMarkets] = useState<Record<string, RateForm>>({});
  const [newMarketKey, setNewMarketKey] = useState("");
  const [benchmarkMarketKey, setBenchmarkMarketKey] = useState("DEFAULT");
  const [benchmarkRates, setBenchmarkRates] = useState<BenchmarkForm>(emptyBenchmarkForm());

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

  useEffect(() => {
    if (!benchmarkMarketKey || !markets[benchmarkMarketKey]) {
      const firstMarket = Object.keys(markets)[0];
      if (firstMarket) {
        setBenchmarkMarketKey(firstMarket);
      }
    }
  }, [benchmarkMarketKey, markets]);

  useEffect(() => {
    if (!benchmarkQuery.data || !benchmarkMarketKey) {
      return;
    }

    const next = emptyBenchmarkForm();

    for (const rule of benchmarkQuery.data.rules) {
      if (rule.marketKey !== benchmarkMarketKey) {
        continue;
      }

      next[rule.provider][rule.rideType] = {
        baseFare: String(rule.baseFare),
        perMile: String(rule.perMile),
        perMinute: String(rule.perMinute),
        multiplier: String(rule.multiplier)
      };
    }

    setBenchmarkRates(next);
  }, [benchmarkMarketKey, benchmarkQuery.data]);

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

  const autoApplyMutation = useMutation({
    mutationFn: () => api.applyPlatformRatesAuto(token!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-platform-rates"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-platform-rates-auto-status"] });
    }
  });

  const saveBenchmarkMutation = useMutation({
    mutationFn: () =>
      api.updatePlatformRateBenchmarks(
        {
          rules: (["uber", "lyft"] as const).flatMap((provider) =>
            (["standard", "suv", "xl"] as RideType[]).map((rideType) => ({
              provider,
              marketKey: benchmarkMarketKey,
              rideType,
              baseFare: Number(benchmarkRates[provider][rideType].baseFare),
              perMile: Number(benchmarkRates[provider][rideType].perMile),
              perMinute: Number(benchmarkRates[provider][rideType].perMinute),
              multiplier: Number(benchmarkRates[provider][rideType].multiplier)
            }))
          )
        },
        token!
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-platform-rate-benchmarks"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-platform-rates-auto-status"] });
    }
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
        <div className="mb-6 rounded-[1.6rem] border border-ops-border-soft/90 bg-ops-surface/72 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ops-text">Auto benchmark mode</p>
              <p className="mt-1 text-sm text-ops-muted">
                {autoStatusQuery.data?.enabled
                  ? `Enabled every ${autoStatusQuery.data.intervalMinutes} min` 
                  : "Disabled (manual trigger only)"}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => autoApplyMutation.mutate()}
              disabled={autoApplyMutation.isPending || !autoStatusQuery.data?.uberFeedConfigured || !autoStatusQuery.data?.lyftFeedConfigured}
            >
              {autoApplyMutation.isPending ? "Applying..." : "Auto-apply now from live feeds"}
            </Button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-ops-border-soft/90 bg-ops-panel/40 p-3 text-sm text-ops-muted">
              Uber feed: {autoStatusQuery.data?.uberFeedConfigured ? "configured" : "missing"}
            </div>
            <div className="rounded-xl border border-ops-border-soft/90 bg-ops-panel/40 p-3 text-sm text-ops-muted">
              Lyft feed: {autoStatusQuery.data?.lyftFeedConfigured ? "configured" : "missing"}
            </div>
            <div className="rounded-xl border border-ops-border-soft/90 bg-ops-panel/40 p-3 text-sm text-ops-muted">
              Undercut amount: ${autoStatusQuery.data?.undercutAmount?.toFixed(2) ?? "0.05"}
            </div>
            <div className="rounded-xl border border-ops-border-soft/90 bg-ops-panel/40 p-3 text-sm text-ops-muted">
              Last run: {autoStatusQuery.data?.lastRunAt ? formatDateTime(autoStatusQuery.data.lastRunAt) : "never"}
            </div>
          </div>

          {autoStatusQuery.data?.lastError ? (
            <p className="mt-3 text-sm text-ops-error">Last auto-run error: {autoStatusQuery.data.lastError}</p>
          ) : null}
          {autoApplyMutation.error ? <p className="mt-3 text-sm text-ops-error">{autoApplyMutation.error.message}</p> : null}
        </div>

        <div className="mb-6 rounded-[1.6rem] border border-ops-border-soft/90 bg-ops-surface/72 p-4">
          <div className="mb-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <div className="space-y-2">
              <Label>Benchmark market</Label>
              <select
                className="h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm"
                value={benchmarkMarketKey}
                onChange={(event) => setBenchmarkMarketKey(event.target.value)}
              >
                {Object.keys(markets).map((marketKey) => (
                  <option key={marketKey} value={marketKey}>
                    {marketKey}
                  </option>
                ))}
              </select>
            </div>
            <Button
              variant="outline"
              onClick={() => saveBenchmarkMutation.mutate()}
              disabled={!benchmarkMarketKey || saveBenchmarkMutation.isPending}
            >
              {saveBenchmarkMutation.isPending ? "Saving..." : "Save benchmark snapshot"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (!benchmarkMarketKey) {
                  return;
                }

                setMarkets((current) => ({
                  ...current,
                  [benchmarkMarketKey]: {
                    standard: {
                      baseFare: cheaperThanBenchmark(
                        benchmarkRates.uber.standard.baseFare,
                        benchmarkRates.lyft.standard.baseFare
                      ),
                      perMile: cheaperThanBenchmark(
                        benchmarkRates.uber.standard.perMile,
                        benchmarkRates.lyft.standard.perMile
                      ),
                      perMinute: cheaperThanBenchmark(
                        benchmarkRates.uber.standard.perMinute,
                        benchmarkRates.lyft.standard.perMinute
                      ),
                      multiplier: followBenchmark(
                        benchmarkRates.uber.standard.multiplier,
                        benchmarkRates.lyft.standard.multiplier
                      )
                    },
                    suv: {
                      baseFare: cheaperThanBenchmark(benchmarkRates.uber.suv.baseFare, benchmarkRates.lyft.suv.baseFare),
                      perMile: cheaperThanBenchmark(benchmarkRates.uber.suv.perMile, benchmarkRates.lyft.suv.perMile),
                      perMinute: cheaperThanBenchmark(
                        benchmarkRates.uber.suv.perMinute,
                        benchmarkRates.lyft.suv.perMinute
                      ),
                      multiplier: followBenchmark(benchmarkRates.uber.suv.multiplier, benchmarkRates.lyft.suv.multiplier)
                    },
                    xl: {
                      baseFare: cheaperThanBenchmark(benchmarkRates.uber.xl.baseFare, benchmarkRates.lyft.xl.baseFare),
                      perMile: cheaperThanBenchmark(benchmarkRates.uber.xl.perMile, benchmarkRates.lyft.xl.perMile),
                      perMinute: cheaperThanBenchmark(benchmarkRates.uber.xl.perMinute, benchmarkRates.lyft.xl.perMinute),
                      multiplier: followBenchmark(benchmarkRates.uber.xl.multiplier, benchmarkRates.lyft.xl.multiplier)
                    }
                  }
                }));
              }}
            >
              Apply Uber/Lyft minus $0.05
            </Button>
          </div>

          {saveBenchmarkMutation.error ? <p className="mt-2 text-sm text-ops-error">{saveBenchmarkMutation.error.message}</p> : null}
          {benchmarkQuery.error ? <p className="mt-2 text-sm text-ops-error">{benchmarkQuery.error.message}</p> : null}

          <div className="grid gap-4 lg:grid-cols-2">
            {(["uber", "lyft"] as const).map((provider) => (
              <div key={provider} className="rounded-[1.45rem] border border-ops-border-soft/90 bg-ops-panel/40 p-4">
                <h4 className="mb-4 text-lg font-semibold capitalize text-ops-text">{provider} benchmark</h4>
                <div className="space-y-4">
                  {(["standard", "suv", "xl"] as RideType[]).map((rideType) => (
                    <div key={`${provider}-${rideType}`}>
                      <p className="mb-2 text-sm font-semibold capitalize text-ops-text">{rideType}</p>
                      <div className="grid gap-3 md:grid-cols-4">
                        {(["baseFare", "perMile", "perMinute", "multiplier"] as const).map((field) => (
                          <div key={`${provider}-${rideType}-${field}`} className="space-y-1">
                            <Label>{field}</Label>
                            <Input
                              value={benchmarkRates[provider][rideType][field]}
                              onChange={(event) =>
                                setBenchmarkRates((current) => ({
                                  ...current,
                                  [provider]: {
                                    ...current[provider],
                                    [rideType]: {
                                      ...current[provider][rideType],
                                      [field]: event.target.value
                                    }
                                  }
                                }))
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

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
