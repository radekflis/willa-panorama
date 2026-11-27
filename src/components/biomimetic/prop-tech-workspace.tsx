"use client";

import React, { useMemo, useRef, useState } from "react";
import { importLibrary } from "@googlemaps/js-api-loader";
import { AirVent, Clock3, CloudSun, Flower2, Mountain, Sun } from "lucide-react";
import {
  BiomimeticPropertyMap,
  type MapCameraTarget,
  type MapPoint,
  type RouteDestination,
  type RouteInfo,
  type RouteMode,
  type IntelligenceLayer,
} from "./biomimetic-property-map";
import type { PropertyDetailData } from "./biomimetic-property-detail";
import { predictSuffix } from "./crystal-prediction";
import type { GeoIntelligence } from "../../app/api/geo/intelligence/route";

export interface WorkspaceProperty extends PropertyDetailData {
  priceNumeric: number;
  priceShort: string;
  imageUrl: string;
  lat: number;
  lng: number;
}

const TYPES = ["dom", "mieszkanie", "działkę", "apartament"];
const LOCATIONS = ["w województwie pomorskim", "w dolnośląskim", "w mazowieckim", "nad jeziorem", "w górach"];

type Intent = "sell" | "buy" | "area" | "unknown";
type IntelligenceTab = IntelligenceLayer | "aerial";
type IntelligenceState =
  | { key: string; status: "loading" }
  | { key: string; status: "error"; message: string }
  | { key: string; status: "ready"; data: GeoIntelligence };
type IntelligenceSelection = { key: string; tab: IntelligenceTab; point: MapPoint };
const DEFAULT_INTELLIGENCE_POINT: MapPoint = { lat: 50.967, lng: 16.615 };

const intelligenceTabs: Array<{ id: IntelligenceTab; label: string; Icon: typeof Sun }> = [
  { id: "solar", label: "Słońce", Icon: Sun },
  { id: "air", label: "Powietrze", Icon: AirVent },
  { id: "pollen", label: "Pyłki", Icon: Flower2 },
  { id: "weather", label: "Pogoda", Icon: CloudSun },
  { id: "terrain", label: "Teren", Icon: Mountain },
  { id: "timezone", label: "Czas", Icon: Clock3 },
];

function IntelligenceDetails({ tab, data }: { tab: IntelligenceTab; data: GeoIntelligence }) {
  const number = (value: number | null | undefined, unit: string) =>
    value == null ? "Brak danych dla tego punktu." : `${new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 1 }).format(value)} ${unit}`;
  if (tab === "solar") {
    return data.solar ? <div>
      <p>Powierzchnia dachu: {number(data.solar.areaMeters2, "m²")}</p>
      <p>Nasłonecznienie: {number(data.solar.maxSunshineHoursPerYear, "godz./rok")}</p>
      <p>Potencjał paneli PV: {number(data.solar.maxArrayPanelsCount, "paneli")}</p>
    </div> : <p>Brak danych dla tego punktu.</p>;
  }
  if (tab === "terrain") return <p>Wysokość n.p.m.: {number(data.elevation, "m")}</p>;
  if (tab === "air") return <p>Indeks AQI: {data.airQuality ? [data.airQuality.aqiDisplay, data.airQuality.category].filter(Boolean).join(" · ") || "Brak danych dla tego punktu." : "Brak danych dla tego punktu."}</p>;
  if (tab === "weather") return <p>{data.weather ? [data.weather.temperature == null ? null : number(data.weather.temperature, "°C"), data.weather.conditions].filter(Boolean).join(" · ") || "Brak danych dla tego punktu." : "Brak danych dla tego punktu."}</p>;
  if (tab === "timezone") {
    const timeZone = data.timeZone?.id;
    return <p>{data.timeZone?.name ?? timeZone ?? "Brak danych dla tego punktu."}{timeZone ? ` · ${new Intl.DateTimeFormat("pl-PL", { timeZone, dateStyle: "short", timeStyle: "short" }).format(new Date())}` : ""}</p>;
  }
  if (tab === "aerial") return <p>{data.aerialView?.videoUrl ? "Odtwarzanie filmu Aerial View." : "Brak filmu Aerial View dla tego punktu. Uruchomiono orbitę 3D."}</p>;
  return <p>Pylenie: {!data.pollen?.length ? "Brak danych dla tego punktu." : data.pollen.map((item) =>
      `${item.displayName ?? item.code ?? "Pyłki"}: ${item.indexInfo?.category ?? (item.indexInfo?.value != null ? item.indexInfo.value : item.inSeason === false ? "poza sezonem" : "brak danych")}`,
    ).join("; ")}</p>;
}

function localIntent(text: string): Intent {
  const value = text.toLocaleLowerCase("pl");
  if (/sprzeda|sprzedaj|sprzedam/.test(value)) return "sell";
  if (/kup|szukam/.test(value)) return "buy";
  if (/okolic|otoczeni/.test(value)) return "area";
  return "unknown";
}

function FileDrop({ title, accept, file, onFile }: {
  title: string;
  accept: string;
  file: File | null;
  onFile: (file: File) => void;
}) {
  return (
    <label
      className="block cursor-pointer rounded-xl border border-dashed border-white/70 bg-white/10 p-3 text-sm"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const dropped = event.dataTransfer.files[0];
        if (dropped) onFile(dropped);
      }}
    >
      <span className="font-semibold">{title}</span>
      <span className="mt-1 block text-xs">{file ? file.name : "Przeciągnij plik lub wybierz z urządzenia"}</span>
      <input className="sr-only" type="file" accept={accept} onChange={(event) => {
        const selected = event.target.files?.[0];
        if (selected) onFile(selected);
      }} />
    </label>
  );
}

export function PropTechWorkspace({ properties }: { properties: WorkspaceProperty[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const restoreRef = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState("");
  const [scrollLeft, setScrollLeft] = useState(0);
  const [caretAtEnd, setCaretAtEnd] = useState(true);
  const [sellerOpen, setSellerOpen] = useState(false);
  const [location, setLocation] = useState<MapPoint | null>(null);
  const [address, setAddress] = useState("");
  const [video, setVideo] = useState<File | null>(null);
  const [plan, setPlan] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<MapCameraTarget | null>(null);
  const [orbitTarget, setOrbitTarget] = useState<(MapPoint & { ts: number }) | null>(null);
  const orbitSequence = useRef(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [place, setPlace] = useState<google.maps.places.Place | null>(null);
  const [route, setRoute] = useState<RouteDestination | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeWarnings, setRouteWarnings] = useState<string[]>([]);
  const [streetView, setStreetView] = useState<MapPoint | null>(null);
  const [busy, setBusy] = useState(false);
  const [intelligenceTab, setIntelligenceTab] = useState<IntelligenceSelection | null>(null);
  const [intelligence, setIntelligence] = useState<IntelligenceState | null>(null);
  const [terrainRequest, setTerrainRequest] = useState(0);
  const intelligenceRequest = useRef(0);
  const intelligenceCache = useRef(new Map<string, GeoIntelligence>());
  const intelligencePending = useRef(new Map<string, Promise<GeoIntelligence>>());
  const [aerialVideoUrl, setAerialVideoUrl] = useState<string | null>(null);

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
    if (intent === "sell") {
      setPlace(null);
      setSellerOpen(true);
    } else if (intent === "buy" || intent === "area") {
      setSellerOpen(false);
      setMessage("Wybierz miejsce na mapie, aby zobaczyć informacje Google, trasę lub Street View.");
    } else {
      setMessage("Nie rozpoznano intencji. Napisz, czy chcesz sprzedać, kupić lub sprawdzić okolicę.");
    }
  }

  async function findAddress(event: React.FormEvent) {
    event.preventDefault();
    if (!address.trim()) return;
    try {
      const { Geocoder } = await importLibrary("geocoding");
      const result = await new Geocoder().geocode({ address, region: "PL" });
      const point = result.results[0]?.geometry.location.toJSON();
      if (!point) throw new Error("Nie znaleziono adresu.");
      setLocation(point);
      setSelectedId(null);
      setCameraTarget({ ...point, zoom: 17, pitch: 60, ts: Date.now() });
      setMessage(null);
    } catch (error) {
      console.error("Nie udało się znaleźć adresu:", error);
      setMessage("Nie udało się znaleźć adresu. Sprawdź adres i dostęp do Google Geocoding API.");
    }
  }

  function selectFile(file: File, kind: "video" | "plan") {
    const valid = kind === "video"
      ? file.type.startsWith("video/")
      : ["application/pdf", "image/jpeg", "image/png"].includes(file.type);
    if (!valid || !file.size) {
      setMessage(kind === "video" ? "Wybierz poprawny plik wideo." : "Wybierz poprawny plik PDF, JPG lub PNG.");
      return;
    }
    setMessage(null);
    if (kind === "video") setVideo(file);
    else setPlan(file);
  }

  const markers = useMemo(() => location && !selectedId
    ? [...properties, { id: "wybrana", priceShort: "◇", ...location, ecoScore: 0 }]
    : properties, [location, properties, selectedId]);
  const placeLocation = place?.location?.toJSON();
  const selectedIntelligencePoint = sellerOpen ? location : placeLocation ?? location;
  const intelligencePoint = intelligenceTab?.point ?? selectedIntelligencePoint ?? DEFAULT_INTELLIGENCE_POINT;
  const intelligenceKey = `${intelligencePoint.lat.toFixed(4)},${intelligencePoint.lng.toFixed(4)}`;
  const activeIntelligenceTab = intelligenceTab?.tab ?? null;
  const currentIntelligence = intelligence?.key === intelligenceTab?.key ? intelligence : null;

  async function fetchIntelligence(point: MapPoint, key: string): Promise<GeoIntelligence> {
    const cachedData = intelligenceCache.current.get(key);
    if (cachedData) return cachedData;
    const existingRequest = intelligencePending.current.get(key);
    if (existingRequest) return existingRequest;
    const pendingRequest = (async () => {
      const response = await fetch("/api/geo/intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(point),
      });
      if (!response.ok) {
        const errorBody: unknown = await response.json().catch(() => null);
        const detail = errorBody && typeof errorBody === "object" && "error" in errorBody && typeof errorBody.error === "string"
          ? errorBody.error
          : `HTTP ${response.status}`;
        throw new Error(`Google API: ${detail}`);
      }
      const data: unknown = await response.json();
      if (!data || typeof data !== "object") throw new Error("Brak danych dla tego punktu.");
      return data as GeoIntelligence;
    })();
    intelligencePending.current.set(key, pendingRequest);
    try {
      const data = await pendingRequest;
      intelligenceCache.current.set(key, data);
      return data;
    } finally {
      intelligencePending.current.delete(key);
    }
  }

  async function openIntelligence(tab: IntelligenceTab, point: MapPoint = intelligencePoint) {
    const key = `${point.lat.toFixed(4)},${point.lng.toFixed(4)}`;
    setIntelligenceTab({ key, tab, point });
    if (tab === "terrain") setTerrainRequest((value) => value + 1);
    const requestId = ++intelligenceRequest.current;
    const cachedData = intelligenceCache.current.get(key);
    if (cachedData) {
      setIntelligence({ key, status: "ready", data: cachedData });
      if (tab === "aerial" && cachedData.aerialView?.videoUrl) setAerialVideoUrl(cachedData.aerialView.videoUrl);
      else if (tab === "aerial") setOrbitTarget({ ...point, ts: ++orbitSequence.current });
      return;
    }
    setIntelligence({ key, status: "loading" });
    try {
      const data = await fetchIntelligence(point, key);
      if (requestId === intelligenceRequest.current) setIntelligence({ key, status: "ready", data });
      if (tab === "aerial") {
        if (data.aerialView?.videoUrl) setAerialVideoUrl(data.aerialView.videoUrl);
        else setOrbitTarget({ ...point, ts: ++orbitSequence.current });
      }
    } catch (error) {
      console.error("Nie udało się pobrać analizy przestrzennej:", error);
      const message = error instanceof Error ? error.message : "Nie udało się pobrać danych z Google API.";
      if (requestId === intelligenceRequest.current) setIntelligence({ key, status: "error", message });
      if (tab === "aerial") setOrbitTarget({ ...point, ts: ++orbitSequence.current });
    }
  }

  function fallbackToOrbit() {
    setAerialVideoUrl(null);
    setIntelligence((current) => current && current.key === intelligenceKey
      ? { key: current.key, status: "error", message: "Nie udało się odtworzyć filmu Aerial View. Uruchomiono orbitę 3D." }
      : current);
    setOrbitTarget({ ...intelligencePoint, ts: ++orbitSequence.current });
  }

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-neutral-900">
      <BiomimeticPropertyMap
        properties={markers}
        hoveredId={null}
        selectedId={selectedId}
        onHover={() => {}}
        onSelect={(id) => {
          const property = properties.find((item) => item.id === id);
          if (property) {
            setLocation({ lat: property.lat, lng: property.lng });
            setSelectedId(property.id);
            setPlace(null);
            setRoute(null);
            setRouteInfo(null);
          }
          setMessage("Spacer 3D i odczyt wymiarów nie są jeszcze dostępne.");
        }}
        cameraTarget={cameraTarget}
        orbitTarget={orbitTarget}
        pickLocationMode={sellerOpen}
        onPickLocation={(point) => { setLocation(point); setSelectedId(null); setMessage(null); }}
        onSelectGooglePlace={(selected) => { setPlace(selected); setRoute(null); setRouteInfo(null); }}
        routeOrigin={location ?? undefined}
        routeDestination={route}
        onRouteInfo={setRouteInfo}
        onRouteError={setRouteError}
        onMapError={setMapError}
        onRouteWarnings={setRouteWarnings}
        streetViewTarget={streetView}
        onStreetViewRequest={setStreetView}
        onCloseStreetView={() => setStreetView(null)}
        terrainRequest={terrainRequest}
        onIntelligenceRequest={(tab, point) => void openIntelligence(tab, point)}
        activeIntelligenceLayer={activeIntelligenceTab}
        onAerialRequest={(point) => {
          setStreetView(null);
          void openIntelligence("aerial", point);
        }}
        aerialVideoUrl={aerialVideoUrl}
        onCloseAerialVideo={() => setAerialVideoUrl(null)}
        onAerialVideoError={fallbackToOrbit}
      />

      {activeIntelligenceTab && (
        <section aria-label={intelligenceTabs.find((item) => item.id === activeIntelligenceTab)?.label ?? "Przelot"} className="pointer-events-auto fixed bottom-[104px] left-3 z-50 max-h-[28dvh] w-[min(360px,calc(100vw-1.5rem))] overflow-y-auto rounded-lg border border-black/10 bg-white/95 p-3 text-xs text-stone-800 shadow-md [text-shadow:none]">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-[13px] font-semibold">{intelligenceTabs.find((item) => item.id === activeIntelligenceTab)?.label ?? "Przelot"}</h2>
            <button type="button" className="rounded px-2 text-base leading-none hover:bg-stone-100" aria-label="Zamknij analizę" onClick={() => setIntelligenceTab(null)}>×</button>
          </div>
          {currentIntelligence?.status === "ready" ? <IntelligenceDetails tab={activeIntelligenceTab} data={currentIntelligence.data} />
            : currentIntelligence?.status === "error" ? <p role="alert">{currentIntelligence.message}</p>
              : <p role="status">Pobieranie danych z Google API...</p>}
        </section>
      )}

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
        <div className="crystal-dialog pointer-events-auto relative flex min-h-[90px] max-h-[60dvh] flex-col gap-2 p-3.5">
          <button type="button" onClick={() => {
            setScrollLeft(0);
            setMinimized(true);
            requestAnimationFrame(() => restoreRef.current?.focus());
          }} aria-label="Minimalizuj okno AI" className="crystal-chip absolute right-3 top-3 z-10 px-2 py-1 text-sm leading-none">−</button>
          <div className="min-h-0 overflow-y-auto pr-8 text-sm">
      {sellerOpen && (
        <section aria-label="Przygotowanie spaceru 3D" className="mb-3 pt-1">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-semibold">Przygotuj spacer 3D</h2>
            <button type="button" onClick={() => setSellerOpen(false)} aria-label="Zamknij" className="crystal-chip px-2 py-1">×</button>
          </div>
          <div className="space-y-3">
            <div>
              <p className="font-semibold">1. Wskaż na mapie lub wpisz adres</p>
              <p className="my-1 text-xs">{location ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : "Kliknij dowolny punkt mapy."}</p>
              <form onSubmit={findAddress} className="flex gap-2">
                <input aria-label="Adres nieruchomości" value={address} onChange={(event) => setAddress(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-white/60 bg-black/20 px-3 py-2 text-white placeholder:text-white/70" placeholder="Adres" />
                <button className="crystal-chip px-3" type="submit">Znajdź</button>
              </form>
            </div>
            <FileDrop title="2. Wgraj obowiązkowe wideo" accept="video/*" file={video} onFile={(file) => selectFile(file, "video")} />
            <FileDrop title="3. Wgraj rzut lokalu" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" file={plan} onFile={(file) => selectFile(file, "plan")} />
            <p className="text-xs">Pliki pozostają na tym urządzeniu i nie są przesyłane. Silnik 3D Nerfstudio oraz analiza rzutów zostaną podłączone w kolejnym etapie.</p>
            <button type="button" disabled={!location || !video || !plan} onClick={() => setMessage("Nie można utworzyć spaceru: brak skonfigurowanej usługi Nerfstudio i analizy rzutu. Pliki nie zostały przesłane.")} className="crystal-chip w-full px-3 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-50">Utwórz zwymiarowany spacer 3D</button>
          </div>
        </section>
      )}

      {place && !sellerOpen && (
        <section aria-label="Miejsce Google" className="mb-3 pt-1">
          <div className="flex justify-between gap-3"><h2 className="font-semibold">{place.displayName ?? "Miejsce Google"}</h2><button type="button" onClick={() => setPlace(null)} aria-label="Zamknij" className="crystal-chip px-2">×</button></div>
          {place.rating != null && <p className="mt-2">Ocena: {place.rating} / 5</p>}
          {place.nationalPhoneNumber && <p className="mt-2">{place.nationalPhoneNumber}</p>}
          {place.websiteURI && <a className="mt-2 block underline" href={place.websiteURI} target="_blank" rel="noreferrer">Strona miejsca</a>}
          {placeLocation && <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="crystal-chip px-2 py-1" onClick={() => setStreetView(placeLocation)}>Street View</button>
            {(["DRIVING", "WALKING", "BICYCLING"] as RouteMode[]).map((mode) => <button key={mode} type="button" disabled={!location} className="crystal-chip px-2 py-1 disabled:opacity-50" onClick={() => setRoute({ ...placeLocation, mode })}>{mode === "DRIVING" ? "Auto" : mode === "WALKING" ? "Pieszo" : "Rower"}</button>)}
          </div>}
          {!location && <p className="mt-2 text-xs">Aby wyznaczyć trasę, najpierw wskaż punkt nieruchomości.</p>}
          {route && <p className="mt-2">{routeError ?? (routeInfo ? `${routeInfo.distance} · ${routeInfo.duration}` : "Wyznaczanie trasy…")}</p>}
          {place.attributions?.map((attribution) => <p key={attribution.provider} className="mt-2 text-xs">{attribution.provider}</p>)}
        </section>
      )}

        {mapError && <p role="alert" className="mb-3 pr-8">{mapError} <button type="button" className="underline" onClick={() => setMapError(null)}>Zamknij</button></p>}
        {message && <p role="status" className="mb-3 pr-8">{message} <button type="button" className="underline" onClick={() => setMessage(null)}>Zamknij</button></p>}
        {routeWarnings.map((warning) => <p key={warning} className="mb-2 text-xs">{warning}</p>)}
        </div>
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
