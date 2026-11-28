"use client";

import React, { useRef, useState } from "react";
import { BiomimeticPropertyMap, type MapPlace, type MapPoint, type NearbyPlace, type PropertyMapHandle } from "./biomimetic-property-map";
import type { PropertyDetailData } from "./biomimetic-property-detail";
import { predictSuffix } from "./crystal-prediction";
import type { GeoIntelligence } from "@/app/api/geo/intelligence/route";
import type { RouteMode, RouteResult } from "@/app/api/geo/route/route";

export interface WorkspaceProperty extends PropertyDetailData {
  priceNumeric: number;
  priceShort: string;
  imageUrl: string;
  lat: number;
  lng: number;
}

const TYPES = ["dom", "mieszkanie", "działkę", "apartament"];
const LOCATIONS = ["w województwie pomorskim", "w dolnośląskim", "w mazowieckim", "nad jeziorem", "w górach"];
const ROUTE_MODES: Array<{ value: RouteMode; label: string; travelLabel: string }> = [
  { value: "DRIVE", label: "Auto", travelLabel: "autem" },
  { value: "WALK", label: "Pieszo", travelLabel: "pieszo" },
  { value: "BICYCLE", label: "Rower", travelLabel: "rowerem" },
];

type Intent = "sell" | "buy" | "area" | "unknown";

function localIntent(text: string): Intent {
  const value = text.toLocaleLowerCase("pl");
  if (/sprzeda|sprzedaj|sprzedam/.test(value)) return "sell";
  if (/kup|szukam/.test(value)) return "buy";
  if (/okolic|otoczeni/.test(value)) return "area";
  return "unknown";
}

function companyWebsite(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (!["http:", "https:"].includes(url.protocol) ||
      (/(^|\.)google\.[a-z.]+$/.test(host) && (host.startsWith("maps.") || /^\/maps(?:\/|$)/i.test(url.pathname))) ||
      host === "maps.app.goo.gl" || host === "goo.gl") return null;
    return url.href;
  } catch {
    return null;
  }
}

function distanceKm(origin: MapPoint, destination: MapPoint): number {
  const radians = Math.PI / 180;
  const lat = (destination.lat - origin.lat) * radians;
  const lng = (destination.lng - origin.lng) * radians;
  const a = Math.sin(lat / 2) ** 2 + Math.cos(origin.lat * radians) * Math.cos(destination.lat * radians) * Math.sin(lng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(Math.min(1, a)));
}

export function PropTechWorkspace(_props: { properties: WorkspaceProperty[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const restoreRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const mapRef = useRef<PropertyMapHandle>(null);
  const analysisRequest = useRef(0);
  const routeRequest = useRef(0);
  const selectedOrigin = useRef<MapPoint | null>(null);
  const placeOrigin = useRef<MapPoint | null>(null);
  const [query, setQuery] = useState("");
  const [scrollLeft, setScrollLeft] = useState(0);
  const [caretAtEnd, setCaretAtEnd] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [busy, setBusy] = useState(false);
  const [point, setPoint] = useState<MapPoint | null>(null);
  const [approximate, setApproximate] = useState(false);
  const [place, setPlace] = useState<MapPlace | null>(null);
  const [placeLoading, setPlaceLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [analysis, setAnalysis] = useState<GeoIntelligence | null>(null);
  const [analysisBusy, setAnalysisBusy] = useState(false);
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[] | null>(null);
  const [routes, setRoutes] = useState<Partial<Record<RouteMode, RouteResult>>>({});
  const [routeBusy, setRouteBusy] = useState(false);
  const [routeMode, setRouteMode] = useState<RouteMode>("DRIVE");

  function showPoint(next: MapPoint, isApproximate: boolean) {
    analysisRequest.current++;
    routeRequest.current++;
    panelRef.current?.scrollTo({ top: 0 });
    selectedOrigin.current = next;
    setPoint(next);
    setApproximate(isApproximate);
    setPlace(null);
    setPlaceLoading(false);
    setAnalysis(null);
    setAnalysisBusy(false);
    setNearbyPlaces(null);
    setRoutes({});
    setRouteBusy(false);
    setPanelOpen(true);
    setMapError(null);
  }

  async function loadRoutes(origin: MapPoint, destination: MapPoint) {
    const request = ++routeRequest.current;
    setRouteBusy(true);
    setRoutes({});
    const results = await Promise.allSettled(ROUTE_MODES.map(async ({ value }) => {
      const response = await fetch("/api/geo/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin, destination, mode: value }),
      });
      if (!response.ok) throw new Error(`${value}: HTTP ${response.status}`);
      return [value, await response.json() as RouteResult] as const;
    }));
    if (request !== routeRequest.current) return;
    const next: Partial<Record<RouteMode, RouteResult>> = {};
    for (const result of results) {
      if (result.status === "fulfilled") next[result.value[0]] = result.value[1];
      else console.error("Nie udało się wyznaczyć trasy:", result.reason);
    }
    setRoutes(next);
    setRouteBusy(false);
    if (Object.keys(next).length === 0) setMapError("Nie udało się wyznaczyć trasy do wybranego miejsca.");
  }

  async function analyzePoint(selected: MapPoint) {
    const request = ++analysisRequest.current;
    setAnalysisBusy(true);
    setAnalysis(null);
    setNearbyPlaces(null);
    setMapError(null);
    const [intelligence, nearby] = await Promise.allSettled([
      (async () => {
        const response = await fetch("/api/geo/intelligence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(selected),
        });
        if (!response.ok) throw new Error(`Analiza punktu: HTTP ${response.status}`);
        return await response.json() as GeoIntelligence;
      })(),
      (async () => {
        if (!mapRef.current) throw new Error("Mapa 3D nie jest dostępna.");
        return mapRef.current.searchNearby(selected);
      })(),
    ]);
    if (request !== analysisRequest.current) return;
    const errors: string[] = [];
    if (intelligence.status === "fulfilled") setAnalysis(intelligence.value);
    else {
      console.error("Nie udało się przeanalizować punktu:", intelligence.reason);
      errors.push("Nie udało się przeanalizować punktu.");
    }
    if (nearby.status === "fulfilled") setNearbyPlaces(nearby.value);
    else {
      console.error("Nie udało się pobrać miejsc w pobliżu:", nearby.reason);
      const detail = nearby.reason instanceof Error ? nearby.reason.message : String(nearby.reason);
      errors.push(`Diagnostyka Places: ${detail}`);
    }
    if (errors.length) setMapError(errors.join(" "));
    setAnalysisBusy(false);
  }

  const ghost = caretAtEnd ? predictSuffix(query) : "";
  const typeMatch = query.match(/^(Sprzedaję|Kupuję)\s+(dom|mieszkanie|działkę|apartament)(?:\s|$)/i);
  const suggestions = typeMatch
    ? LOCATIONS
    : /^(Sprzedaję|Kupuję)\s/i.test(query)
      ? TYPES
      : ["Sprzedaję", "Kupuję", "Sprawdź okolicę"];

  function setText(value: string) {
    setQuery(value);
    setCaretAtEnd(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(value.length, value.length);
      setScrollLeft(inputRef.current?.scrollLeft ?? 0);
    });
  }

  function chooseSuggestion(value: string) {
    if (typeMatch) setText(`${typeMatch[1]} ${typeMatch[2]} ${value} `);
    else if (/^(Sprzedaję|Kupuję)\s/i.test(query)) setText(`${query.match(/^(Sprzedaję|Kupuję)/i)?.[0]} ${value} `);
    else setText(`${value} `);
  }

  async function submitQuery(event: React.FormEvent) {
    event.preventDefault();
    if (!query.trim() || busy) return;
    setMessage(null);
    let intent = localIntent(query);
    if (intent === "unknown") {
      setBusy(true);
      try {
        const response = await fetch("/api/ai/intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: query }),
          signal: AbortSignal.timeout(1500),
        });
        if (!response.ok) throw new Error(`Intent API: ${response.status}`);
        const result: { intent?: Intent } = await response.json();
        if (result.intent) intent = result.intent;
      } catch (error) {
        console.warn("Interpretacja AI niedostępna, użyto lokalnej:", error);
      } finally {
        setBusy(false);
      }
    }
    setMessage(intent === "unknown"
      ? "Nie rozpoznano intencji. Napisz, czy chcesz sprzedać, kupić lub sprawdzić okolicę."
      : "Obsługa tego zapytania zostanie podłączona w kolejnym etapie.");
  }

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-neutral-900">
      <BiomimeticPropertyMap
        ref={mapRef}
        onMapError={(error) => { setMapError(error); setPlaceLoading(false); }}
        onPoint={showPoint}
        onPlaceLoading={() => {
          analysisRequest.current++;
          routeRequest.current++;
          panelRef.current?.scrollTo({ top: 0 });
          try {
            placeOrigin.current = selectedOrigin.current ?? mapRef.current?.getCenter() ?? null;
          } catch (error) {
            console.error("Nie udało się ustalić punktu początkowego trasy:", error);
            placeOrigin.current = null;
          }
          setAnalysisBusy(false);
          setPlace(null);
          setRoutes({});
          setRouteBusy(false);
          setMapError(null);
          setPlaceLoading(true);
          setPanelOpen(true);
        }}
        onPlace={(next) => {
          setPlace(next);
          setPlaceLoading(false);
          if (next.location) {
            if (placeOrigin.current) void loadRoutes(placeOrigin.current, next.location);
            else setMapError("Nie udało się ustalić punktu początkowego trasy.");
          } else {
            setMapError("Brak współrzędnych miejsca; nie można wyznaczyć trasy.");
          }
        }}
      />

      {panelOpen && <aside ref={panelRef} aria-label={place ? "Szczegóły miejsca" : "Wybrany punkt"} className="crystal-dialog fixed right-3 top-3 z-30 max-h-[240px] w-[86vw] max-w-[345px] overflow-y-auto rounded-[24px] p-3.5">
        <button type="button" className="crystal-chip float-right px-2 py-1 text-sm" aria-label="Zamknij kartę" onClick={() => { analysisRequest.current++; setPanelOpen(false); }}>×</button>
        {placeLoading && <p role="status">Ładowanie miejsca…</p>}
        {place && <>
          {point && <button type="button" className="crystal-chip mb-2 px-2 py-1 text-xs" onClick={() => {
            routeRequest.current++;
            panelRef.current?.scrollTo({ top: 0 });
            setPlace(null);
            setRoutes({});
            setRouteBusy(false);
            setMapError(null);
          }}>← Wróć do punktu</button>}
          <h2 className="pr-10 text-lg font-semibold">{place.name}</h2>
          {place.photo && <div className="mt-2">
            {/* Zdjęcia Places mają dynamiczne adresy i wymagają podania autorów. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={place.photo} alt={place.name} className="h-36 w-full rounded-xl object-cover" />
            {place.photoAuthors.length > 0 && <p className="text-xs">Zdjęcie: {place.photoAuthors.join(", ")}</p>}
          </div>}
          {place.category && <p className="mt-2 text-sm">{place.category}</p>}
          {place.rating != null && <p className="text-sm">★ {place.rating}{place.ratingCount != null && ` (${place.ratingCount} ocen)`}</p>}
          {place.address && <p className="mt-1 text-sm">{place.address}</p>}
          {place.hours.length > 0 && <div className="mt-2 text-xs"><h3 className="font-semibold">Godziny otwarcia</h3>{place.hours.map((line) => <p key={line}>{line}</p>)}</div>}
          {place.attributions.length > 0 && <p className="mt-2 text-xs">Dane: {place.attributions.join(", ")}</p>}
          <p className="mt-2 text-xs">Dane miejsc: Google Maps</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {place.phone && <a className="crystal-chip px-3 py-2 text-sm" href={`tel:${place.phone.replace(/[^\d+]/g, "")}`}>Zadzwoń</a>}
            {companyWebsite(place.website) && <a className="crystal-chip px-3 py-2 text-sm" href={companyWebsite(place.website) ?? undefined} target="_blank" rel="noopener noreferrer">Strona firmy</a>}
            {place.location && <button className="crystal-chip px-3 py-2 text-sm" type="button" onClick={() => {
              if (!place.location) return;
              try { mapRef.current?.orbit(place.location); } catch (error) { console.error(error); setMapError("Nie udało się uruchomić przelotu."); }
            }}>Przelot 360°</button>}
          </div>
          {routeBusy && <p role="status" className="mt-3 text-sm">Wyznaczanie tras…</p>}
          {Object.keys(routes).length > 0 && <section className="mt-3 text-sm">
            <h3 className="font-semibold">Dystans i czas dojazdu</h3>
            <div className="mt-2 flex gap-1">
              {ROUTE_MODES.map((mode) => <button
                key={mode.value}
                type="button"
                className={`crystal-chip px-2 py-1 text-xs ${routeMode === mode.value ? "ring-1 ring-white" : ""}`}
                aria-pressed={routeMode === mode.value}
                onClick={() => setRouteMode(mode.value)}
              >{mode.label}</button>)}
            </div>
            {routes[routeMode] ? <p className="mt-2">
              {((routes[routeMode]?.distanceMeters ?? 0) / 1000).toLocaleString("pl-PL", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km
              {" · "}{Math.max(1, Math.round((routes[routeMode]?.durationSeconds ?? 0) / 60))} min{" "}
              {ROUTE_MODES.find(({ value }) => value === routeMode)?.travelLabel}
            </p> : <p className="mt-2 text-xs">Brak trasy dla wybranego trybu.</p>}
          </section>}
        </>}
        {point && !place && !placeLoading && <>
          <h2 className="pr-10 text-lg font-semibold">Wybrany punkt</h2>
          {approximate && <p className="mt-1 text-xs">Wybrano środek mapy, ponieważ dokładne współrzędne przytrzymania nie są dostępne.</p>}
          <p className="mt-1 text-sm">{point.lat.toFixed(6)}, {point.lng.toFixed(6)}</p>
          <button type="button" className="crystal-chip mt-3 px-3 py-2 text-sm disabled:opacity-50" disabled={analysisBusy} onClick={() => void analyzePoint(point)}>{analysisBusy ? "Analizowanie…" : "Analiza punktu AI"}</button>
          {analysis && <div className="mt-3 space-y-1 text-sm">
            <p>Wysokość: {analysis.elevation != null ? `${analysis.elevation.toFixed(0)} m n.p.m.` : "brak danych"}</p>
            <p>Pogoda: {analysis.weather ? [analysis.weather.temperature != null ? `${analysis.weather.temperature}°C` : null, analysis.weather.conditions].filter(Boolean).join(", ") || "brak danych" : "brak danych"}</p>
            <p>Powietrze: {analysis.airQuality ? [analysis.airQuality.aqiDisplay, analysis.airQuality.category].filter(Boolean).join(" · ") || "brak danych" : "brak danych"}</p>
            <p>Słońce: {analysis.solar?.maxSunshineHoursPerYear != null ? `${Math.round(analysis.solar.maxSunshineHoursPerYear)} godz./rok` : "brak danych"}</p>
          </div>}
          {nearbyPlaces && <section className="mt-3 text-sm">
            <h3 className="font-semibold">Miejsca w promieniu 2 km</h3>
            {nearbyPlaces.length ? <ul className="mt-2 space-y-2">
              {nearbyPlaces.map((nearbyPlace) => <li key={nearbyPlace.id}>
                <button type="button" className="crystal-chip w-full px-3 py-2 text-left text-sm" onClick={() => {
                  try {
                    if (!mapRef.current) throw new Error("Mapa 3D nie jest dostępna.");
                    mapRef.current.openPlace(nearbyPlace.id);
                  } catch (error) {
                    console.error("Nie udało się otworzyć miejsca:", error);
                    setMapError("Nie udało się otworzyć miejsca.");
                  }
                }}>
                  {nearbyPlace.name} · {nearbyPlace.category || "Miejsce"}{nearbyPlace.rating != null && ` · ★ ${nearbyPlace.rating}`}
                  {nearbyPlace.location && ` · ${distanceKm(point, nearbyPlace.location).toLocaleString("pl-PL", { maximumFractionDigits: 1 })} km w linii prostej`}
                </button>
              </li>)}
            </ul> : <p className="mt-1">Nie znaleziono miejsc w pobliżu.</p>}
            <p className="mt-2 text-xs">Dane miejsc: Google Maps</p>
          </section>}
        </>}
        {mapError && <p role="alert" className="mt-3 text-sm">{mapError} <button type="button" className="underline" onClick={() => setMapError(null)}>Zamknij</button></p>}
      </aside>}
      {minimized && !panelOpen && mapError && <div className="crystal-dialog fixed left-3 top-3 z-30 max-w-sm p-4 text-sm" role="alert">
        {mapError} <button type="button" className="underline" onClick={() => setMapError(null)}>Zamknij</button>
      </div>}

      {minimized ? (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-20 -translate-x-1/2">
          <button ref={restoreRef} type="button" onClick={() => {
            setMinimized(false);
            requestAnimationFrame(() => inputRef.current?.focus());
          }} className="crystal-chip pointer-events-auto px-4 py-2 text-sm font-semibold" aria-label="Przywróć okno AI">AI +</button>
        </div>
      ) : (
        <div className="pointer-events-none fixed left-1/2 top-1/2 z-20 w-[86vw] max-w-[345px] -translate-x-1/2 -translate-y-1/2">
          <div className="pointer-events-none absolute bottom-full left-0 mb-3 flex max-h-[25dvh] w-full flex-wrap justify-center gap-2 overflow-y-auto">
            {suggestions.map((suggestion) => <button key={suggestion} type="button" className="crystal-chip pointer-events-auto px-2.5 py-1 text-[11px] font-medium" onClick={() => chooseSuggestion(suggestion)}>{suggestion}</button>)}
            {ghost && <button type="button" className="crystal-chip pointer-events-auto px-2.5 py-1 text-[11px]" onClick={() => setText(`${query}${ghost} `)} aria-label={`Uzupełnij: ${ghost}`}>↹ {ghost}</button>}
          </div>
          <div className="crystal-dialog pointer-events-auto relative flex min-h-[90px] max-h-[60dvh] flex-col gap-2 rounded-[24px] p-3.5">
            <button type="button" onClick={() => {
              setScrollLeft(0);
              setMinimized(true);
              requestAnimationFrame(() => restoreRef.current?.focus());
            }} aria-label="Minimalizuj okno AI" className="crystal-chip absolute right-3 top-3 z-10 px-2 py-1 text-sm leading-none">−</button>
            {((mapError && !panelOpen) || message) && <div className="min-h-0 overflow-y-auto pr-8 text-sm">
              {mapError && !panelOpen && <p role="alert" className="mb-3">{mapError} <button type="button" className="underline" onClick={() => setMapError(null)}>Zamknij</button></p>}
              {message && <p role="status" className="mb-3">{message} <button type="button" className="underline" onClick={() => setMessage(null)}>Zamknij</button></p>}
            </div>}
            <form onSubmit={submitQuery} className="flex min-h-[80px] flex-col justify-between gap-2 pt-2">
              <div className="relative min-w-0 flex-1 overflow-hidden">
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre px-2 py-2 pr-8 text-xs" style={{ textShadow: "none" }}>
                  <div style={{ transform: `translateX(-${scrollLeft}px)` }}><span className="text-transparent">{query}</span><span className="text-white/55">{ghost}</span></div>
                </div>
                <input ref={inputRef} aria-label="Zapytaj AI o nieruchomość" autoComplete="off" maxLength={1000} value={query} onChange={(event) => { setQuery(event.target.value); setCaretAtEnd(event.target.selectionStart === event.target.value.length); }} onSelect={(event) => setCaretAtEnd(event.currentTarget.selectionStart === event.currentTarget.value.length && event.currentTarget.selectionEnd === event.currentTarget.value.length)} onScroll={(event) => setScrollLeft(event.currentTarget.scrollLeft)} onKeyDown={(event) => {
                  if (ghost && (event.key === "Tab" || event.key === "ArrowRight")) {
                    event.preventDefault();
                    setText(`${query}${ghost} `);
                  }
                }} placeholder="Jak możemy Ci pomóc?" className="relative w-full bg-transparent px-2 py-2 pr-8 text-xs text-white outline-none placeholder:text-white/80" />
              </div>
              <button type="submit" disabled={busy || !query.trim()} className="crystal-chip self-end px-3 py-1.5 text-xs font-semibold disabled:opacity-50">{busy ? "…" : "Go"}</button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
