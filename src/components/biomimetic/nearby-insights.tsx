"use client";

import { useEffect, useState } from "react";
import type { GeoInsights } from "@/app/api/geo/insights/route";
import type { MapPoint } from "./biomimetic-property-map";

export function NearbyInsights({ lat, lng }: MapPoint) {
  const [insights, setInsights] = useState<GeoInsights | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setInsights(null);
    setError(false);
    async function load() {
      try {
        const response = await fetch("/api/geo/insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat, lng }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Insights: HTTP ${response.status}`);
        const data: GeoInsights = await response.json();
        if (!controller.signal.aborted) setInsights(data);
      } catch (reason) {
        if (!controller.signal.aborted) {
          console.error("Nie udało się pobrać statystyk infrastruktury:", reason);
          setError(true);
        }
      }
    }
    void load();
    return () => controller.abort();
  }, [lat, lng]);

  return <section className="mt-3 text-sm">
    <h3 className="font-semibold">W promieniu 1 km</h3>
    {insights ? <p className="mt-1">
      {insights.restaurants} restauracji i kawiarni · {insights.schools} szkół · {insights.health} placówek zdrowia i aptek · {insights.shops} sklepów · {insights.parks} parków
    </p> : error
      ? <p role="alert" className="mt-1">Nie udało się pobrać statystyk infrastruktury.</p>
      : <p role="status" className="mt-1">Liczenie infrastruktury…</p>}
  </section>;
}
