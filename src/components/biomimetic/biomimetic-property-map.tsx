"use client";

import React, { useEffect, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { FuturisticMapLayers, type ActiveLayerType } from "../../lib/futuristicLayers";
import {
  AirVent,
  Bike,
  Box,
  Clock3,
  CloudSun,
  Flower2,
  Mountain,
  Plane,
  Route as RouteIcon,
  Sun,
  Trees,
} from "lucide-react";

export interface PropertyMarkerData {
  id: string;
  priceShort: string;
  lat: number;
  lng: number;
  ecoScore?: number;
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
export type IntelligenceLayer = "solar" | "air" | "pollen" | "weather" | "terrain" | "timezone";
export type VisualLayer = IntelligenceLayer | "bicycling" | "range" | "routes" | "streetview" | "orbit" | "aerial" | null;
export type PollenType = "TREE_UPI" | "GRASS_UPI" | "WEED_UPI";

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
  onMapError: (error: string | null) => void;
  onRouteWarnings?: (warnings: string[]) => void;
  streetViewTarget?: MapPoint | null;
  onStreetViewRequest?: (point: MapPoint) => void;
  onCloseStreetView?: () => void;
  pickLocationMode?: boolean;
  onPickLocation?: (coords: MapPoint) => void;
  onIntelligenceRequest?: (tab: IntelligenceLayer, point: MapPoint) => void;
  activeVisualLayer?: VisualLayer;
  onVisualLayerChange?: (layer: VisualLayer) => void;
  selectedPoint?: MapPoint | null;
  pollenType?: PollenType;
  onZoomChange?: (zoom: number) => void;
}

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
let loaderConfigured = false;
const DEFAULT_CENTER = { lat: 50.967, lng: 16.615 };

export function heatmapTileUrl(service: "airquality" | "pollen", type: string, coord: { x: number; y: number }, zoom: number, key: string): string {
  const count = 2 ** zoom;
  if (zoom < 0 || zoom > 16 || coord.y < 0 || coord.y >= count) return "";
  const x = ((coord.x % count) + count) % count;
  return `https://${service}.googleapis.com/v1/mapTypes/${type}/heatmapTiles/${zoom}/${x}/${coord.y}?key=${encodeURIComponent(key)}`;
}

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
  onMapError,
  onRouteWarnings,
  streetViewTarget,
  onStreetViewRequest,
  onCloseStreetView,
  pickLocationMode = false,
  onPickLocation,
  onIntelligenceRequest,
  activeVisualLayer,
  onVisualLayerChange,
  selectedPoint,
  pollenType = "TREE_UPI",
  onZoomChange,
}: BiomimeticMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbacks = useRef({
    onHover, onSelect, onSelectGooglePlace, onRouteInfo, onRouteError, onRouteWarnings, onMapError,
    onStreetViewRequest, onCloseStreetView, pickLocationMode, onPickLocation, onIntelligenceRequest, onVisualLayerChange, onZoomChange,
    onRouteStop: (_point: MapPoint) => {},
  });
  callbacks.current = {
    onHover, onSelect, onSelectGooglePlace, onRouteInfo, onRouteError, onRouteWarnings, onMapError,
    onStreetViewRequest, onCloseStreetView, pickLocationMode, onPickLocation, onIntelligenceRequest, onVisualLayerChange, onZoomChange,
    onRouteStop: (point) => { void addRouteStop(point); },
  };
  const markers2d = useRef(new Map<string, google.maps.Marker>());
  const mapRef = useRef<google.maps.Map | null>(null);
  const layersManagerRef = useRef<FuturisticMapLayers | null>(null);
  const routePlanner = useRef({ active: false, points: [] as MapPoint[] });
  const routePlanLines = useRef<google.maps.Polyline[]>([]);
  const routePlanMarkers = useRef<google.maps.Marker[]>([]);
  const routePlanRequest = useRef(0);
  const [map2d, setMap2d] = useState<google.maps.Map | null>(null);
  const [activeLayer, setActiveLayer] = useState<ActiveLayerType>("none");
  const [radarTime, setRadarTime] = useState("");
  const [orbitActive, setOrbitActive] = useState(false);
  const [orbitRequest, setOrbitRequest] = useState<(MapPoint & { ts: number }) | null>(null);
  const [localVisualLayer, setLocalVisualLayer] = useState<VisualLayer>(null);
  const visualLayer = activeVisualLayer !== undefined ? activeVisualLayer : localVisualLayer;
  const [routePlanActive, setRoutePlanActive] = useState(false);
  const [routeStopCount, setRouteStopCount] = useState(0);
  const [routePlanInfo, setRoutePlanInfo] = useState<RouteInfo | null>(null);
  const [routePlanError, setRoutePlanError] = useState<string | null>(null);
  const placeRequest = useRef(0);

  function setVisualLayer(layer: VisualLayer) {
    setLocalVisualLayer(layer);
    if (layer !== "routes") {
      routePlanner.current.active = false;
      setRoutePlanActive(false);
    }
    onVisualLayerChange?.(layer);
  }

  useEffect(() => {
    if (!apiKey) callbacks.current.onMapError("Google Maps wymaga klucza API. Dodaj NEXT_PUBLIC_GOOGLE_MAPS_API_KEY do konfiguracji i uruchom aplikację ponownie.");
  }, []);

  useEffect(() => {
    if (!apiKey || !containerRef.current) return;
    let cancelled = false;
    let instance: google.maps.Map | null = null;
    let clickListener: google.maps.MapsEventListener | undefined;
    let visibleListener: google.maps.MapsEventListener | undefined;
    let renderingListener: google.maps.MapsEventListener | undefined;
    let zoomListener: google.maps.MapsEventListener | undefined;

    async function initialize() {
      try {
        if (!loaderConfigured) {
          setOptions({ key: apiKey, v: "beta", language: "pl", region: "PL" });
          loaderConfigured = true;
        }
        const { Map } = await importLibrary("maps");
        if (cancelled || !containerRef.current) return;
        instance = new Map(containerRef.current, {
          center: DEFAULT_CENTER,
          zoom: 14,
          mapTypeId: "hybrid",
          tilt: 55,
          heading: 20,
          renderingType: google.maps.RenderingType.VECTOR,
          tiltInteractionEnabled: true,
          headingInteractionEnabled: true,
          disableDefaultUI: false,
          mapTypeControl: true,
          zoomControl: true,
          streetViewControl: true,
          rotateControl: true,
          fullscreenControl: true,
          scaleControl: true,
        });
        layersManagerRef.current = new FuturisticMapLayers(instance);
        callbacks.current.onZoomChange?.(instance.getZoom() ?? 14);
        zoomListener = instance.addListener("zoom_changed", () => {
          const zoom = instance?.getZoom();
          if (zoom != null) callbacks.current.onZoomChange?.(zoom);
        });
        renderingListener = instance.addListener("renderingtype_changed", () => {
          if (instance?.getRenderingType() === google.maps.RenderingType.RASTER) {
            callbacks.current.onMapError("Mapa działa w trybie rastrowym: obrót i nachylenie mogą być niedostępne. Sprawdź obsługę WebGL2.");
          }
        });
        const panorama = instance.getStreetView();
        visibleListener = panorama.addListener("visible_changed", () => {
          if (!panorama.getVisible()) callbacks.current.onCloseStreetView?.();
        });
        clickListener = instance.addListener("click", async (event: google.maps.MapMouseEvent | google.maps.IconMouseEvent) => {
          if (callbacks.current.pickLocationMode) {
            if ("placeId" in event && event.placeId) event.stop();
            if (event.latLng) callbacks.current.onPickLocation?.(event.latLng.toJSON());
            return;
          }
          if (routePlanner.current.active && event.latLng) {
            if ("placeId" in event && event.placeId) event.stop();
            callbacks.current.onRouteStop(event.latLng.toJSON());
            return;
          }
          if (!("placeId" in event) || !event.placeId) return;
          event.stop();
          const request = ++placeRequest.current;
          callbacks.current.onMapError(null);
          try {
            const { Place } = await importLibrary("places");
            const place = new Place({ id: event.placeId, requestedLanguage: "pl" });
            await place.fetchFields({
              fields: ["displayName", "nationalPhoneNumber", "websiteURI", "regularOpeningHours", "photos", "location", "rating", "attributions"],
            });
            if (!cancelled && request === placeRequest.current) callbacks.current.onSelectGooglePlace(place);
          } catch (cause) {
            console.error("Nie udało się pobrać miejsca Google:", cause);
            if (!cancelled && request === placeRequest.current) callbacks.current.onMapError("Nie udało się pobrać informacji o miejscu. Sprawdź dostęp do Places API (New).");
          }
        });
        setMap2d(instance);
        mapRef.current = instance;
      } catch (cause) {
        console.error("Nie udało się załadować Google Maps:", cause);
        if (!cancelled) callbacks.current.onMapError("Nie udało się załadować Google Maps. Sprawdź klucz, dostęp do API i połączenie.");
      }
    }

    void initialize();
    return () => {
      cancelled = true;
      clickListener?.remove();
      visibleListener?.remove();
      renderingListener?.remove();
      zoomListener?.remove();
      layersManagerRef.current?.clearAll();
      layersManagerRef.current = null;
      if (instance) google.maps.event.clearInstanceListeners(instance);
      mapRef.current = null;
      setMap2d(null);
    };
  }, []);

  function activateVisualLayer(layer: VisualLayer) {
    setVisualLayer(layer);
  }

  function getCurrentMapPoint(): MapPoint {
    return selectedPoint ?? routeOrigin ?? map2d?.getCenter()?.toJSON() ?? DEFAULT_CENTER;
  }

  function clearRoutePlan() {
    routePlanRequest.current += 1;
    routePlanLines.current.forEach((line) => line.setMap(null));
    routePlanLines.current = [];
    routePlanMarkers.current.forEach((marker) => {
      google.maps.event.clearInstanceListeners(marker);
      marker.setMap(null);
    });
    routePlanMarkers.current = [];
    routePlanner.current.points = [];
    setRouteStopCount(0);
    setRoutePlanInfo(null);
    setRoutePlanError(null);
  }

  async function addRouteStop(point: MapPoint) {
    const activeMap = mapRef.current;
    if (!routePlanner.current.active || !activeMap) return;
    const points = [...routePlanner.current.points, point];
    routePlanner.current.points = points;
    setRouteStopCount(points.length);
    routePlanMarkers.current.push(new google.maps.Marker({
      map: activeMap,
      position: point,
      label: `${points.length}`,
      title: `Punkt objazdu ${points.length}`,
    }));
    if (points.length < 2) return;

    const requestId = ++routePlanRequest.current;
    routePlanLines.current.forEach((line) => line.setMap(null));
    routePlanLines.current = [];
    try {
      const { Route } = await importLibrary("routes");
      const origin = routeOrigin ?? activeMap.getCenter()?.toJSON();
      if (!origin) throw new Error("Nie można odczytać środka mapy.");
      const destination = points[points.length - 1];
      const intermediates = points.slice(0, -1).map((location) => ({ location }));
      const result = await Route.computeRoutes({
        origin,
        destination,
        intermediates,
        optimizeWaypointOrder: intermediates.length > 0,
        travelMode: "DRIVING",
        fields: ["path", "viewport", "localizedValues", "warnings", "optimizedIntermediateWaypointIndices"],
        language: "pl",
      });
      if (requestId !== routePlanRequest.current) return;
      const selectedRoute = result.routes?.[0];
      if (!selectedRoute) throw new Error("Nie znaleziono trasy objazdu.");
      routePlanLines.current = selectedRoute.createPolylines();
      routePlanLines.current.forEach((line) => line.setMap(mapRef.current));
      if (selectedRoute.viewport) activeMap.fitBounds(selectedRoute.viewport, 64);
      callbacks.current.onRouteWarnings?.(selectedRoute.warnings ?? []);
      callbacks.current.onRouteInfo?.({
        distance: selectedRoute.localizedValues?.distance ?? "—",
        duration: selectedRoute.localizedValues?.duration ?? "—",
      });
      setRoutePlanInfo({
        distance: selectedRoute.localizedValues?.distance ?? "—",
        duration: selectedRoute.localizedValues?.duration ?? "—",
      });
      setRoutePlanError(null);
    } catch (cause) {
      console.error("Nie udało się zoptymalizować objazdu:", cause);
      if (requestId === routePlanRequest.current) {
        const message = "Nie udało się zoptymalizować objazdu. Sprawdź dostęp do Routes API.";
        callbacks.current.onRouteError?.(message);
        setRoutePlanError(message);
      }
    }
  }

  useEffect(() => {
    if (!map2d) return;
    if (visualLayer !== "pollen" || !apiKey) return;
    const tiles = new google.maps.ImageMapType({
      tileSize: new google.maps.Size(256, 256),
      opacity: 0.65,
      maxZoom: 16,
      getTileUrl: (coord, zoom) => heatmapTileUrl("pollen", pollenType, coord, zoom, apiKey),
    });
    map2d.overlayMapTypes.push(tiles);
    return () => {
      const index = map2d.overlayMapTypes.getArray().indexOf(tiles);
      if (index !== -1) map2d.overlayMapTypes.removeAt(index);
    };
  }, [map2d, visualLayer, pollenType]);

  useEffect(() => {
    setRadarTime("");
    setActiveLayer("none");
    const layers = layersManagerRef.current;
    if (!map2d || !layers || (visualLayer !== "weather" && visualLayer !== "terrain" && visualLayer !== "air")) return;
    let cancelled = false;
    setActiveLayer(visualLayer);
    void layers.toggleLayer(visualLayer, setRadarTime).then((active) => {
      if (!cancelled) setActiveLayer(active);
    }).catch((cause) => {
      if (cancelled) return;
      console.error("Nie udało się włączyć warstwy mapy:", cause);
      callbacks.current.onMapError("Nie udało się włączyć warstwy mapy. Sprawdź połączenie i spróbuj ponownie.");
      setActiveLayer("none");
      setLocalVisualLayer(null);
      callbacks.current.onVisualLayerChange?.(null);
    });
    return () => {
      cancelled = true;
      layers.clearAll();
    };
  }, [map2d, visualLayer]);

  useEffect(() => {
    if (!map2d || visualLayer !== "range") return;
    const center = selectedPoint ?? routeOrigin ?? map2d.getCenter()?.toJSON() ?? DEFAULT_CENTER;
    const rings = [
      { radius: 1500, color: "#a855f7", label: "15 min" },
      { radius: 1000, color: "#38bdf8", label: "10 min" },
      { radius: 500, color: "#00f5d4", label: "5 min" },
    ];
    const circles = rings.map(({ radius, color }) => new google.maps.Circle({
      map: map2d, center, radius, strokeColor: color, strokeOpacity: 0.9,
      strokeWeight: 2, fillColor: color, fillOpacity: 0.08, clickable: false,
    }));
    const labels = rings.map(({ radius, color, label }) => new google.maps.Marker({
      map: map2d,
      position: { lat: center.lat + (center.lat > 89 ? -1 : 1) * radius / 111320, lng: center.lng },
      clickable: false,
      icon: { path: google.maps.SymbolPath.CIRCLE, scale: 0 },
      label: { text: label, color, fontSize: "13px", fontWeight: "bold", className: "map-range-label" },
    }));
    return () => {
      circles.forEach((circle) => circle.setMap(null));
      labels.forEach((label) => label.setMap(null));
    };
  }, [map2d, visualLayer, selectedPoint?.lat, selectedPoint?.lng, routeOrigin?.lat, routeOrigin?.lng]);

  useEffect(() => {
    if (!map2d) return;
    map2d.setMapTypeId(visualLayer === "bicycling" ? "roadmap" : visualLayer === "terrain" ? "terrain" : "hybrid");
    if (visualLayer !== "bicycling") return;
    const bicycle = new google.maps.BicyclingLayer();
    bicycle.setMap(map2d);
    return () => bicycle.setMap(null);
  }, [map2d, visualLayer]);

  useEffect(() => {
    if (!map2d || !cameraTarget) return;
    map2d.panTo({ lat: cameraTarget.lat, lng: cameraTarget.lng });
    map2d.moveCamera({
      zoom: cameraTarget.zoom,
      tilt: cameraTarget.pitch ?? 55,
      heading: cameraTarget.bearing ?? 20,
    });
  }, [map2d, cameraTarget]);

  useEffect(() => {
    if (!map2d || !orbitRequest || (visualLayer !== "orbit" && visualLayer !== "aerial")) return;
    let frame = 0;
    const start = performance.now();
    const heading = map2d.getHeading() ?? 20;
    map2d.panTo(orbitRequest);
    if ((map2d.getZoom() ?? 0) < 15) map2d.setZoom(15);
    setOrbitActive(true);
    const animate = (now: number) => {
      const progress = Math.min((now - start) / 12000, 1);
      map2d.moveCamera({ center: orbitRequest, tilt: 60, heading: (heading + progress * 360) % 360 });
      if (progress < 1) frame = requestAnimationFrame(animate);
      else setOrbitActive(false);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      setOrbitActive(false);
    };
  }, [map2d, orbitRequest, visualLayer]);

  function startOrbit(layer: "orbit" | "aerial") {
    setVisualLayer(layer);
    setOrbitRequest({ ...getCurrentMapPoint(), ts: Date.now() });
  }

  useEffect(() => {
    if (!map2d) return;
    const markers = properties.map((property) => {
      const marker = new google.maps.Marker({
        map: map2d,
        position: { lat: property.lat, lng: property.lng },
        title: `Nieruchomość: ${property.priceShort}`,
      });
      markers2d.current.set(property.id, marker);
      marker.addListener("click", () => {
        map2d.panTo({ lat: property.lat, lng: property.lng });
        map2d.moveCamera({ zoom: 17, tilt: 60, heading: 0 });
        callbacks.current.onSelect(property.id);
      });
      marker.addListener("mouseover", () => callbacks.current.onHover(property.id));
      marker.addListener("mouseout", () => callbacks.current.onHover(null));
      return marker;
    });
    return () => {
      markers.forEach((marker) => {
        google.maps.event.clearInstanceListeners(marker);
        marker.setMap(null);
      });
      markers2d.current.clear();
    };
  }, [map2d, properties]);

  useEffect(() => {
    markers2d.current.forEach((marker, id) => {
      marker.setZIndex(id === hoveredId || id === selectedId ? google.maps.Marker.MAX_ZINDEX + 1 : undefined);
    });
  }, [map2d, properties, hoveredId, selectedId]);

  useEffect(() => {
    if (!map2d) return;
    let cancelled = false;
    let polylines: google.maps.Polyline[] = [];
    callbacks.current.onRouteInfo?.(null);
    callbacks.current.onRouteError?.(null);
    callbacks.current.onRouteWarnings?.([]);
    if (!routeDestination) return;
    if (!routeOrigin) {
      callbacks.current.onRouteError?.("Wybierz nieruchomość, aby wyznaczyć trasę.");
      return;
    }
    const origin = routeOrigin;
    const destination = routeDestination;
    const routeMap = map2d;
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
        callbacks.current.onRouteWarnings?.(route.warnings ?? []);
        callbacks.current.onRouteInfo?.({ distance: route.localizedValues.distance, duration: route.localizedValues.duration });
      } catch (cause) {
        console.error("Nie udało się wyznaczyć trasy:", cause);
        if (!cancelled) {
          const message = "Nie udało się wyznaczyć trasy. Sprawdź dostęp do Routes API lub wybierz inny środek transportu.";
          callbacks.current.onRouteError?.(message);
        }
      }
    }
    void calculateRoute();
    return () => {
      cancelled = true;
      polylines.forEach((line) => line.setMap(null));
    };
  }, [map2d, routeOrigin?.lat, routeOrigin?.lng, routeDestination?.lat, routeDestination?.lng, routeDestination?.mode]);

  useEffect(() => {
    if (!map2d) return;
    const panorama = map2d.getStreetView();
    if (!streetViewTarget) {
      panorama.setVisible(false);
      return;
    }
    let cancelled = false;
    callbacks.current.onMapError(null);
    panorama.setPosition(streetViewTarget);
    panorama.setVisible(true);
    void importLibrary("streetView").then(({ StreetViewService }) =>
      new StreetViewService().getPanorama({ location: streetViewTarget, radius: 50 }),
    ).catch((cause) => {
      console.error("Street View niedostępny:", cause);
      if (!cancelled) {
        callbacks.current.onMapError("Street View nie jest dostępny w pobliżu tego miejsca.");
        callbacks.current.onCloseStreetView?.();
      }
    });
    return () => { cancelled = true; };
  }, [map2d, streetViewTarget]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="relative z-0 h-full w-full" aria-label="Interaktywna mapa Google Maps" />
      {(routePlanInfo || routePlanError) && (
        <div role={routePlanError ? "alert" : "status"} className="absolute bottom-24 right-3 z-10 max-w-[min(360px,calc(100%-1.5rem))] rounded-lg border border-black/10 bg-white/95 px-3 py-2 text-xs text-stone-800 shadow-md">
          {routePlanError ?? `Objazd: ${routePlanInfo?.distance} · ${routePlanInfo?.duration}`}
        </div>
      )}
      {visualLayer === "range" && (
        <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-xl border border-cyan-300/30 bg-slate-950/80 px-3 py-2 text-[10px] text-white shadow-[0_0_20px_rgba(56,189,248,.22)] backdrop-blur-md">
          <div className="mb-1 font-semibold tracking-widest">ORIENTACYJNE PIERŚCIENIE — NIE IZOCHRONA</div>
          <div className="flex gap-3"><span className="text-[#00f5d4]">● 5 min / 500 m</span><span className="text-[#38bdf8]">● 10 min / 1 km</span><span className="text-[#a855f7]">● 15 min / 1,5 km</span></div>
        </div>
      )}
      <div aria-label="Warstwy Google Maps" className="pointer-events-auto absolute bottom-12 left-3 right-3 z-50 flex w-fit max-w-[calc(100%-1.5rem)] gap-1.5 overflow-x-auto rounded-lg">
        <button type="button" aria-pressed={visualLayer === "orbit"} className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium shadow-md ${visualLayer === "orbit" ? "border-[#1a73e8] bg-[#1a73e8] text-white" : "border-black/10 bg-white/95 text-stone-800 hover:bg-stone-50"}`} onClick={() => startOrbit("orbit")} title={orbitActive ? "Trwa obrót kamery" : "Obróć kamerę wokół punktu"}><Box className="h-[13px] w-[13px]" />3D</button>
        <button type="button" aria-pressed={visualLayer === "bicycling"} className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium shadow-md ${visualLayer === "bicycling" ? "border-[#1a73e8] bg-[#1a73e8] text-white" : "border-black/10 bg-white/95 text-stone-800 hover:bg-stone-50"}`} onClick={() => activateVisualLayer(visualLayer === "bicycling" ? null : "bicycling")}><Bike className="h-[13px] w-[13px]" />Rower</button>
        <button type="button" aria-pressed={Boolean(streetViewTarget)} className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium shadow-md ${streetViewTarget ? "border-[#1a73e8] bg-[#1a73e8] text-white" : "border-black/10 bg-white/95 text-stone-800 hover:bg-stone-50"}`} onClick={() => {
          if (streetViewTarget) {
            setVisualLayer(null);
            onCloseStreetView?.();
          }
          else {
            activateVisualLayer("streetview");
            onStreetViewRequest?.(getCurrentMapPoint());
          }
        }}><Trees className="h-[13px] w-[13px]" />Street View</button>
        <button type="button" aria-pressed={visualLayer === "range"} title="Orientacyjne pierścienie odległości, nie rzeczywista izochrona" className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium shadow-md ${visualLayer === "range" ? "border-[#1a73e8] bg-[#1a73e8] text-white" : "border-black/10 bg-white/95 text-stone-800 hover:bg-stone-50"}`} onClick={() => activateVisualLayer(visualLayer === "range" ? null : "range")}><Mountain className="h-[13px] w-[13px]" />15 min</button>
        <button type="button" aria-pressed={routePlanActive} title={routePlanActive ? `Klikaj punkty na mapie (${routeStopCount}); ponownie kliknij, aby zakończyć` : "Kliknij, aby dodać punkty zoptymalizowanej trasy objazdu"} className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium shadow-md ${routePlanActive ? "border-[#1a73e8] bg-[#1a73e8] text-white" : "border-black/10 bg-white/95 text-stone-800 hover:bg-stone-50"}`} onClick={() => {
          if (routePlanActive) {
            routePlanner.current.active = false;
            setRoutePlanActive(false);
            if (visualLayer === "routes") setVisualLayer(null);
          } else {
            clearRoutePlan();
            routePlanner.current.active = true;
            setRoutePlanActive(true);
            activateVisualLayer("routes");
            callbacks.current.onRouteError?.(null);
            callbacks.current.onRouteInfo?.(null);
          }
        }}><RouteIcon className="h-[13px] w-[13px]" />Trasy{routeStopCount ? ` ${routeStopCount}` : ""}</button>
        <button type="button" aria-pressed={visualLayer === "aerial"} className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium shadow-md ${visualLayer === "aerial" ? "border-[#1a73e8] bg-[#1a73e8] text-white" : "border-black/10 bg-white/95 text-stone-800 hover:bg-stone-50"}`} title="Obróć kamerę wokół punktu" onClick={() => startOrbit("aerial")}><Plane className="h-[13px] w-[13px]" />Przelot</button>
        {([
          ["solar", "Słońce", Sun],
          ["air", "Powietrze", AirVent],
          ["pollen", "Pyłki", Flower2],
          ["weather", "Pogoda", CloudSun],
          ["terrain", "Teren / m n.p.m.", Mountain],
          ["timezone", "Czas", Clock3],
        ] as const).map(([id, label, Icon]) => {
          const isActive = id === "weather" || id === "terrain" || id === "air"
            ? activeLayer === id && visualLayer === id
            : visualLayer === id;
          return <button key={id} type="button" aria-pressed={isActive} className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium shadow-md ${isActive ? "border-[#1a73e8] bg-[#1a73e8] text-white" : "border-black/10 bg-white/95 text-stone-800 hover:bg-stone-50"}`} onClick={() => {
            const next = visualLayer === id ? null : id;
            activateVisualLayer(next);
            if (next) callbacks.current.onIntelligenceRequest?.(id, getCurrentMapPoint());
          }}><Icon className="h-[13px] w-[13px]" />{label}{id === "weather" && isActive && radarTime ? ` · ${radarTime}` : ""}</button>;
        })}
      </div>
      {(visualLayer === "weather" || visualLayer === "terrain" || visualLayer === "air") && (
        <div className="absolute bottom-1 left-3 z-10 rounded bg-white/90 px-1.5 text-[10px] text-stone-800">
          {visualLayer === "weather" ? <>Radar: <a href="https://www.rainviewer.com/" target="_blank" rel="noreferrer">RainViewer</a></>
            : visualLayer === "terrain" ? <>Dane: © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>, SRTM; mapa: © <a href="https://opentopomap.org/" target="_blank" rel="noreferrer">OpenTopoMap</a> (CC-BY-SA)</>
              : <>Obraz: <a href="https://earthdata.nasa.gov/data/tools/gibs" target="_blank" rel="noreferrer">NASA GIBS</a></>}
        </div>
      )}
    </div>
  );
}
