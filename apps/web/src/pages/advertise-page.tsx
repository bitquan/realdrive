import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Megaphone, Upload } from "lucide-react";
import { PageHero } from "@/components/layout/page-hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

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
    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="space-y-5">
        <PageHero
          eyebrow="Advertise"
          icon={Megaphone}
          title="Put your business on RealDrive screens"
          description="Submit one image ad, pick how many days you want to run, and wait for admin approval. Payment stays manual and only happens after approval."
        />

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-4xl border border-ops-border-soft bg-ops-panel/55 p-5">
            <p className="font-semibold text-ops-text">Step 1</p>
            <p className="mt-2 text-sm text-ops-muted">Submit your business details, ad image, and destination link.</p>
          </div>
          <div className="rounded-4xl border border-ops-border-soft bg-ops-panel/55 p-5">
            <p className="font-semibold text-ops-text">Step 2</p>
            <p className="mt-2 text-sm text-ops-muted">RealDrive reviews the creative, then sends manual Apple Pay or Cash App instructions.</p>
          </div>
          <div className="rounded-4xl border border-ops-border-soft bg-ops-panel/55 p-5">
            <p className="font-semibold text-ops-text">Step 3</p>
            <p className="mt-2 text-sm text-ops-muted">Once payment is confirmed, the ad can be published on driver display screens.</p>
          </div>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Ad submission</CardTitle>
          <CardDescription>{pricingQuery.isLoading ? "Loading pricing…" : `$${adjustedDailyPrice.toFixed(2)} per day for slot ${form.slotRank}.`} One image creative in v1. Admin approves before anything goes live.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {submissionMutation.isSuccess ? (
            <div className="rounded-3xl border border-ops-success/25 bg-ops-success/10 p-4 text-sm text-ops-text">
              Submission received. RealDrive will review it, then request manual payment if approved.
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business name</Label>
              <Input id="businessName" value={form.businessName} onChange={(event) => setForm((current) => ({ ...current, businessName: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactName">Contact name</Label>
              <Input id="contactName" value={form.contactName} onChange={(event) => setForm((current) => ({ ...current, contactName: event.target.value }))} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="headline">Headline</Label>
            <Input id="headline" value={form.headline} onChange={(event) => setForm((current) => ({ ...current, headline: event.target.value }))} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Ad copy</Label>
            <textarea
              id="body"
              className="min-h-32 w-full rounded-3xl border border-ops-border bg-[linear-gradient(180deg,rgba(20,24,31,0.96),rgba(13,16,22,0.96))] px-4 py-3 text-sm text-ops-text outline-none transition focus:border-ops-primary/70"
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetUrl">Destination URL</Label>
            <Input id="targetUrl" value={form.targetUrl} onChange={(event) => setForm((current) => ({ ...current, targetUrl: event.target.value }))} />
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
                  setCreative(file);
                  setFileError(null);
                }}
              />
            </label>
            {fileError ? <p className="text-sm text-ops-error">{fileError}</p> : null}
          </div>

          <div className="rounded-3xl border border-ops-border-soft bg-ops-panel/45 p-4 text-sm text-ops-muted">
            Total if approved: <span className="font-semibold text-ops-text">${(Number(form.requestedDays || 0) * adjustedDailyPrice).toFixed(2)}</span>
            <span className="ml-2 text-xs">({adjustedDailyPrice.toFixed(2)}/day · slot {form.slotRank})</span>
          </div>

          <Button disabled={submissionMutation.isPending} onClick={() => submissionMutation.mutate()}>
            Submit ad request
          </Button>
          {submissionMutation.error ? <p className="text-sm text-ops-error">{submissionMutation.error.message}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
