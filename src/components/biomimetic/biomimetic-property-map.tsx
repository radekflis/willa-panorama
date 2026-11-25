"use client";

import React, { useEffect, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

export interface PropertyMarkerData {
  id: string;
  priceShort: string;
  lat: number;
  lng: number;
  ecoScore: number;
}

export interface MapCameraTarget {
  lng: number;
  lat: number;
  zoom: number;
  pitch?: number;
  bearing?: number;
  ts?: number;
}

export type RouteMode = "DRIVING" | "WALKING" | "BICYCLING" | "TRANSIT";
export type MapPoint = { lat: number; lng: number };
export type RouteDestination = MapPoint & { mode: RouteMode };
export type RouteInfo = { distance: string; duration: string };

interface BiomimeticMapProps {
  properties: PropertyMarkerData[];
  hoveredId: string | null;
  selectedId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  cameraTarget?: MapCameraTarget | null;
  onSelectGooglePlace: (place: google.maps.places.Place) => void;
  routeDestination?: RouteDestination | null;
  routeOrigin?: MapPoint;
  onRouteInfo?: (info: RouteInfo | null) => void;
  onRouteError?: (error: string | null) => void;
  streetViewTarget?: MapPoint | null;
  onCloseStreetView?: () => void;
}

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
let loaderConfigured = false;

export function BiomimeticPropertyMap({
  properties,
  hoveredId,
  selectedId,
  onHover,
  onSelect,
  cameraTarget,
  onSelectGooglePlace,
  routeDestination,
  routeOrigin,
  onRouteInfo,
  onRouteError,
  streetViewTarget,
  onCloseStreetView,
}: BiomimeticMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onHover, onSelect, onSelectGooglePlace, onRouteInfo, onRouteError, onCloseStreetView });
  callbacks.current = { onHover, onSelect, onSelectGooglePlace, onRouteInfo, onRouteError, onCloseStreetView };
  const markerButtons = useRef(new Map<string, HTMLButtonElement>());
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [mapType, setMapType] = useState<"hybrid" | "roadmap" | "terrain">("hybrid");
  const [cycling, setCycling] = useState(false);
  const [streetVisible, setStreetVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeWarnings, setRouteWarnings] = useState<string[]>([]);

  useEffect(() => {
    if (!apiKey || !containerRef.current) return;
    let cancelled = false;
    let instance: google.maps.Map | null = null;
    let clickListener: google.maps.MapsEventListener | undefined;
    let visibleListener: google.maps.MapsEventListener | undefined;
    let placeRequest = 0;

    async function initialize() {
      try {
        if (!loaderConfigured) {
          setOptions({ key: apiKey, v: "weekly", language: "pl", region: "PL" });
          loaderConfigured = true;
        }
        const [{ Map }, { Place }] = await Promise.all([
          importLibrary("maps"),
          importLibrary("places"),
          importLibrary("routes"),
          importLibrary("streetView"),
        ]);
        if (cancelled || !containerRef.current) return;
        instance = new Map(containerRef.current, {
          center: { lat: 51.1079, lng: 17.0385 },
          zoom: 11.5,
          mapTypeId: "hybrid",
          tilt: 45,
          renderingType: google.maps.RenderingType.VECTOR,
          tiltInteractionEnabled: true,
          headingInteractionEnabled: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        const panorama = instance.getStreetView();
        visibleListener = panorama.addListener("visible_changed", () => {
          const visible = panorama.getVisible();
          setStreetVisible(visible);
          if (!visible) callbacks.current.onCloseStreetView?.();
        });
        clickListener = instance.addListener("click", async (event: google.maps.MapMouseEvent | google.maps.IconMouseEvent) => {
          if (!("placeId" in event) || !event.placeId) return;
          event.stop();
          const request = ++placeRequest;
          setError(null);
          try {
            const place = new Place({ id: event.placeId, requestedLanguage: "pl" });
            await place.fetchFields({
              fields: ["displayName", "nationalPhoneNumber", "websiteURI", "regularOpeningHours", "photos", "location", "rating", "attributions"],
            });
            if (!cancelled && request === placeRequest) callbacks.current.onSelectGooglePlace(place);
          } catch (cause) {
            console.error("Nie udało się pobrać miejsca Google:", cause);
            if (!cancelled && request === placeRequest) setError("Nie udało się pobrać informacji o miejscu. Sprawdź dostęp do Places API (New).");
          }
        });
        setMap(instance);
      } catch (cause) {
        console.error("Nie udało się załadować Google Maps:", cause);
        if (!cancelled) setError("Nie udało się załadować Google Maps. Sprawdź klucz, dostęp do API i połączenie.");
      }
    }

    void initialize();
    return () => {
      cancelled = true;
      clickListener?.remove();
      visibleListener?.remove();
      if (instance) google.maps.event.clearInstanceListeners(instance);
    };
  }, []);

  useEffect(() => {
    if (!map) return;
    map.setMapTypeId(mapType);
  }, [map, mapType]);

  useEffect(() => {
    if (!map || !cycling) return;
    const layer = new google.maps.BicyclingLayer();
    layer.setMap(map);
    return () => layer.setMap(null);
  }, [map, cycling]);

  useEffect(() => {
    if (!map || !cameraTarget) return;
    map.moveCamera({
      center: { lat: cameraTarget.lat, lng: cameraTarget.lng },
      zoom: cameraTarget.zoom,
      tilt: cameraTarget.pitch ?? 45,
      heading: cameraTarget.bearing ?? 0,
    });
  }, [map, cameraTarget]);

  useEffect(() => {
    if (!map) return;
    class PriceOverlay extends google.maps.OverlayView {
      private button: HTMLButtonElement;
      constructor(private property: PropertyMarkerData) {
        super();
        this.button = document.createElement("button");
        this.button.type = "button";
        this.button.textContent = property.priceShort;
        this.button.setAttribute("aria-label", `Nieruchomość: ${property.priceShort}`);
        markerButtons.current.set(property.id, this.button);
        this.button.addEventListener("click", () => callbacks.current.onSelect(property.id));
        this.button.addEventListener("mouseenter", () => callbacks.current.onHover(property.id));
        this.button.addEventListener("mouseleave", () => callbacks.current.onHover(null));
        google.maps.OverlayView.preventMapHitsAndGesturesFrom(this.button);
      }
      onAdd() {
        this.getPanes()?.overlayMouseTarget.appendChild(this.button);
      }
      draw() {
        const point = this.getProjection().fromLatLngToDivPixel(new google.maps.LatLng(this.property.lat, this.property.lng));
        if (point) {
          this.button.style.left = `${point.x}px`;
          this.button.style.top = `${point.y}px`;
        }
      }
      onRemove() {
        this.button.remove();
        markerButtons.current.delete(this.property.id);
      }
    }
    const overlays = properties.map((property) => {
      const overlay = new PriceOverlay(property);
      overlay.setMap(map);
      return overlay;
    });
    return () => overlays.forEach((overlay) => overlay.setMap(null));
  }, [map, properties]);

  useEffect(() => {
    markerButtons.current.forEach((button, id) => {
      const highlighted = id === hoveredId || id === selectedId;
      button.className = `absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-bold shadow-lg backdrop-blur-xl transition-transform hover:scale-110 ${
        highlighted ? "scale-110 border-emerald-400 bg-emerald-900 text-white" : "border-white/90 bg-white/90 text-stone-900"
      }`;
    });
  }, [map, properties, hoveredId, selectedId]);

  useEffect(() => {
    if (!map) return;
    let cancelled = false;
    let polylines: google.maps.Polyline[] = [];
    callbacks.current.onRouteInfo?.(null);
    callbacks.current.onRouteError?.(null);
    setRouteError(null);
    setRouteWarnings([]);
    if (!routeDestination) return;
    if (!routeOrigin) {
      setRouteError("Wybierz nieruchomość, aby wyznaczyć trasę.");
      callbacks.current.onRouteError?.("Wybierz nieruchomość, aby wyznaczyć trasę.");
      return;
    }
    const origin = routeOrigin;
    const destination = routeDestination;
    const routeMap = map;
    async function calculateRoute() {
      try {
        const { Route } = await importLibrary("routes");
        const { routes } = await Route.computeRoutes({
          origin,
          destination: { lat: destination.lat, lng: destination.lng },
          travelMode: destination.mode,
          fields: ["path", "viewport", "localizedValues", "warnings"],
          language: "pl",
        });
        if (cancelled) return;
        const route = routes?.[0];
        if (!route || !route.localizedValues?.distance || !route.localizedValues.duration) {
          throw new Error("Brak trasy lub informacji o dystansie i czasie.");
        }
        polylines = route.createPolylines();
        polylines.forEach((line) => line.setMap(routeMap));
        if (route.viewport) routeMap.fitBounds(route.viewport, 80);
        setRouteWarnings(route.warnings ?? []);
        callbacks.current.onRouteInfo?.({ distance: route.localizedValues.distance, duration: route.localizedValues.duration });
      } catch (cause) {
        console.error("Nie udało się wyznaczyć trasy:", cause);
        if (!cancelled) {
          const message = "Nie udało się wyznaczyć trasy. Sprawdź dostęp do Routes API lub wybierz inny środek transportu.";
          setRouteError(message);
          callbacks.current.onRouteError?.(message);
        }
      }
    }
    void calculateRoute();
    return () => {
      cancelled = true;
      polylines.forEach((line) => line.setMap(null));
    };
  }, [map, routeOrigin?.lat, routeOrigin?.lng, routeDestination?.lat, routeDestination?.lng, routeDestination?.mode]);

  useEffect(() => {
    if (!map) return;
    const panorama = map.getStreetView();
    if (!streetViewTarget) {
      panorama.setVisible(false);
      return;
    }
    let cancelled = false;
    setError(null);
    const service = new google.maps.StreetViewService();
    void service.getPanorama({ location: streetViewTarget, radius: 50 }).then(() => {
      if (cancelled) return;
      panorama.setPosition(streetViewTarget);
      panorama.setVisible(true);
    }).catch((cause) => {
      console.error("Street View niedostępny:", cause);
      if (!cancelled) {
        setError("Street View nie jest dostępny w pobliżu tego miejsca.");
        callbacks.current.onCloseStreetView?.();
      }
    });
    return () => { cancelled = true; };
  }, [map, streetViewTarget]);

  if (!apiKey) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#F3EFE6] p-6 text-center">
        <div className="max-w-md rounded-[28px] border border-white/85 bg-white/80 p-6 shadow-lg backdrop-blur-xl">
          <p className="text-sm font-semibold text-stone-800">Google Maps wymaga klucza API</p>
          <p className="mt-2 text-xs text-stone-500">Dodaj NEXT_PUBLIC_GOOGLE_MAPS_API_KEY do .env.local i konfiguracji wdrożenia, a następnie uruchom aplikację ponownie.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {properties.map((property) => (
              <button key={property.id} type="button" onClick={() => onSelect(property.id)} className="rounded-full bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white">{property.priceShort}</button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" aria-label="Interaktywna mapa Google" />
      {!streetVisible && (
        <div className="absolute bottom-12 left-4 z-10 flex max-w-[calc(100%-2rem)] flex-wrap gap-1 rounded-3xl border border-white/85 bg-white/85 p-1.5 shadow-xl backdrop-blur-xl">
          {([["hybrid", "Satelita HD"], ["roadmap", "Mapa"], ["terrain", "Teren / Szlaki"]] as const).map(([type, label]) => (
            <button key={type} type="button" aria-pressed={mapType === type} onClick={() => setMapType(type)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${mapType === type ? "bg-emerald-900 text-white" : "text-stone-800 hover:bg-stone-200"}`}>{label}</button>
          ))}
          <button type="button" aria-pressed={cycling} onClick={() => setCycling((value) => !value)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${cycling ? "bg-emerald-900 text-white" : "text-stone-800 hover:bg-stone-200"}`}>Rower</button>
        </div>
      )}
      {streetVisible && <button type="button" onClick={() => map?.getStreetView().setVisible(false)} className="absolute bottom-12 left-4 z-10 rounded-full border border-white/85 bg-white/90 px-4 py-2 text-xs font-bold text-stone-900 shadow-xl backdrop-blur-xl">← Powrót do mapy</button>}
      {(error || routeError || routeWarnings.length > 0) && (
        <div role="status" className="absolute left-4 top-20 z-10 max-w-sm rounded-2xl bg-white/95 p-3 text-xs text-stone-900 shadow-lg">
          {error && <p>{error}</p>}
          {routeError && <p>{routeError}</p>}
          {routeWarnings.map((warning) => <p key={warning}>{warning}</p>)}
          {error && <button type="button" onClick={() => setError(null)} className="mt-1 font-bold underline">Zamknij</button>}
        </div>
      )}
    </div>
  );
}
