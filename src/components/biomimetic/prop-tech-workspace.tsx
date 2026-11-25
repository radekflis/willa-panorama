"use client";

import React, { useMemo, useRef, useState } from "react";
import { importLibrary } from "@googlemaps/js-api-loader";
import {
  BiomimeticPropertyMap,
  type MapCameraTarget,
  type MapPoint,
  type RouteDestination,
  type RouteInfo,
  type RouteMode,
} from "./biomimetic-property-map";
import type { PropertyDetailData } from "./biomimetic-property-detail";
import { predictSuffix } from "./crystal-prediction";

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

export function PropTechWorkspace({ properties: _properties }: { properties: WorkspaceProperty[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [scrollLeft, setScrollLeft] = useState(0);
  const [caretAtEnd, setCaretAtEnd] = useState(true);
  const [sellerOpen, setSellerOpen] = useState(false);
  const [location, setLocation] = useState<MapPoint | null>(null);
  const [address, setAddress] = useState("");
  const [video, setVideo] = useState<File | null>(null);
  const [plan, setPlan] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [cameraTarget, setCameraTarget] = useState<MapCameraTarget | null>(null);
  const [place, setPlace] = useState<google.maps.places.Place | null>(null);
  const [route, setRoute] = useState<RouteDestination | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [streetView, setStreetView] = useState<MapPoint | null>(null);
  const [busy, setBusy] = useState(false);

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

  const markers = useMemo(() => location ? [{ id: "wybrana", priceShort: "◇", ...location, ecoScore: 0 }] : [], [location]);
  const placeLocation = place?.location?.toJSON();

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-neutral-900">
      <BiomimeticPropertyMap
        properties={markers}
        hoveredId={null}
        selectedId={null}
        onHover={() => {}}
        onSelect={() => {
          if (!location) return;
          setCameraTarget({ ...location, zoom: 17, pitch: 60, ts: Date.now() });
          setMessage("Spacer 3D i odczyt wymiarów nie są jeszcze dostępne.");
        }}
        cameraTarget={cameraTarget}
        pickLocationMode={sellerOpen}
        onPickLocation={(point) => { setLocation(point); setMessage(null); }}
        onSelectGooglePlace={(selected) => { setPlace(selected); setRoute(null); setRouteInfo(null); }}
        routeOrigin={location ?? undefined}
        routeDestination={route}
        onRouteInfo={setRouteInfo}
        onRouteError={setRouteError}
        streetViewTarget={streetView}
        onCloseStreetView={() => setStreetView(null)}
      />

      {sellerOpen && (
        <section aria-label="Przygotowanie spaceru 3D" className="crystal-dialog absolute right-4 top-20 z-20 max-h-[55dvh] w-[min(24rem,calc(100%-2rem))] overflow-y-auto p-5 text-sm">
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
        <section aria-label="Miejsce Google" className="crystal-dialog absolute right-4 top-20 z-20 w-[min(22rem,calc(100%-2rem))] p-5 text-sm">
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

      <div className="pointer-events-none absolute bottom-6 left-1/2 z-20 w-[min(48rem,calc(100%-2rem))] -translate-x-1/2">
        {message && <div role="status" className="crystal-dialog pointer-events-auto mb-3 p-3 text-sm">{message} <button type="button" className="underline" onClick={() => setMessage(null)}>Zamknij</button></div>}
        <div className="pointer-events-auto mb-3 flex flex-wrap justify-center gap-2">
          {suggestions.map((suggestion) => <button key={suggestion} type="button" className="crystal-chip px-3 py-2 text-sm font-medium" onClick={() => chooseSuggestion(suggestion)}>{suggestion}</button>)}
          {ghost && <button type="button" className="crystal-chip px-3 py-2 text-sm" onClick={() => setText(`${query}${ghost} `)} aria-label={`Uzupełnij: ${ghost}`}>↹ {ghost}</button>}
        </div>
        <form onSubmit={submitQuery} className="crystal-dialog pointer-events-auto flex items-center gap-2 p-3">
          <div className="relative min-w-0 flex-1 overflow-hidden">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre px-2 py-3 text-base" style={{ textShadow: "none" }}>
              <div style={{ transform: `translateX(-${scrollLeft}px)` }}><span className="text-transparent">{query}</span><span className="text-white/55">{ghost}</span></div>
            </div>
            <input ref={inputRef} aria-label="Zapytaj AI o nieruchomość" autoComplete="off" maxLength={1000} value={query} onChange={(event) => { setQuery(event.target.value); setCaretAtEnd(event.target.selectionStart === event.target.value.length); }} onSelect={(event) => setCaretAtEnd(event.currentTarget.selectionStart === event.currentTarget.value.length && event.currentTarget.selectionEnd === event.currentTarget.value.length)} onScroll={(event) => setScrollLeft(event.currentTarget.scrollLeft)} onKeyDown={(event) => {
              if (ghost && (event.key === "Tab" || event.key === "ArrowRight")) {
                event.preventDefault();
                setText(`${query}${ghost} `);
              }
            }} placeholder="Jak możemy Ci pomóc?" className="relative w-full bg-transparent px-2 py-3 text-base text-white outline-none placeholder:text-white/80" />
          </div>
          <button type="submit" disabled={busy || !query.trim()} className="crystal-chip px-5 py-3 font-semibold disabled:opacity-50">{busy ? "…" : "Go"}</button>
        </form>
      </div>
    </main>
  );
}
