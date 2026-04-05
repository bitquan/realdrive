import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import QRCode from "qrcode";
import { ExternalLink, Megaphone, QrCode } from "lucide-react";
import { useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

function useQrCode(value: string) {
  const [dataUrl, setDataUrl] = useState("");

  useEffect(() => {
    let active = true;
    if (!value) {
      setDataUrl("");
      return;
    }

    void QRCode.toDataURL(value, {
      margin: 1,
      width: 280,
      color: { dark: "#101826", light: "#f8fbff" }
    }).then((result) => {
      if (active) {
        setDataUrl(result);
      }
    });

    return () => {
      active = false;
    };
  }, [value]);

  return dataUrl;
}

export function AdsDisplayPage() {
  const { referralCode = "" } = useParams();
  const displayQuery = useQuery({
    queryKey: ["public-ad-display", referralCode],
    queryFn: () => api.getPublicAdDisplay(referralCode),
    enabled: Boolean(referralCode),
    retry: false,
    refetchInterval: 60_000
  });
  const [index, setIndex] = useState(0);

  const slides = useMemo(() => {
    if (!referralCode) {
      return [];
    }

    const shareUrl = typeof window === "undefined" ? `/share/${referralCode}` : new URL(`/share/${referralCode}`, window.location.origin).toString();
    const defaultSlide = {
      id: `default-${referralCode}`,
      businessName: "RealDrive",
      headline: "Scan to sign up with RealDrive",
      body: "The driver flyer always stays first. Riders can scan here to book, sign up, and support this driver.",
      callToAction: "Scan to get started",
      targetUrl: shareUrl,
      qrUrl: shareUrl,
      imageDataUrl: "",
      displaySeconds: 10,
      slotRank: 1
    };

    return [defaultSlide, ...(displayQuery.data?.items ?? [])];
  }, [displayQuery.data?.items, referralCode]);

  useEffect(() => {
    if (!slides.length) {
      return;
    }

    const current = slides[index % slides.length];
    const timeout = window.setTimeout(() => {
      setIndex((value) => (value + 1) % slides.length);
    }, Math.max(5, current.displaySeconds) * 1000);

    return () => window.clearTimeout(timeout);
  }, [index, slides]);

  useEffect(() => {
    setIndex(0);
  }, [slides.length]);

  const currentSlide = slides[index] ?? null;
  const qrUrl = currentSlide?.qrUrl ?? "";
  const qrDataUrl = useQrCode(qrUrl);

  if (displayQuery.isLoading) {
    return <div className="rounded-4xl border border-ops-border-soft bg-ops-surface p-8 text-sm text-ops-muted">Loading display…</div>;
  }

  if (displayQuery.error || !displayQuery.data || !currentSlide) {
    return (
      <div className="rounded-4xl border border-ops-border-soft bg-ops-surface p-8 text-sm text-ops-error">
        {displayQuery.error?.message ?? "Ad display not available."}
      </div>
    );
  }

  return (
    <div className="min-h-[78vh] overflow-hidden rounded-[2rem] border border-ops-border-soft bg-[radial-gradient(circle_at_top,_rgba(70,117,255,0.12),_transparent_42%),linear-gradient(180deg,rgba(13,17,24,0.98),rgba(7,10,15,0.98))] p-5 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[1.6rem] border border-ops-border-soft/80 bg-ops-panel/55 px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ops-primary">RealDrive display</p>
          <h1 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-ops-text">{displayQuery.data.driverName} ad screen</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{displayQuery.data.optedIn ? "ads enabled" : "driver flyer only"}</Badge>
          <Badge>slot {currentSlide.slotRank}</Badge>
          <Badge>{index + 1}/{slides.length}</Badge>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="flex min-h-[58vh] flex-col justify-between rounded-[1.8rem] border border-ops-border-soft/80 bg-ops-surface/70 p-6">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-ops-primary/15 text-ops-primary">
                <Megaphone className="h-6 w-6" />
              </span>
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-ops-muted">{currentSlide.businessName}</p>
                <h2 className="mt-1 text-3xl font-bold tracking-[-0.04em] text-ops-text md:text-5xl">{currentSlide.headline}</h2>
              </div>
            </div>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-ops-muted md:text-2xl">{currentSlide.body}</p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[1.6rem] border border-ops-border-soft/80 bg-ops-panel/50 p-4">
              {currentSlide.imageDataUrl ? (
                <img src={currentSlide.imageDataUrl} alt={currentSlide.headline} className="h-[320px] w-full rounded-[1.3rem] object-cover" />
              ) : (
                <div className="flex h-[320px] items-center justify-center rounded-[1.3rem] border border-dashed border-ops-border text-center text-2xl font-semibold text-ops-text">
                  RealDrive
                  <br />
                  rider signup flyer
                </div>
              )}
            </div>
            <div className="rounded-[1.6rem] border border-ops-border-soft/80 bg-ops-panel/50 p-5 text-ops-text">
              <p className="text-xs uppercase tracking-[0.22em] text-ops-muted">Scan action</p>
              <p className="mt-3 text-2xl font-bold">{currentSlide.callToAction || "Scan this QR code"}</p>
              <p className="mt-2 text-sm text-ops-muted">Every paid ad scan is logged back to this driver display for manual dues offset tracking.</p>
              <div className="mt-5 flex items-center gap-2 text-sm text-ops-primary">
                <ExternalLink className="h-4 w-4" />
                {currentSlide.targetUrl}
              </div>
            </div>
          </div>
        </section>

        <aside className="rounded-[1.8rem] border border-ops-border-soft/80 bg-ops-surface/78 p-6">
          <div className="flex items-center gap-2 text-ops-text">
            <QrCode className="h-5 w-5" />
            <p className="font-semibold">Scan QR</p>
          </div>
          <div className="mt-5 flex justify-center rounded-[1.6rem] border border-ops-border-soft/70 bg-[#f8fbff] p-4">
            {qrDataUrl ? <img src={qrDataUrl} alt="Ad QR code" className="h-64 w-64 rounded-2xl" /> : <div className="h-64 w-64" />}
          </div>
          <div className="mt-5 rounded-[1.4rem] border border-ops-border-soft/70 bg-ops-panel/50 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-ops-muted">Driver code</p>
            <p className="mt-2 text-lg font-semibold text-ops-text">{displayQuery.data.referralCode}</p>
          </div>
          <div className="mt-4 rounded-[1.4rem] border border-ops-border-soft/70 bg-ops-panel/50 p-4 text-sm text-ops-muted">
            <p className="font-semibold text-ops-text">Rotation rules</p>
            <ul className="mt-3 space-y-2 leading-6">
              <li>• The RealDrive driver flyer always stays in slot #1.</li>
              <li>• Paid ads rotate after it using a timed loop.</li>
              <li>• If no paid ads are active, the driver flyer stays on screen.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
