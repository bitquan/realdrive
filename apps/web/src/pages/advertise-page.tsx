import { type ReactNode, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Megaphone, Smartphone, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHero } from "@/components/layout/page-hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

async function fileToUpload(file: File) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return {
    fileName: file.name,
    mimeType: file.type,
    contentBase64: window.btoa(binary)
  };
}

function AdvertiseSheet({
  title,
  description,
  children,
  compact = false
}: {
  title: string;
  description: string;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-[1.45rem] border border-white/10 bg-[linear-gradient(180deg,rgba(22,28,39,0.98),rgba(14,19,30,0.99))] shadow-[0_18px_40px_rgba(2,6,23,0.16),inset_0_1px_0_rgba(255,255,255,0.04)] md:rounded-[1.6rem]">
      <div className={cn("border-b border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))]", compact ? "px-3.5 pb-2.5 pt-3 md:px-4 md:pb-3 md:pt-3.5" : "px-4 pb-3 pt-3.5 md:px-5 md:pb-3.5 md:pt-4")}>
        <p className="text-[15px] font-semibold tracking-[-0.02em] text-ops-text">{title}</p>
        <p className="mt-1 text-[13px] leading-5 text-ops-muted">{description}</p>
      </div>
      <div className={cn(compact ? "px-3.5 py-3.5 md:px-4 md:py-4" : "px-4 py-4 md:px-5 md:py-4.5")}>{children}</div>
    </section>
  );
}

function AdvertiseStat({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "primary" | "success" }) {
  return (
    <div
      className={cn(
        "rounded-[1.2rem] border p-3.5",
        tone === "primary"
          ? "border-ops-primary/25 bg-ops-primary/10"
          : tone === "success"
            ? "border-emerald-400/20 bg-emerald-400/10"
            : "border-ops-border-soft bg-ops-surface/65"
      )}
    >
      <p className="text-[10px] uppercase tracking-[0.2em] text-ops-muted">{label}</p>
      <p className="mt-2 text-lg font-semibold text-ops-text">{value}</p>
    </div>
  );
}

export function AdvertisePage() {
  const [form, setForm] = useState({
    businessName: "",
    contactName: "",
    email: "",
    phone: "",
    headline: "",
    body: "",
    callToAction: "",
    targetUrl: "https://",
    requestedDays: "1",
    slotRank: "2"
  });
  const [creative, setCreative] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const pricingQuery = useQuery({
    queryKey: ["public-ad-pricing"],
    queryFn: () => api.getPublicAdPricing(),
    staleTime: 60_000
  });
  const pricePerDay = pricingQuery.data?.pricing.baseDailyPrice ?? 10;
  const slotMultipliers = pricingQuery.data?.pricing.slotMultipliers ?? [
    { slotRank: 1, multiplier: 1.5 },
    { slotRank: 2, multiplier: 1 },
    { slotRank: 3, multiplier: 0.85 }
  ];
  const selectedMultiplier = slotMultipliers.find((entry) => entry.slotRank === Number(form.slotRank))?.multiplier ?? 1;
  const adjustedDailyPrice = pricePerDay * selectedMultiplier;
  const totalEstimate = Number(form.requestedDays || 0) * adjustedDailyPrice;

  const submissionMutation = useMutation({
    mutationFn: async () => {
      if (!creative) {
        throw new Error("Attach one ad image before submitting.");
      }

      if (!creative.type.startsWith("image/")) {
        throw new Error("Creative must be an image file.");
      }

      return api.createAdSubmission({
        businessName: form.businessName,
        contactName: form.contactName,
        email: form.email,
        phone: form.phone || undefined,
        headline: form.headline,
        body: form.body,
        callToAction: form.callToAction || undefined,
        targetUrl: form.targetUrl,
        requestedDays: Number(form.requestedDays),
        slotRank: Number(form.slotRank),
        image: await fileToUpload(creative)
      });
    },
    onSuccess: () => {
      setForm({
        businessName: "",
        contactName: "",
        email: "",
        phone: "",
        headline: "",
        body: "",
        callToAction: "",
        targetUrl: "https://",
        requestedDays: "1",
        slotRank: "2"
      });
      setCreative(null);
      setFileError(null);
    }
  });

  return (
    <div className="space-y-3 pb-24 md:space-y-4 md:pb-0">
      <PageHero
        eyebrow="Advertise"
        icon={Megaphone}
        title="Post a screen ad from your phone"
        description="Submit one image ad, choose how many days you want to run, and wait for admin review. Mobile now gets the same direct ad path instead of relying only on the QR handoff."
        compact
        aside={(
          <div className="rounded-3xl border border-ops-border-soft bg-gradient-to-b from-ops-panel/85 to-[#121c2d] p-3.5 text-sm text-ops-muted shadow-panel md:p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ops-muted/80">Mobile advertiser flow</p>
            <p className="mt-2 font-semibold text-ops-text">Everything works on the same phone</p>
            <div className="mt-2.5 space-y-1.5 text-ops-muted">
              <p>Upload one creative.</p>
              <p>Choose slot priority and days.</p>
              <p>Wait for review before manual payment.</p>
            </div>
          </div>
        )}
      />

      <div className="grid gap-2.5 sm:grid-cols-3">
        <AdvertiseStat label="Rate / day" value={`$${adjustedDailyPrice.toFixed(2)}`} tone="primary" />
        <AdvertiseStat label="Selected slot" value={`Slot ${form.slotRank}`} />
        <AdvertiseStat label="Estimated total" value={`$${totalEstimate.toFixed(2)}`} tone="success" />
      </div>

      <div className="grid gap-3 lg:grid-cols-[0.92fr_1.08fr] md:gap-3.5">
        <section className="space-y-3">
          <AdvertiseSheet title="Post from your phone" description="The mobile ad flow is now first-class inside the rider/public experience." compact>
            <div className="space-y-3">
              <div className="rounded-[1.2rem] border border-ops-border bg-gradient-to-b from-ops-panel/80 to-[#101827] p-3.5">
                <div className="flex items-start gap-3">
                  <span className="inline-flex rounded-[1rem] border border-ops-primary/25 bg-ops-primary/12 p-2.5 text-ops-primary">
                    <Smartphone className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold text-ops-text">No desktop handoff required</p>
                    <p className="mt-1 text-sm leading-5 text-ops-muted">Riders, drivers, and local businesses can submit a campaign directly from mobile, then return to the rider shell when they are done.</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-2.5">
                <div className="rounded-[1.2rem] border border-ops-border-soft bg-ops-surface/65 p-3.5">
                  <p className="font-semibold text-ops-text">Step 1 · Prepare the campaign</p>
                  <p className="mt-1 text-sm leading-5 text-ops-muted">Add business details, one destination URL, and short ad copy that reads well on a driver screen.</p>
                </div>
                <div className="rounded-[1.2rem] border border-ops-border-soft bg-ops-surface/65 p-3.5">
                  <p className="font-semibold text-ops-text">Step 2 · Upload one image</p>
                  <p className="mt-1 text-sm leading-5 text-ops-muted">Use a clean JPG, PNG, or WebP creative. Admin reviews it before any payment is requested.</p>
                </div>
                <div className="rounded-[1.2rem] border border-ops-border-soft bg-ops-surface/65 p-3.5">
                  <p className="font-semibold text-ops-text">Step 3 · Wait for approval</p>
                  <p className="mt-1 text-sm leading-5 text-ops-muted">If approved, RealDrive sends manual Apple Pay or Cash App instructions before the ad is published.</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <Link
                  to="/more"
                  className="inline-flex items-center justify-center rounded-2xl border border-ops-border bg-ops-surface px-4 py-2.5 text-sm font-semibold text-ops-text transition-all duration-200 active:scale-[0.985] hover:bg-ops-panel/70"
                >
                  Back to more
                </Link>
                <Link
                  to="/tablet/ads/login"
                  className="inline-flex items-center justify-center rounded-2xl border border-ops-primary/35 bg-ops-primary/12 px-4 py-2.5 text-sm font-semibold text-ops-primary transition-all duration-200 active:scale-[0.985] hover:bg-ops-primary/18"
                >
                  Tablet ad login
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>
          </AdvertiseSheet>

          <AdvertiseSheet title="Before you submit" description="Keep the first mobile ad version simple and easy to review." compact>
            <div className="space-y-2.5 text-sm text-ops-muted">
              <p>One image creative only in v1.</p>
              <p>Use a real destination URL with https.</p>
              <p>Shorter headlines and CTA copy usually read better on mobile-managed campaigns.</p>
            </div>
          </AdvertiseSheet>
        </section>

        <Card className="overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(15,20,29,0.98),rgba(10,14,21,0.99))] shadow-[0_20px_60px_rgba(2,6,23,0.2)]">
          <CardHeader className="border-b border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))]">
            <CardTitle>Ad submission</CardTitle>
            <CardDescription>
              {pricingQuery.isLoading ? "Loading pricing…" : `$${adjustedDailyPrice.toFixed(2)} per day for slot ${form.slotRank}.`} Submit from mobile or desktop with the same review-first flow.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-4 md:p-5">
            {submissionMutation.isSuccess ? (
              <div className="rounded-3xl border border-ops-success/25 bg-ops-success/10 p-4 text-sm text-ops-text">
                <div className="flex items-center gap-2 font-semibold text-ops-success">
                  <CheckCircle2 className="h-4 w-4" />
                  Submission received
                </div>
                <p className="mt-2 text-ops-text/80">RealDrive will review it, then request manual payment if approved.</p>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business name</Label>
                <Input id="businessName" placeholder="Neighborhood Cafe" value={form.businessName} onChange={(event) => setForm((current) => ({ ...current, businessName: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactName">Contact name</Label>
                <Input id="contactName" placeholder="Jordan Smith" value={form.contactName} onChange={(event) => setForm((current) => ({ ...current, contactName: event.target.value }))} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="hello@example.com" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" type="tel" placeholder="Optional" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="headline">Headline</Label>
              <Input id="headline" placeholder="Lunch specials all week" value={form.headline} onChange={(event) => setForm((current) => ({ ...current, headline: event.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Ad copy</Label>
              <Textarea
                id="body"
                className="min-h-32 rounded-3xl"
                placeholder="Tell riders what they should notice in one short paragraph."
                value={form.body}
                onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cta">Call to action</Label>
                <Input id="cta" value={form.callToAction} onChange={(event) => setForm((current) => ({ ...current, callToAction: event.target.value }))} placeholder="Book now" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slotRank">Screen slot</Label>
                <select
                  id="slotRank"
                  className="h-11 w-full rounded-2xl border border-ops-border bg-[linear-gradient(180deg,rgba(20,24,31,0.96),rgba(13,16,22,0.96))] px-4 text-sm text-ops-text outline-none transition focus:border-ops-primary/70"
                  value={form.slotRank}
                  onChange={(event) => setForm((current) => ({ ...current, slotRank: event.target.value }))}
                >
                  {slotMultipliers.map((entry) => (
                    <option key={entry.slotRank} value={entry.slotRank}>
                      Slot {entry.slotRank} · {(entry.multiplier * 100).toFixed(0)}%
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="requestedDays">Days requested</Label>
                <Input id="requestedDays" type="number" min={1} max={31} value={form.requestedDays} onChange={(event) => setForm((current) => ({ ...current, requestedDays: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetUrl">Destination URL</Label>
                <Input id="targetUrl" inputMode="url" value={form.targetUrl} onChange={(event) => setForm((current) => ({ ...current, targetUrl: event.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="creative">Ad image</Label>
              <label className="flex cursor-pointer items-center justify-between rounded-3xl border border-dashed border-ops-border px-4 py-4 text-sm text-ops-muted transition hover:border-ops-primary/45">
                <span>{creative ? creative.name : "Upload JPG, PNG, or WebP"}</span>
                <Upload className="h-4 w-4" />
                <input
                  id="creative"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;

                    if (file && !file.type.startsWith("image/")) {
                      setCreative(null);
                      setFileError("Creative must be an image file.");
                      return;
                    }

                    setCreative(file);
                    setFileError(null);
                  }}
                />
              </label>
              {fileError ? <p className="text-sm text-ops-error">{fileError}</p> : null}
            </div>

            <div className="rounded-3xl border border-ops-border-soft bg-ops-panel/45 p-4 text-sm text-ops-muted">
              Total if approved: <span className="font-semibold text-ops-text">${totalEstimate.toFixed(2)}</span>
              <span className="ml-2 text-xs">({adjustedDailyPrice.toFixed(2)}/day · slot {form.slotRank})</span>
            </div>

            <Button className="w-full" disabled={submissionMutation.isPending} onClick={() => submissionMutation.mutate()}>
              Submit ad request
            </Button>
            {submissionMutation.error ? <p className="text-sm text-ops-error">{submissionMutation.error.message}</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
