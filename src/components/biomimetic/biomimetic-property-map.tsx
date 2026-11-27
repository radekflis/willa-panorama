"use client";

import React, { useEffect, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
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
  X,
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
  terrainRequest?: number;
  orbitTarget?: (MapPoint & { ts: number }) | null;
  onIntelligenceRequest?: (tab: IntelligenceLayer, point: MapPoint) => void;
  activeIntelligenceLayer?: IntelligenceLayer | "aerial" | null;
  onAerialRequest?: (point: MapPoint) => void;
  aerialVideoUrl?: string | null;
  onCloseAerialVideo?: () => void;
  onAerialVideoError?: () => void;
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
  onMapError,
  onRouteWarnings,
  streetViewTarget,
  onStreetViewRequest,
  onCloseStreetView,
  pickLocationMode = false,
  onPickLocation,
  terrainRequest,
  orbitTarget,
  onIntelligenceRequest,
  activeIntelligenceLayer,
  onAerialRequest,
  aerialVideoUrl,
  onCloseAerialVideo,
  onAerialVideoError,
}: BiomimeticMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const container3dRef = useRef<HTMLDivElement>(null);
  const callbacks = useRef({
    onHover, onSelect, onSelectGooglePlace, onRouteInfo, onRouteError, onRouteWarnings, onMapError,
    onStreetViewRequest, onCloseStreetView, pickLocationMode, onPickLocation, onIntelligenceRequest, onAerialRequest,
    onRouteStop: (_point: MapPoint) => {},
  });
  callbacks.current = {
    onHover, onSelect, onSelectGooglePlace, onRouteInfo, onRouteError, onRouteWarnings, onMapError,
    onStreetViewRequest, onCloseStreetView, pickLocationMode, onPickLocation, onIntelligenceRequest, onAerialRequest,
    onRouteStop: (point) => { void addRouteStop(point); },
  };
  const markers2d = useRef(new Map<string, google.maps.Marker>());
  const mapRef = useRef<google.maps.Map | null>(null);
  const pending2dCamera = useRef<{ center: MapPoint; zoom: number } | null>(null);
  const routePlanner = useRef({ active: false, points: [] as MapPoint[] });
  const routePlanLines = useRef<google.maps.Polyline[]>([]);
  const routePlanMarkers = useRef<google.maps.Marker[]>([]);
  const routePlanRequest = useRef(0);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [map3d, setMap3d] = useState<google.maps.maps3d.Map3DElement | null>(null);
  const [maps3dLibrary, setMaps3dLibrary] = useState<google.maps.Maps3DLibrary | null>(null);
  const [mapType, setMapType] = useState<"earth3d" | "hybrid" | "roadmap" | "terrain">("earth3d");
  const [bicyclingEnabled, setBicyclingEnabled] = useState(false);
  const [rangeEnabled, setRangeEnabled] = useState(false);
  const [routePlanActive, setRoutePlanActive] = useState(false);
  const [routeStopCount, setRouteStopCount] = useState(0);
  const [routePlanInfo, setRoutePlanInfo] = useState<RouteInfo | null>(null);
  const [routePlanError, setRoutePlanError] = useState<string | null>(null);
  const placeRequest = useRef(0);
  const lastOrbit = useRef<BiomimeticMapProps["orbitTarget"]>(null);

  useEffect(() => {
    if (!apiKey) callbacks.current.onMapError("Google Maps wymaga klucza API. Dodaj NEXT_PUBLIC_GOOGLE_MAPS_API_KEY do konfiguracji i uruchom aplikację ponownie.");
  }, []);

  useEffect(() => {
    if (!apiKey || !containerRef.current) return;
    let cancelled = false;
    let instance: google.maps.Map | null = null;
    let clickListener: google.maps.MapsEventListener | undefined;
    let visibleListener: google.maps.MapsEventListener | undefined;

    async function initialize() {
      try {
        if (!loaderConfigured) {
          setOptions({ key: apiKey, v: "beta", language: "pl", region: "PL" });
          loaderConfigured = true;
        }
        const [{ Map }, { Place }] = await Promise.all([
          importLibrary("maps"),
          importLibrary("places"),
          importLibrary("routes"),
          importLibrary("streetView"),
          importLibrary("marker"),
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
          disableDefaultUI: false,
          mapTypeControl: true,
          zoomControl: true,
          streetViewControl: true,
          rotateControl: true,
          fullscreenControl: true,
          scaleControl: true,
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
        setMap(instance);
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
      if (instance) google.maps.event.clearInstanceListeners(instance);
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!apiKey || !loaderConfigured) return;
    let cancelled = false;
    let instance: google.maps.maps3d.Map3DElement | null = null;
    let onClick: ((event: google.maps.maps3d.LocationClickEvent | google.maps.maps3d.PlaceClickEvent) => void) | undefined;
    let onError: (() => void) | undefined;

    async function initialize3d() {
      try {
        const library = await importLibrary("maps3d");
        if (cancelled || !container3dRef.current) return;
        const { Map3DElement, MapMode } = library;
        instance = new Map3DElement({
          mode: MapMode.HYBRID,
          center: { lat: 50.967, lng: 16.615, altitude: 150 },
          range: 1800,
          tilt: 62,
          heading: 20,
          defaultUIHidden: false,
        });
        instance.style.width = "100%";
        instance.style.height = "100%";
        onClick = (event) => {
          if (callbacks.current.pickLocationMode) {
            event.preventDefault();
            if (event.position) callbacks.current.onPickLocation?.({ lat: event.position.lat, lng: event.position.lng });
            return;
          }
          if (routePlanner.current.active && event.position) {
            event.preventDefault();
            callbacks.current.onRouteStop({ lat: event.position.lat, lng: event.position.lng });
            return;
          }
          if (!("placeId" in event)) return;
          event.preventDefault();
          const request = ++placeRequest.current;
          callbacks.current.onMapError(null);
          void importLibrary("places").then(async ({ Place }) => {
            const place = new Place({ id: event.placeId, requestedLanguage: "pl" });
            await place.fetchFields({
              fields: ["displayName", "nationalPhoneNumber", "websiteURI", "regularOpeningHours", "photos", "location", "rating", "attributions"],
            });
            if (!cancelled && request === placeRequest.current) callbacks.current.onSelectGooglePlace(place);
          }).catch((cause) => {
            console.error("Nie udało się pobrać miejsca Google:", cause);
            if (!cancelled && request === placeRequest.current) callbacks.current.onMapError("Nie udało się pobrać informacji o miejscu. Sprawdź dostęp do Places API (New).");
          });
        };
        onError = () => {
          console.error("Błąd renderowania mapy 3D Google.");
          callbacks.current.onMapError("Nie udało się wyświetlić mapy 3D. Sprawdź dostęp do Maps JavaScript API i połączenie.");
        };
        instance.addEventListener("gmp-click", onClick);
        instance.addEventListener("gmp-error", onError);
        container3dRef.current.appendChild(instance);
        setMaps3dLibrary(library);
        setMap3d(instance);
      } catch (cause) {
        console.error("Nie udało się załadować mapy 3D:", cause);
        if (!cancelled) callbacks.current.onMapError("Nie udało się załadować mapy 3D. Sprawdź dostęp do Maps JavaScript API i połączenie.");
      }
    }

    void initialize3d();
    return () => {
      cancelled = true;
      if (instance && onClick) instance.removeEventListener("gmp-click", onClick);
      if (instance && onError) instance.removeEventListener("gmp-error", onError);
      instance?.remove();
    };
  }, []);

  function changeMapType(type: "earth3d" | "hybrid" | "roadmap" | "terrain") {
    if (type === "earth3d") {
      if (mapType !== "earth3d" && map && map3d) {
        const center = map.getCenter();
        if (center) {
          map3d.center = { ...center.toJSON(), altitude: 0 };
          map3d.range = 350 * 2 ** (17 - (map.getZoom() ?? 14.6));
          map3d.tilt = 62;
          map3d.heading = map.getHeading() ?? 0;
        }
      }
    } else {
      if (mapType === "earth3d" && map3d?.center) {
        const center = { lat: map3d.center.lat, lng: map3d.center.lng };
        const zoom = map3d.range ? Math.max(0, Math.min(21, 17 - Math.log2(map3d.range / 350))) : 14;
        if (map) {
          map.setCenter(center);
          map.setZoom(zoom);
        } else {
          pending2dCamera.current = { center, zoom };
        }
      }
      map?.setMapTypeId(type);
    }
    setMapType(type);
  }

  function getCurrentMapPoint(): MapPoint {
    if (routeOrigin) return routeOrigin;
    if (mapType === "earth3d" && map3d?.center) return { lat: map3d.center.lat, lng: map3d.center.lng };
    const center = map?.getCenter()?.toJSON();
    if (center) return center;
    if (map3d?.center) return { lat: map3d.center.lat, lng: map3d.center.lng };
    return { lat: 50.967, lng: 16.615 };
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
    if (!map3d || !maps3dLibrary) return;
    const markers = properties.map((property) => {
      const marker = new maps3dLibrary.Marker3DInteractiveElement({
        position: { lat: property.lat, lng: property.lng, altitude: 30 },
        altitudeMode: "RELATIVE_TO_GROUND",
        extruded: true,
        label: property.priceShort,
        title: `Nieruchomość: ${property.priceShort}`,
      });
      marker.addEventListener("gmp-click", (event) => {
        event.stopPropagation();
        callbacks.current.onSelect(property.id);
        map3d.flyCameraTo({
          endCamera: { center: { lat: property.lat, lng: property.lng, altitude: 60 }, range: 350, tilt: 67.5, heading: 0 },
          durationMillis: 2200,
        });
      });
      marker.addEventListener("gmp-pointerover", () => callbacks.current.onHover(property.id));
      marker.addEventListener("gmp-pointerout", () => callbacks.current.onHover(null));
      map3d.appendChild(marker);
      return marker;
    });
    return () => markers.forEach((marker) => marker.remove());
  }, [map3d, maps3dLibrary, properties]);

  useEffect(() => {
    if (orbitTarget) {
      setMapType("earth3d");
    }
  }, [orbitTarget]);

  useEffect(() => {
    if (streetViewTarget) changeMapType("hybrid");
  }, [streetViewTarget]);

  useEffect(() => {
    if (routeDestination) changeMapType("hybrid");
  }, [routeDestination]);

  useEffect(() => {
    if (!map || mapType === "earth3d") return;
    if (pending2dCamera.current) {
      map.setCenter(pending2dCamera.current.center);
      map.setZoom(pending2dCamera.current.zoom);
      pending2dCamera.current = null;
    }
    map.setMapTypeId(mapType);
    requestAnimationFrame(() => google.maps.event.trigger(map, "resize"));
  }, [map, mapType]);

  useEffect(() => {
    if (!map || mapType === "earth3d" || !bicyclingEnabled) return;
    let cancelled = false;
    let layer: google.maps.BicyclingLayer | null = null;
    void importLibrary("maps").then(({ BicyclingLayer }) => {
      if (cancelled) return;
      layer = new BicyclingLayer();
      layer.setMap(map);
    }).catch((cause) => {
      console.error("Nie udało się włączyć warstwy rowerowej:", cause);
      callbacks.current.onMapError("Nie udało się włączyć warstwy rowerowej Google Maps.");
      setBicyclingEnabled(false);
    });
    return () => {
      cancelled = true;
      layer?.setMap(null);
    };
  }, [map, mapType, bicyclingEnabled]);

  useEffect(() => {
    if (!map || mapType === "earth3d" || !rangeEnabled) return;
    const circle = new google.maps.Circle({
      map,
      center: routeOrigin ?? map.getCenter()?.toJSON() ?? getCurrentMapPoint(),
      radius: 10_000,
      clickable: false,
      fillColor: "#1a73e8",
      fillOpacity: 0.12,
      strokeColor: "#1a73e8",
      strokeOpacity: 0.8,
      strokeWeight: 2,
    });
    return () => circle.setMap(null);
  }, [map, mapType, rangeEnabled, routeOrigin?.lat, routeOrigin?.lng]);

  useEffect(() => {
    if (terrainRequest && map) changeMapType("terrain");
  }, [terrainRequest, map]);

  useEffect(() => {
    if (!map || !cameraTarget) return;
    map.panTo({ lat: cameraTarget.lat, lng: cameraTarget.lng });
    map.moveCamera({
      zoom: cameraTarget.zoom,
      tilt: cameraTarget.pitch ?? 45,
      heading: cameraTarget.bearing ?? 0,
    });
  }, [map, cameraTarget]);

  useEffect(() => {
    if (!map3d || !cameraTarget) return;
    map3d.flyCameraTo({
      endCamera: {
        center: { lat: cameraTarget.lat, lng: cameraTarget.lng, altitude: 60 },
        range: 350 * 2 ** (17 - cameraTarget.zoom),
        tilt: cameraTarget.pitch ?? 45,
        heading: cameraTarget.bearing ?? 0,
      },
      durationMillis: 2200,
    });
  }, [map3d, cameraTarget]);

  useEffect(() => {
    if (!map3d || mapType !== "earth3d" || !orbitTarget || lastOrbit.current === orbitTarget) return;
    lastOrbit.current = orbitTarget;
    map3d.flyCameraAround({
      camera: { center: { lat: orbitTarget.lat, lng: orbitTarget.lng, altitude: 40 }, range: 320, tilt: 65, heading: 0 },
      durationMillis: 12000,
      rounds: 1,
    });
  }, [map3d, mapType, orbitTarget]);

  useEffect(() => {
    if (!map) return;
    const markers = properties.map((property) => {
      const marker = new google.maps.Marker({
        map,
        position: { lat: property.lat, lng: property.lng },
        title: `Nieruchomość: ${property.priceShort}`,
      });
      markers2d.current.set(property.id, marker);
      marker.addListener("click", () => {
        map.panTo({ lat: property.lat, lng: property.lng });
        map.moveCamera({ zoom: 17, tilt: 60, heading: 0 });
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
  }, [map, properties]);

  useEffect(() => {
    markers2d.current.forEach((marker, id) => {
      marker.setZIndex(id === hoveredId || id === selectedId ? google.maps.Marker.MAX_ZINDEX + 1 : undefined);
    });
  }, [map, properties, hoveredId, selectedId]);

  useEffect(() => {
    if (!map) return;
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
  }, [map, routeOrigin?.lat, routeOrigin?.lng, routeDestination?.lat, routeDestination?.lng, routeDestination?.mode]);

  useEffect(() => {
    if (!map) return;
    const panorama = map.getStreetView();
    if (!streetViewTarget) {
      panorama.setVisible(false);
      return;
    }
    let cancelled = false;
    callbacks.current.onMapError(null);
    const service = new google.maps.StreetViewService();
    void service.getPanorama({ location: streetViewTarget, radius: 50 }).then(() => {
      if (cancelled) return;
      panorama.setPosition(streetViewTarget);
      panorama.setVisible(true);
    }).catch((cause) => {
      console.error("Street View niedostępny:", cause);
      if (!cancelled) {
        callbacks.current.onMapError("Street View nie jest dostępny w pobliżu tego miejsca.");
        callbacks.current.onCloseStreetView?.();
      }
    });
    return () => { cancelled = true; };
  }, [map, streetViewTarget]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className={mapType === "earth3d" ? "relative z-0 hidden h-full w-full" : "relative z-0 h-full w-full"} aria-label="Interaktywna mapa Google" />
      <div ref={container3dRef} className={mapType === "earth3d" ? "relative z-0 h-full w-full" : "relative z-0 hidden h-full w-full"} aria-label="Interaktywna mapa Google 3D" />
      {aerialVideoUrl && (
        <div className="absolute inset-4 z-20 overflow-hidden rounded-xl border border-white/30 bg-black shadow-xl">
          <video className="h-full w-full object-cover" src={aerialVideoUrl} autoPlay controls muted playsInline onError={() => {
            if (onAerialVideoError) onAerialVideoError();
            else onCloseAerialVideo?.();
          }} />
          <button type="button" aria-label="Zamknij przelot" className="absolute right-2 top-2 rounded-full bg-white/95 p-1.5 text-stone-800 shadow-md" onClick={onCloseAerialVideo}><X className="h-[13px] w-[13px]" /></button>
        </div>
      )}
      {(routePlanInfo || routePlanError) && (
        <div role={routePlanError ? "alert" : "status"} className="absolute bottom-24 right-3 z-10 max-w-[min(360px,calc(100%-1.5rem))] rounded-lg border border-black/10 bg-white/95 px-3 py-2 text-xs text-stone-800 shadow-md">
          {routePlanError ?? `Objazd: ${routePlanInfo?.distance} · ${routePlanInfo?.duration}`}
        </div>
      )}
      <div aria-label="Warstwy Google Maps" className="pointer-events-auto absolute bottom-12 left-3 right-3 z-50 flex w-fit max-w-[calc(100%-1.5rem)] gap-1.5 overflow-x-auto rounded-lg">
        <button type="button" aria-pressed={mapType === "earth3d"} className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium shadow-md ${mapType === "earth3d" ? "border-[#1a73e8] bg-[#1a73e8] text-white" : "border-black/10 bg-white/95 text-stone-800 hover:bg-stone-50"}`} onClick={() => changeMapType(mapType === "earth3d" ? "hybrid" : "earth3d")}><Box className="h-[13px] w-[13px]" />3D</button>
        <button type="button" aria-pressed={bicyclingEnabled} className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium shadow-md ${bicyclingEnabled ? "border-[#1a73e8] bg-[#1a73e8] text-white" : "border-black/10 bg-white/95 text-stone-800 hover:bg-stone-50"}`} onClick={() => { if (mapType === "earth3d") changeMapType("hybrid"); setBicyclingEnabled((enabled) => !enabled); }}><Bike className="h-[13px] w-[13px]" />Rower</button>
        <button type="button" aria-pressed={Boolean(streetViewTarget)} className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium shadow-md ${streetViewTarget ? "border-[#1a73e8] bg-[#1a73e8] text-white" : "border-black/10 bg-white/95 text-stone-800 hover:bg-stone-50"}`} onClick={() => {
          if (streetViewTarget) onCloseStreetView?.();
          else {
            changeMapType("hybrid");
            onStreetViewRequest?.(getCurrentMapPoint());
          }
        }}><Trees className="h-[13px] w-[13px]" />Street View</button>
        <button type="button" aria-pressed={rangeEnabled} title="Przybliżony zasięg 15 min — okrąg 10 km, gdy brak poligonu izochrony" className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium shadow-md ${rangeEnabled ? "border-[#1a73e8] bg-[#1a73e8] text-white" : "border-black/10 bg-white/95 text-stone-800 hover:bg-stone-50"}`} onClick={() => { if (mapType === "earth3d") changeMapType("hybrid"); setRangeEnabled((enabled) => !enabled); }}><Mountain className="h-[13px] w-[13px]" />15 min</button>
        <button type="button" aria-pressed={routePlanActive} title={routePlanActive ? `Klikaj punkty na mapie (${routeStopCount}); ponownie kliknij, aby zakończyć` : "Kliknij, aby dodać punkty zoptymalizowanej trasy objazdu"} className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium shadow-md ${routePlanActive ? "border-[#1a73e8] bg-[#1a73e8] text-white" : "border-black/10 bg-white/95 text-stone-800 hover:bg-stone-50"}`} onClick={() => {
          if (routePlanActive) {
            routePlanner.current.active = false;
            setRoutePlanActive(false);
          } else {
            clearRoutePlan();
            routePlanner.current.active = true;
            setRoutePlanActive(true);
            changeMapType("hybrid");
            callbacks.current.onRouteError?.(null);
            callbacks.current.onRouteInfo?.(null);
          }
        }}><RouteIcon className="h-[13px] w-[13px]" />Trasy{routeStopCount ? ` ${routeStopCount}` : ""}</button>
        <button type="button" aria-pressed={activeIntelligenceLayer === "aerial"} className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium shadow-md ${activeIntelligenceLayer === "aerial" ? "border-[#1a73e8] bg-[#1a73e8] text-white" : "border-black/10 bg-white/95 text-stone-800 hover:bg-stone-50"}`} title="Odtwórz widok Aerial View lub orbitę 3D" onClick={() => onAerialRequest?.(getCurrentMapPoint())}><Plane className="h-[13px] w-[13px]" />Przelot</button>
        {([
          ["solar", "Słońce", Sun],
          ["air", "Powietrze", AirVent],
          ["pollen", "Pyłki", Flower2],
          ["weather", "Pogoda", CloudSun],
          ["terrain", "Teren", Mountain],
          ["timezone", "Czas", Clock3],
        ] as const).map(([id, label, Icon]) => (
          <button key={id} type="button" aria-pressed={activeIntelligenceLayer === id} className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium shadow-md ${activeIntelligenceLayer === id ? "border-[#1a73e8] bg-[#1a73e8] text-white" : "border-black/10 bg-white/95 text-stone-800 hover:bg-stone-50"}`} onClick={() => {
            if (id === "terrain") changeMapType("terrain");
            callbacks.current.onIntelligenceRequest?.(id, getCurrentMapPoint());
          }}><Icon className="h-[13px] w-[13px]" />{label}</button>
        ))}
      </div>
    </div>
  );
}
