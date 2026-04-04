import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { Ride } from "@shared/contracts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const LazyLiveMap = lazy(() => import("@/components/maps/live-map").then((module) => ({ default: module.LiveMap })));

function MapPlaceholder() {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Live trip map</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[360px] animate-pulse rounded-3xl border border-ops-border-soft bg-ops-panel/80" />
      </CardContent>
    </Card>
  );
}

export function DeferredLiveMap({ ride }: { ride: Ride }) {
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
        <Suspense fallback={<MapPlaceholder />}>
          <LazyLiveMap ride={ride} />
        </Suspense>
      ) : (
        <MapPlaceholder />
      )}
    </div>
  );
}
