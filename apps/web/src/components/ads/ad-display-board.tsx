import { useEffect, useMemo, useState } from "react";
import type { PublicAdDisplayResponse } from "@shared/contracts";
import QRCode from "qrcode";
import { Expand, LogOut, Megaphone, QrCode, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type DisplayItem = PublicAdDisplayResponse["items"][number];

type Slide = DisplayItem & {
  accent: string;
  secondaryAccent: string;
};

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
      width: 320,
      color: {
        dark: "#05070d",
        light: "#f8fbff"
      }
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

function buildDefaultSlide(shareUrl: string): Slide {
  return {
    id: "realdrive-default-slide",
    businessName: "RealDrive",
    headline: "Ride with RealDrive",
    body: "Scan the screen to book with this driver or learn more about the RealDrive network.",
    callToAction: "Scan to ride now",
    targetUrl: shareUrl,
    qrUrl: shareUrl,
    imageDataUrl: "",
    displaySeconds: 10,
    slotRank: 1,
    accent: "from-fuchsia-500 via-rose-500 to-orange-400",
    secondaryAccent: "bg-fuchsia-500/15 text-fuchsia-100"
  };
}

function buildAdvertiseSlide(advertiseUrl: string): Slide {
  return {
    id: "realdrive-advertise-slide",
    businessName: "RealDrive Ads",
    headline: "Want your ad to show here?",
    body: "Scan this QR code to open the ad form. Riders, drivers, and local businesses can all submit a screen ad request.",
    callToAction: "Scan to advertise here",
    targetUrl: advertiseUrl,
    qrUrl: advertiseUrl,
    imageDataUrl: "",
    displaySeconds: 10,
    slotRank: 2,
    accent: "from-cyan-500 via-sky-500 to-violet-500",
    secondaryAccent: "bg-cyan-500/15 text-cyan-100"
  };
}

function buildPaidSlide(item: DisplayItem): Slide {
  const palettes = [
    { accent: "from-sky-500 via-cyan-400 to-emerald-300", secondaryAccent: "bg-sky-500/15 text-sky-100" },
    { accent: "from-violet-500 via-indigo-400 to-sky-300", secondaryAccent: "bg-violet-500/15 text-violet-100" },
    { accent: "from-amber-500 via-orange-400 to-pink-400", secondaryAccent: "bg-amber-500/15 text-amber-100" }
  ];
  const palette = palettes[(item.slotRank - 1) % palettes.length] ?? palettes[0];

  return {
    ...item,
    ...palette
  };
}

export function AdDisplayBoard({
  driverName,
  referralCode,
  shareUrl,
  optedIn,
  items,
  showDeviceControls = false,
  onSignOut
}: {
  driverName: string;
  referralCode: string;
  shareUrl: string;
  optedIn: boolean;
  items: DisplayItem[];
  showDeviceControls?: boolean;
  onSignOut?: () => void;
}) {
  const advertiseUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return "/advertise";
    }

    return new URL("/advertise", window.location.origin).toString();
  }, []);
  const slides = useMemo(() => {
    const paidSlides = items.map(buildPaidSlide);
    return paidSlides.length
      ? [buildDefaultSlide(shareUrl), ...paidSlides]
      : [buildDefaultSlide(shareUrl), buildAdvertiseSlide(advertiseUrl)];
  }, [advertiseUrl, items, shareUrl]);
  const [index, setIndex] = useState(0);
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    setIndex(0);
  }, [slides.length]);

  useEffect(() => {
    if (!slides.length) {
      return;
    }

    const activeSlide = slides[index % slides.length];
    const timer = window.setTimeout(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, Math.max(5, activeSlide.displaySeconds) * 1000);

    return () => window.clearTimeout(timer);
  }, [index, slides]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const currentSlide = slides[index] ?? slides[0];
  const qrDataUrl = useQrCode(currentSlide?.qrUrl ?? "");
  const timeLabel = clock.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
  const dateLabel = clock.toLocaleDateString([], {
    month: "short",
    day: "numeric"
  });

  async function enterFullscreen() {
    const node = document.documentElement;
    if (document.fullscreenElement || !node.requestFullscreen) {
      return;
    }

    await node.requestFullscreen().catch(() => undefined);
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(242,53,164,0.18),_transparent_24%),radial-gradient(circle_at_bottom,_rgba(29,78,216,0.22),_transparent_28%),#02040a] px-3 py-4 text-white md:px-6 md:py-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1680px] flex-col rounded-[2.4rem] border border-white/10 bg-[#05070d] p-3 shadow-[0_30px_120px_rgba(0,0,0,0.55)] md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.8rem] border border-white/10 bg-white/[0.03] px-4 py-3 md:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-white/45">Driver display tablet</p>
            <h1 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-white md:text-2xl">{driverName}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <Badge className="border-white/10 bg-white/5 px-3 py-1 text-white/80">{optedIn ? "ads live" : "driver flyer only"}</Badge>
            <Badge className="border-white/10 bg-white/5 px-3 py-1 text-white/80">slide {index + 1}/{slides.length}</Badge>
            <Badge className="border-white/10 bg-white/5 px-3 py-1 text-white/80">code {referralCode}</Badge>
            {showDeviceControls ? (
              <>
                <Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={() => void enterFullscreen()}>
                  <Expand className="mr-2 h-4 w-4" />
                  Fullscreen
                </Button>
                <Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={onSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </Button>
              </>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid flex-1 gap-4 xl:grid-cols-[1.45fr_0.55fr]">
          <section className="grid min-h-[60vh] gap-4 rounded-[2rem] border border-white/10 bg-white/[0.03] p-4 md:p-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className={`flex min-h-[420px] flex-col rounded-[1.8rem] border border-white/10 bg-gradient-to-br p-4 md:p-5 xl:min-h-full xl:p-6 ${currentSlide.accent}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
                  <Megaphone className="h-3.5 w-3.5" />
                  {currentSlide.businessName}
                </div>
                <div className="rounded-full bg-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
                  Slot {currentSlide.slotRank}
                </div>
              </div>

              <div className="mt-5 flex-1 overflow-hidden rounded-[1.5rem] border border-white/15 bg-black/15">
                {currentSlide.imageDataUrl ? (
                  <img src={currentSlide.imageDataUrl} alt={currentSlide.headline} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full min-h-[280px] items-center justify-center bg-[linear-gradient(135deg,rgba(5,7,13,0.65),rgba(12,16,28,0.15))] px-8 text-center">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">RealDrive</p>
                      <p className="mt-4 text-4xl font-black tracking-[-0.05em] text-white md:text-6xl">
                        {currentSlide.slotRank === 2 ? "Advertise here" : "Scan to ride"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-[1.8rem] border border-white/10 bg-[#090d17] p-5 md:p-6">
              <div>
                <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${currentSlide.secondaryAccent}`}>
                  <Sparkles className="h-3.5 w-3.5" />
                  on-screen offer
                </div>
                <h2 className="mt-4 text-3xl font-black tracking-[-0.05em] text-white md:text-5xl">{currentSlide.headline}</h2>
                <p className="mt-4 text-base leading-7 text-white/72 md:text-lg">{currentSlide.body}</p>
              </div>

              <div className="mt-6 grid gap-4 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">Call to action</p>
                  <p className="mt-2 text-2xl font-bold tracking-[-0.03em] text-white">{currentSlide.callToAction || "Scan to open"}</p>
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-black/20 p-4 text-sm text-white/72">
                  <p className="font-semibold text-white">Display rules</p>
                  <ul className="mt-3 space-y-2 leading-6">
                    <li>• Driver tablet stays locked to the ad board.</li>
                    <li>• Riders only get the QR destination, not driver account access.</li>
                    <li>• Approved paid ads rotate after the driver flyer.</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <aside className="flex flex-col rounded-[2rem] border border-white/10 bg-[#090d17] p-4 md:p-6">
            <div className="flex items-center gap-2 text-white">
              <QrCode className="h-5 w-5" />
              <p className="font-semibold uppercase tracking-[0.2em] text-white/70">Scan here</p>
            </div>
            <div className="mt-5 flex flex-1 items-center justify-center rounded-[1.8rem] border border-white/10 bg-[#f8fbff] p-4">
              {qrDataUrl ? <img src={qrDataUrl} alt="Scan QR" className="h-full w-full max-h-[360px] max-w-[360px] rounded-[1.2rem] object-contain" /> : null}
            </div>
            <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">Destination</p>
              <p className="mt-2 break-all text-sm text-white/75">{currentSlide.targetUrl}</p>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">Screen mode</p>
                <p className="mt-2 text-lg font-semibold text-white">{optedIn ? "Ad rotation" : "Flyer only"}</p>
              </div>
              <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">Paid ads</p>
                <p className="mt-2 text-lg font-semibold text-white">{items.length}</p>
              </div>
              <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">Clock</p>
                <p className="mt-2 text-lg font-semibold text-white">{timeLabel}</p>
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[1.8rem] border border-white/10 bg-white/[0.03] px-4 py-3 md:px-6">
          <div className="flex flex-wrap items-center gap-3 text-sm text-white/60">
            <span>{dateLabel}</span>
            <span className="h-1.5 w-1.5 rounded-full bg-white/25" />
            <span>{timeLabel}</span>
            <span className="h-1.5 w-1.5 rounded-full bg-white/25" />
            <span>{driverName}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.22em] text-white/45">
            <span>tablet mode</span>
            <span>•</span>
            <span>ad screen only</span>
            <span>•</span>
            <span>realdrive</span>
          </div>
        </div>
      </div>
    </div>
  );
}
