import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import type { Ride } from "@shared/contracts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const LazyLiveMap = lazy(() => import("@/components/maps/live-map").then((module) => ({ default: module.LiveMap })));

function MapPlaceholder({ title, height = 360, meta }: { title: string; height?: number; meta?: ReactNode }) {
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
  meta
}: {
  ride: Ride;
  title?: string;
  height?: number;
  meta?: ReactNode;
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
        <Suspense fallback={<MapPlaceholder title={title ?? "Live trip map"} height={height} meta={meta} />}>
          <LazyLiveMap ride={ride} title={title} height={height} meta={meta} />
        </Suspense>
      ) : (
        <MapPlaceholder title={title ?? "Live trip map"} height={height} meta={meta} />
      )}
    </div>
  );
}
