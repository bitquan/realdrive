import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import type { Ride } from "@shared/contracts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const LazyLiveMap = lazy(() => import("@/components/maps/live-map").then((module) => ({ default: module.LiveMap })));

function MapPlaceholder({
  title,
  height = 360,
  meta,
  surfaceChrome = "card"
}: {
  title: string;
  height?: number;
  meta?: ReactNode;
  surfaceChrome?: "card" | "bare";
}) {
  if (surfaceChrome === "bare") {
    return (
      <div className="relative overflow-hidden bg-[#050815]" style={{ height }}>
        <div className="absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_20%_18%,rgba(45,212,191,0.08),transparent_18%),radial-gradient(circle_at_82%_26%,rgba(56,189,248,0.08),transparent_20%),linear-gradient(180deg,rgba(15,23,42,0.84),rgba(2,6,23,0.96))]" />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-slate-950/70 via-slate-950/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent" />
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {meta ? <p className="mt-2 text-sm text-ops-muted">{meta}</p> : null}
      </CardHeader>
      <CardContent>
        <div className="animate-pulse rounded-3xl border border-ops-border-soft bg-ops-panel/80" style={{ height }} />
      </CardContent>
    </Card>
  );
}

export function DeferredLiveMap({
  ride,
  title,
  height,
  meta,
  surfaceChrome = "card",
  fitPaddingBottom
}: {
  ride: Ride;
  title?: string;
  height?: number;
  meta?: ReactNode;
  surfaceChrome?: "card" | "bare";
  fitPaddingBottom?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || visible) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
            return;
          }
        }
      },
      { rootMargin: "200px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div ref={containerRef}>
      {visible ? (
        <Suspense fallback={<MapPlaceholder title={title ?? "Live trip map"} height={height} meta={meta} surfaceChrome={surfaceChrome} />}>
          <LazyLiveMap ride={ride} title={title} height={height} meta={meta} surfaceChrome={surfaceChrome} fitPaddingBottom={fitPaddingBottom} />
        </Suspense>
      ) : (
        <MapPlaceholder title={title ?? "Live trip map"} height={height} meta={meta} surfaceChrome={surfaceChrome} />
      )}
    </div>
  );
}
