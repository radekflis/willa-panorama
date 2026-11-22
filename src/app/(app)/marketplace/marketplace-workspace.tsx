"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Unlock, RotateCcw, Search } from "lucide-react";
import { MarketplaceForm } from "./marketplace-form";
import { restoreMarketplacePinAction } from "./actions";

export type PublicPin = {
  id: string;
  ownerId: string;
  pinType: "owner_offer" | "buyer_request";
  transactionType: "sale" | "rent";
  lat: number | null;
  lng: number | null;
  city: string;
  title: string;
  description: string;
  pricePln: number;
  areaM2: number | null;
  rooms: number | null;
  status: "active" | "locked" | "completed";
};

type GoogleLatLng = { lat(): number; lng(): number };
type GoogleMapInstance = {
  panTo(position: { lat: number; lng: number }): void;
  addListener(event: "click", handler: (event: { latLng?: GoogleLatLng }) => void): { remove(): void };
};
type GoogleMarker = { setMap(map: GoogleMapInstance | null): void };
type GoogleMapWindow = {
  google?: {
    maps: {
      Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMapInstance;
      Marker: new (options: Record<string, unknown>) => GoogleMarker;
      Size: new (width: number, height: number) => { width: number; height: number };
      Point: new (x: number, y: number) => { x: number; y: number };
      MapTypeId: { HYBRID: unknown };
    };
  };
};

export function MarketplaceWorkspace({
  pins,
  userId,
  role,
  googleMapsKey,
}: {
  pins: PublicPin[];
  userId: string;
  role: "buyer" | "owner" | "agency";
  googleMapsKey: string | null;
}) {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<PublicPin | null>(null);
  const [unlocked, setUnlocked] = useState<{
    contactPhone: string;
    contactEmail: string;
    ownerId: string;
  } | null>(null);
  const [pending, setPending] = useState(false);
  const [mapInstance, setMapInstance] = useState<GoogleMapInstance | null>(null);
  const markersRef = useRef<GoogleMarker[]>([]);
  const seenPinIdsRef = useRef(new Set(pins.map((pin) => pin.id)));
  const [mapCoordinates, setMapCoordinates] = useState<{ lat: string; lng: string } | null>(null);
  const handleMapCoordinates = useCallback((lat: number, lng: number) => {
    setMapCoordinates({ lat: lat.toFixed(6), lng: lng.toFixed(6) });
  }, []);
  const consumeMapCoordinates = useCallback(() => setMapCoordinates(null), []);

  const visiblePins = useMemo(() => pins.filter((pin) => {
    if (filter === "all") return true;
    return pin.pinType === filter;
  }), [pins, filter]);

  useEffect(() => {
    if (!googleMapsKey) return;
    const win = window as unknown as GoogleMapWindow;
    if (win.google?.maps) initMap();
    else {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(googleMapsKey)}&v=weekly`;
      script.async = true;
      script.onload = initMap;
      document.head.appendChild(script);
    }

    function initMap() {
      const element = document.getElementById("google-map");
      const googleWindow = window as unknown as GoogleMapWindow;
      if (!element || !googleWindow.google) return;
      const maps = googleWindow.google.maps;
      const map = new maps.Map(element, {
        center: { lat: 52.229676, lng: 21.012229 },
        zoom: 6,
        mapTypeId: maps.MapTypeId.HYBRID,
      });
      setMapInstance(map);
    }
  }, [googleMapsKey, handleMapCoordinates]);

  useEffect(() => {
    if (!mapInstance) return;
    const listener = mapInstance.addListener("click", (event) => {
      const lat = event.latLng?.lat();
      const lng = event.latLng?.lng();
      if (lat != null && lng != null) handleMapCoordinates(lat, lng);
    });
    return () => listener.remove();
  }, [mapInstance, handleMapCoordinates]);

  useEffect(() => {
    if (!mapInstance) return;
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
    const maps = (window as unknown as GoogleMapWindow).google?.maps;
    if (!maps) return;

    visiblePins.forEach((pin) => {
      const lat = Number(pin.lat);
      const lng = Number(pin.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const fill = pin.pinType === "owner_offer" ? "#10b981" : "#06b6d4";
      const accent = pin.pinType === "owner_offer" ? "#fbbf24" : "#a5f3fc";
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="68" viewBox="0 0 56 68"><path fill="${fill}" stroke="${accent}" stroke-width="4" d="M28 2C13.6 2 2 13.6 2 28c0 18 26 38 26 38s26-20 26-38C54 13.6 42.4 2 28 2Z"/><path fill="#05070B" stroke="${accent}" stroke-width="2.5" stroke-linejoin="round" d="m14 29 14-12 14 12v16H14Z"/><path fill="${accent}" d="M25 35h6v10h-6z"/></svg>`;
      const marker = new maps.Marker({
        position: { lat, lng },
        map: mapInstance,
        title: pin.title,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
          scaledSize: new maps.Size(56, 68),
          anchor: new maps.Point(28, 66),
        },
      });
      markersRef.current.push(marker);
    });
  }, [mapInstance, visiblePins]);

  useEffect(() => {
    const newlyAdded = pins.find((pin) => !seenPinIdsRef.current.has(pin.id));
    pins.forEach((pin) => seenPinIdsRef.current.add(pin.id));
    if (newlyAdded && newlyAdded.lat != null && newlyAdded.lng != null) {
      const lat = Number(newlyAdded.lat);
      const lng = Number(newlyAdded.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) mapInstance?.panTo({ lat, lng });
    }
  }, [mapInstance, pins]);

  async function unlockPin(pin: PublicPin) {
    setPending(true);
    const response = await fetch("/api/checkout/five-dollars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unlock_pin", pinId: pin.id }),
    });
    const data = await response.json() as {
      url?: string;
      unlocked?: { contactPhone: string; contactEmail: string; ownerId: string };
      error?: string;
    };
    if (data.url) window.location.href = data.url;
    else if (data.unlocked) setUnlocked(data.unlocked);
    else if (data.error) alert(data.error);
    setPending(false);
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.65fr)]">
      <div className="space-y-4">
        <div className="card-lab p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-slate-400" />
              <select
                className="spatial-input min-w-52"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                aria-label="Filtr pinów"
              >
                <option value="all">Wszystkie piny</option>
                <option value="owner_offer">Złoto: Sprzedam / Wynajmę</option>
                <option value="buyer_request">Cyjan/fiolet: Kupię / Wynajmę</option>
              </select>
            </div>
            <span className="font-mono text-[10px] text-slate-500">{visiblePins.length} AKTYWNych PINÓW</span>
          </div>
          {googleMapsKey ? (
            <div id="google-map" className="h-[520px] overflow-hidden rounded-xl border border-white/10 bg-slate-950" />
          ) : (
            <div className="bg-grid-lab relative h-[520px] overflow-hidden rounded-xl border border-white/10">
              {visiblePins.map((pin, index) => {
                const left = pin.lng == null ? 12 + (index * 17) % 72 : 8 + ((pin.lng + 180) % 360) / 360 * 84;
                const top = pin.lat == null ? 12 + (index * 23) % 72 : 8 + (1 - (pin.lat + 90) / 180) * 84;
                return (
                  <button
                    key={pin.id}
                    type="button"
                    onClick={() => { setSelected(pin); setUnlocked(null); }}
                    className={`absolute h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-lg transition hover:scale-125 ${
                      pin.pinType === "owner_offer"
                        ? "border-amber-200 bg-emerald-500 text-amber-100"
                        : "border-fuchsia-300 bg-cyan-500 text-white"
                    }`}
                    style={{ left: `${left}%`, top: `${top}%` }}
                    title={pin.title}
                  >
                    <MapPin className="mx-auto h-4 w-4" />
                  </button>
                );
              })}
              <div className="absolute bottom-3 left-3 rounded-lg border border-white/10 bg-[#05070B]/80 px-3 py-2 text-[10px] text-slate-400 backdrop-blur">
                Tryb siatki · ustaw NEXT_PUBLIC_GOOGLE_MAPS_API_KEY dla satelity HYBRID
              </div>
            </div>
          )}
        </div>

        {selected && (
          <article className="card-lab p-5">
            <span className="eyebrow">{selected.pinType === "owner_offer" ? "WŁAŚCICIEL" : "POSZUKUJĄCY"} · {selected.transactionType === "sale" ? "SPRZEDAŻ" : "WYNAJEM"}</span>
            <h2 className="mt-2 text-xl font-medium text-white">{selected.title}</h2>
            <p className="mt-1 text-sm text-slate-400">{selected.city}</p>
            <p className="mt-4 text-sm leading-relaxed text-slate-300">{selected.description || "Brak dodatkowego opisu."}</p>
            <div className="mt-4 flex gap-5 text-sm text-slate-300">
              <strong className="text-white">{selected.pricePln.toLocaleString("pl-PL")} PLN</strong>
              {selected.areaM2 && <span>{selected.areaM2} m²</span>}
              {selected.rooms && <span>{selected.rooms} pokoje</span>}
            </div>
            {!unlocked ? (
              <button type="button" onClick={() => unlockPin(selected)} disabled={pending} className="btn-lab-primary mt-5 inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-60">
                <Unlock className="h-4 w-4" /> Odblokuj kontakt i wyłączność za 5$
              </button>
            ) : (
              <div className="mt-5 rounded-xl border border-emerald-300/20 bg-emerald-300/5 p-4">
                <p className="text-sm font-medium text-emerald-100">Kontakt odblokowany · wyłączność 72h</p>
                <p className="mt-2 text-sm text-slate-200">{unlocked.contactPhone || "Telefon niedostępny"} · {unlocked.contactEmail}</p>
                <a href={`/inbox?pin=${selected.id}&receiver=${unlocked.ownerId}`} className="mt-3 inline-block text-sm text-cyan-200 underline">Otwórz czat bezpośredni</a>
              </div>
            )}
            {selected.ownerId === userId && (
              <form action={restoreMarketplacePinAction.bind(null, selected.id)} className="mt-3">
                <button type="submit" className="btn-lab-secondary inline-flex h-10 items-center gap-2 rounded-xl px-4 text-xs">
                  <RotateCcw className="h-3.5 w-3.5" /> Przywróć pin na mapę
                </button>
              </form>
            )}
          </article>
        )}
      </div>
      <MarketplaceForm
        role={role}
        mapCoordinates={mapCoordinates}
        onMapCoordinatesConsumed={consumeMapCoordinates}
      />
    </div>
  );
}
