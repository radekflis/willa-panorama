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
import type { GeoIntelligence } from "../../app/api/geo/intelligence/route";

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
export type VisualLayer = IntelligenceLayer | "bicycling" | "range" | "routes" | "streetview" | null;
type PollenType = "TREE_UPI" | "GRASS_UPI" | "WEED_UPI";

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
  activeVisualLayer?: VisualLayer;
  onVisualLayerChange?: (layer: VisualLayer) => void;
  intelligencePoint?: MapPoint;
  intelligenceData?: GeoIntelligence | null;
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
  activeVisualLayer,
  onVisualLayerChange,
  intelligencePoint,
  intelligenceData,
  onAerialRequest,
  aerialVideoUrl,
  onCloseAerialVideo,
  onAerialVideoError,
}: BiomimeticMapProps) {
  const container2dRef = useRef<HTMLDivElement>(null);
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
  const [map2d, setMap2d] = useState<google.maps.Map | null>(null);
  const [map3d, setMap3d] = useState<google.maps.maps3d.Map3DElement | null>(null);
  const [maps3dLibrary, setMaps3dLibrary] = useState<google.maps.Maps3DLibrary | null>(null);
  const [mapType, setMapType] = useState<"earth3d" | "hybrid" | "roadmap" | "terrain">("earth3d");
  const [localVisualLayer, setLocalVisualLayer] = useState<VisualLayer>(null);
  const visualLayer = activeVisualLayer !== undefined ? activeVisualLayer : localVisualLayer;
  const [pollenType, setPollenType] = useState<PollenType>("TREE_UPI");
  const [routePlanActive, setRoutePlanActive] = useState(false);
  const [routeStopCount, setRouteStopCount] = useState(0);
  const [routePlanInfo, setRoutePlanInfo] = useState<RouteInfo | null>(null);
  const [routePlanError, setRoutePlanError] = useState<string | null>(null);
  const [tileDiagnostic, setTileDiagnostic] = useState<string | null>(null);
  const placeRequest = useRef(0);
  const lastOrbit = useRef<BiomimeticMapProps["orbitTarget"]>(null);

  function setVisualLayer(layer: VisualLayer) {
    setLocalVisualLayer(layer);
    onVisualLayerChange?.(layer);
  }

  useEffect(() => {
    if (!apiKey) callbacks.current.onMapError("Google Maps wymaga klucza API. Dodaj NEXT_PUBLIC_GOOGLE_MAPS_API_KEY do konfiguracji i uruchom aplikację ponownie.");
  }, []);

  useEffect(() => {
    if (!apiKey || !container2dRef.current) return;
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
        if (cancelled || !container2dRef.current) return;
        instance = new Map(container2dRef.current, {
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
      if (instance) google.maps.event.clearInstanceListeners(instance);
      mapRef.current = null;
      setMap2d(null);
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
      if (mapType !== "earth3d" && map2d && map3d) {
        const center = map2d.getCenter();
        if (center) {
          map3d.center = { ...center.toJSON(), altitude: 0 };
          map3d.range = 350 * 2 ** (17 - (map2d.getZoom() ?? 14.6));
          map3d.tilt = 62;
          map3d.heading = map2d.getHeading() ?? 0;
        }
      }
    } else {
      if (mapType === "earth3d" && map3d?.center) {
        const center = { lat: map3d.center.lat, lng: map3d.center.lng };
        const zoom = map3d.range ? Math.max(0, Math.min(21, 17 - Math.log2(map3d.range / 350))) : 14;
        if (map2d) {
          map2d.setCenter(center);
          map2d.setZoom(zoom);
        } else {
          pending2dCamera.current = { center, zoom };
        }
      }
      map2d?.setMapTypeId(type);
      map2d?.setTilt(45);
    }
    setMapType(type);
  }

  function activateVisualLayer(layer: VisualLayer, type: "hybrid" | "roadmap" | "terrain" = "hybrid") {
    setVisualLayer(layer);
    if (layer) changeMapType(type);
  }

  function getCurrentMapPoint(): MapPoint {
    if (routeOrigin) return routeOrigin;
    if (mapType === "earth3d" && map3d?.center) return { lat: map3d.center.lat, lng: map3d.center.lng };
    const center = map2d?.getCenter()?.toJSON();
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
      setVisualLayer(null);
      setMapType("earth3d");
    }
  }, [orbitTarget]);

  useEffect(() => {
    if (streetViewTarget) activateVisualLayer("streetview");
  }, [streetViewTarget]);

  useEffect(() => {
    if (routeDestination) activateVisualLayer("routes");
  }, [routeDestination]);

  useEffect(() => {
    if (activeIntelligenceLayer === "solar" || activeIntelligenceLayer === "air" || activeIntelligenceLayer === "pollen") {
      activateVisualLayer(activeIntelligenceLayer);
    } else if (activeIntelligenceLayer === "terrain") {
      activateVisualLayer("terrain", "terrain");
    } else if (activeIntelligenceLayer === null) {
      if (visualLayer === "solar" || visualLayer === "air" || visualLayer === "pollen" || visualLayer === "terrain") {
        setVisualLayer(null);
      }
    }
  }, [activeIntelligenceLayer]);

  useEffect(() => {
    if (!map2d || mapType === "earth3d") return;
    if (pending2dCamera.current) {
      map2d.setCenter(pending2dCamera.current.center);
      map2d.setZoom(pending2dCamera.current.zoom);
      pending2dCamera.current = null;
    }
    map2d.setMapTypeId(mapType);
    requestAnimationFrame(() => google.maps.event.trigger(map2d, "resize"));
  }, [map2d, mapType]);

  useEffect(() => {
    if (!map2d || mapType === "earth3d" || !visualLayer) return;
    const zoomByLayer: Partial<Record<Exclude<VisualLayer, null>, number>> = {
      air: 10,
      pollen: 6,
      bicycling: 13,
      terrain: 12,
      range: 11,
      solar: 16,
    };
    const zoom = zoomByLayer[visualLayer];
    if (zoom == null) return;
    if (visualLayer === "bicycling") map2d.setMapTypeId("roadmap");
    else if (visualLayer === "terrain") map2d.setMapTypeId("terrain");
    else map2d.setMapTypeId("hybrid");
    map2d.setZoom(zoom);
    requestAnimationFrame(() => google.maps.event.trigger(map2d, "resize"));
  }, [map2d, mapType, visualLayer]);

  useEffect(() => {
    if (!map2d || mapType === "earth3d" || !apiKey || (visualLayer !== "air" && visualLayer !== "pollen")) return;
    const urlPrefix = visualLayer === "air" ? "airquality" : "pollen";
    const mapTypeName = visualLayer === "air" ? "UAQI_INDIGO_PERSIAN" : pollenType;
    const opacity = visualLayer === "air" ? 0.72 : 0.7;
    map2d.overlayMapTypes.clear();
    const heatmap = new google.maps.ImageMapType({
      name: visualLayer === "air" ? "Air Quality Heatmap Tiles" : "Pollen Heatmap Tiles",
      opacity,
      tileSize: new google.maps.Size(256, 256),
      minZoom: visualLayer === "pollen" ? 3 : undefined,
      maxZoom: visualLayer === "pollen" ? 16 : undefined,
      getTileUrl: (coord, zoom) => {
        if (visualLayer === "pollen" && (zoom < 3 || zoom > 16)) return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
        return `https://${urlPrefix}.googleapis.com/v1/mapTypes/${mapTypeName}/heatmapTiles/${zoom}/${coord.x}/${coord.y}?key=${encodeURIComponent(apiKey)}`;
      },
    });
    const index = map2d.overlayMapTypes.push(heatmap) - 1;
    return () => {
      if (map2d.overlayMapTypes.getAt(index) === heatmap) map2d.overlayMapTypes.removeAt(index);
    };
  }, [map2d, mapType, visualLayer, pollenType]);

  useEffect(() => {
    if (!map2d || mapType === "earth3d" || !apiKey || (visualLayer !== "air" && visualLayer !== "pollen")) {
      setTileDiagnostic(null);
      return;
    }
    const center = map2d.getCenter();
    if (!center) return;
    const zoom = visualLayer === "air" ? 10 : 6;
    const scale = 2 ** zoom;
    const point = center.toJSON();
    const sinLat = Math.sin(point.lat * Math.PI / 180);
    const x = Math.floor((point.lng + 180) / 360 * scale);
    const y = Math.floor((0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale);
    const service = visualLayer === "air" ? "airquality" : "pollen";
    const mapTypeName = visualLayer === "air" ? "UAQI_INDIGO_PERSIAN" : pollenType;
    const layerLabel = visualLayer === "air" ? "Powietrze" : "Pyłki";
    const controller = new AbortController();
    setTileDiagnostic(`Silnik: 2D | Warstwa: ${layerLabel} | Zoom: ${zoom} | Kafelki: sprawdzanie…`);
    void fetch(`https://${service}.googleapis.com/v1/mapTypes/${mapTypeName}/heatmapTiles/${zoom}/${x}/${y}?key=${encodeURIComponent(apiKey)}`, {
      signal: controller.signal,
    }).then((response) => {
      setTileDiagnostic(`Silnik: 2D | Warstwa: ${layerLabel} | Zoom: ${zoom} | Kafelki: ${response.ok ? "OK" : `${response.status} ${response.statusText || "Błąd"}`}`);
    }).catch((cause) => {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setTileDiagnostic(`Silnik: 2D | Warstwa: ${layerLabel} | Zoom: ${zoom} | Kafelki: Błąd sieci`);
    });
    return () => controller.abort();
  }, [map2d, mapType, visualLayer, pollenType]);

  useEffect(() => {
    if (!map2d || mapType === "earth3d" || visualLayer !== "bicycling") return;
    let cancelled = false;
    let layer: google.maps.BicyclingLayer | null = null;
    map2d.setMapTypeId("roadmap");
    void importLibrary("maps").then(({ BicyclingLayer }) => {
      if (cancelled) return;
      layer = new BicyclingLayer();
      layer.setMap(map2d);
    }).catch((cause) => {
      console.error("Nie udało się włączyć warstwy rowerowej:", cause);
      callbacks.current.onMapError("Nie udało się włączyć warstwy rowerowej Google Maps.");
      setVisualLayer(null);
    });
    return () => {
      cancelled = true;
      layer?.setMap(null);
    };
  }, [map2d, mapType, visualLayer]);

  useEffect(() => {
    if (!map2d || mapType === "earth3d" || visualLayer !== "range") return;
    const center = routeOrigin ?? intelligencePoint ?? map2d.getCenter()?.toJSON() ?? getCurrentMapPoint();
    const zones = [
      { radius: 3500, color: "#00f5d4" },
      { radius: 7000, color: "#38bdf8" },
      { radius: 11000, color: "#a855f7" },
    ];
    const circles = zones.map((zone) => new google.maps.Circle({
      map: map2d, center, radius: zone.radius, clickable: false,
      fillColor: zone.color, fillOpacity: 0.16,
      strokeColor: zone.color, strokeOpacity: 0.95, strokeWeight: 2.5,
      zIndex: 15_000 - zone.radius,
    }));
    return () => circles.forEach((circle) => circle.setMap(null));
  }, [map2d, mapType, visualLayer, routeOrigin?.lat, routeOrigin?.lng, intelligencePoint?.lat, intelligencePoint?.lng]);

  useEffect(() => {
    if (!map2d || mapType === "earth3d" || visualLayer !== "solar") return;
    const center = intelligencePoint ?? routeOrigin ?? map2d.getCenter()?.toJSON() ?? getCurrentMapPoint();
    const area = intelligenceData?.solar?.areaMeters2 ?? 100;
    const radius = Math.max(180, Math.min(900, Math.sqrt(area) * 35));
    const layers = [
      { scale: 1.2, fill: "#f59e0b", fillOpacity: 0.06, stroke: "#f59e0b", opacity: 0.35, width: 8 },
      { scale: 0.82, fill: "#f97316", fillOpacity: 0.1, stroke: "#fb923c", opacity: 0.75, width: 4 },
      { scale: 0.52, fill: "#a855f7", fillOpacity: 0.14, stroke: "#c084fc", opacity: 0.95, width: 2 },
    ];
    const circles = layers.map((layer) => new google.maps.Circle({
      map: map2d, center, radius: radius * layer.scale, clickable: false,
      fillColor: layer.fill, fillOpacity: layer.fillOpacity,
      strokeColor: layer.stroke, strokeOpacity: layer.opacity, strokeWeight: layer.width,
    }));
    const label = document.createElement("div");
    label.style.cssText = "padding:9px 12px;border:1px solid rgba(251,191,36,.7);border-radius:12px;background:rgba(18,12,31,.88);color:#fff;font:600 12px/1.4 system-ui;box-shadow:0 0 22px rgba(245,158,11,.45);white-space:nowrap";
    const sunshine = intelligenceData?.solar?.maxSunshineHoursPerYear;
    const power = intelligenceData?.solar?.maxPowerKw;
    label.textContent = sunshine != null || power != null
      ? `${sunshine != null ? `${Math.round(sunshine).toLocaleString("pl-PL")} godz./rok` : "Nasłonecznienie"}${power != null ? ` · ${power.toLocaleString("pl-PL", { maximumFractionDigits: 1 })} kW` : ""}`
      : "Solar API · analiza nasłonecznienia";
    const info = new google.maps.InfoWindow({ content: label, position: center, disableAutoPan: true });
    info.open(map2d);
    return () => {
      circles.forEach((circle) => circle.setMap(null));
      info.close();
    };
  }, [map2d, mapType, visualLayer, intelligencePoint?.lat, intelligencePoint?.lng, routeOrigin?.lat, routeOrigin?.lng, intelligenceData?.solar]);

  useEffect(() => {
    if (!map2d || mapType === "earth3d" || visualLayer !== "terrain" || intelligenceData?.elevation == null) return;
    const position = intelligencePoint ?? routeOrigin ?? map2d.getCenter()?.toJSON() ?? getCurrentMapPoint();
    const label = document.createElement("div");
    label.style.cssText = "padding:7px 10px;border-radius:9px;background:rgba(5,46,22,.9);border:1px solid #34d399;color:#ecfdf5;font:700 13px/1.2 system-ui;box-shadow:0 0 18px rgba(52,211,153,.45)";
    label.textContent = `${Math.round(intelligenceData.elevation).toLocaleString("pl-PL")} m n.p.m.`;
    const info = new google.maps.InfoWindow({ content: label, position, disableAutoPan: true });
    info.open(map2d);
    return () => info.close();
  }, [map2d, mapType, visualLayer, intelligencePoint?.lat, intelligencePoint?.lng, routeOrigin?.lat, routeOrigin?.lng, intelligenceData?.elevation]);

  useEffect(() => {
    if (terrainRequest && map2d) activateVisualLayer("terrain", "terrain");
  }, [terrainRequest, map2d]);

  useEffect(() => {
    if (!map2d || !cameraTarget) return;
    map2d.panTo({ lat: cameraTarget.lat, lng: cameraTarget.lng });
    map2d.moveCamera({
      zoom: cameraTarget.zoom,
      tilt: cameraTarget.pitch ?? 45,
      heading: cameraTarget.bearing ?? 0,
    });
  }, [map2d, cameraTarget]);

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
  }, [map2d, streetViewTarget]);

  const pollenPoint = intelligencePoint ?? routeOrigin ?? { lat: 50.967, lng: 16.615 };
  const pollenInPoland = pollenPoint.lat >= 49 && pollenPoint.lat <= 55 && pollenPoint.lng >= 14 && pollenPoint.lng <= 24.5;
  const pollenOutOfSeason = pollenInPoland && new Date().getMonth() === 10
    && intelligenceData?.pollen?.some((item) => item.inSeason === true) !== true;

  return (
    <div className="relative h-full w-full">
      <div ref={container2dRef} className={mapType === "earth3d" ? "relative z-0 hidden h-full w-full" : "relative z-0 block h-full w-full"} aria-label="Interaktywna mapa Google 2D" />
      <div ref={container3dRef} className={mapType === "earth3d" ? "relative z-0 block h-full w-full" : "relative z-0 hidden h-full w-full"} aria-label="Interaktywna mapa Google 3D" />
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
      {tileDiagnostic && (
        <div role="status" className="pointer-events-none absolute left-3 top-3 z-20 max-w-[calc(100%-1.5rem)] rounded-md border border-cyan-300/25 bg-slate-950/85 px-2.5 py-1 text-[10px] text-cyan-50 shadow-md backdrop-blur-sm">
          {tileDiagnostic}
        </div>
      )}
      {visualLayer === "air" && (
        <div className="pointer-events-none absolute left-3 top-12 z-10 w-[190px] rounded-xl border border-cyan-300/40 bg-slate-950/80 p-3 text-[10px] text-white shadow-[0_0_24px_rgba(34,211,238,.25)] backdrop-blur-md">
          <div className="mb-2 font-semibold tracking-wide text-cyan-100">JAKOŚĆ POWIETRZA · UAQI</div>
          <div className="h-2 rounded-full bg-gradient-to-r from-indigo-950 via-fuchsia-500 via-40% to-cyan-300" />
          <div className="mt-1.5 flex justify-between text-white/70"><span>Dobra</span><span>Umiarkowana</span><span>Zła</span></div>
        </div>
      )}
      {visualLayer === "pollen" && (
        <div className="pointer-events-auto absolute left-3 top-12 z-10 max-w-[calc(100%-1.5rem)] rounded-xl border border-fuchsia-300/40 bg-slate-950/85 p-2.5 text-white shadow-[0_0_24px_rgba(217,70,239,.2)] backdrop-blur-md">
          <div className="flex gap-1 rounded-full bg-white/10 p-1 text-[10px]">
            {([
              ["TREE_UPI", "Drzewa"],
              ["GRASS_UPI", "Trawy"],
              ["WEED_UPI", "Chwasty"],
            ] as const).map(([type, label]) => (
              <button key={type} type="button" aria-pressed={pollenType === type} onClick={() => setPollenType(type)} className={`rounded-full px-2 py-1 ${pollenType === type ? "bg-fuchsia-500 text-white shadow-[0_0_12px_rgba(217,70,239,.7)]" : "text-white/70 hover:text-white"}`}>
                {label} ({type})
              </button>
            ))}
          </div>
          {pollenOutOfSeason && <p className="mt-2 max-w-[420px] text-[11px] leading-relaxed text-fuchsia-100">Warstwa aktywna (poza sezonem pylenia w PL — oddal mapę na południe, aby zobaczyć chmury pyłków)</p>}
        </div>
      )}
      {visualLayer === "range" && (
        <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-xl border border-cyan-300/30 bg-slate-950/80 px-3 py-2 text-[10px] text-white shadow-[0_0_20px_rgba(56,189,248,.22)] backdrop-blur-md">
          <div className="mb-1 font-semibold tracking-widest">RADAR IZOCHRONNY</div>
          <div className="flex gap-3"><span className="text-[#00f5d4]">● 5 min</span><span className="text-[#38bdf8]">● 10 min</span><span className="text-[#a855f7]">● 15 min</span></div>
        </div>
      )}
      <div aria-label="Warstwy Google Maps" className="pointer-events-auto absolute bottom-12 left-3 right-3 z-50 flex w-fit max-w-[calc(100%-1.5rem)] gap-1.5 overflow-x-auto rounded-lg">
        <button type="button" aria-pressed={mapType === "earth3d"} className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium shadow-md ${mapType === "earth3d" ? "border-[#1a73e8] bg-[#1a73e8] text-white" : "border-black/10 bg-white/95 text-stone-800 hover:bg-stone-50"}`} onClick={() => {
          setVisualLayer(null);
          routePlanner.current.active = false;
          setRoutePlanActive(false);
          changeMapType("earth3d");
        }}><Box className="h-[13px] w-[13px]" />3D</button>
        <button type="button" aria-pressed={visualLayer === "bicycling"} className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium shadow-md ${visualLayer === "bicycling" ? "border-emerald-400 bg-emerald-500 text-white shadow-[0_0_14px_rgba(16,185,129,.5)]" : "border-black/10 bg-white/95 text-stone-800 hover:bg-stone-50"}`} onClick={() => activateVisualLayer(visualLayer === "bicycling" ? null : "bicycling", "roadmap")}><Bike className="h-[13px] w-[13px]" />Rower</button>
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
        <button type="button" aria-pressed={visualLayer === "range"} title="Hud izochron: przybliżone strefy 5, 10 i 15 min" className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium shadow-md ${visualLayer === "range" ? "border-cyan-400 bg-cyan-500 text-slate-950 shadow-[0_0_14px_rgba(0,245,212,.5)]" : "border-black/10 bg-white/95 text-stone-800 hover:bg-stone-50"}`} onClick={() => activateVisualLayer(visualLayer === "range" ? null : "range")}><Mountain className="h-[13px] w-[13px]" />15 min</button>
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
        <button type="button" aria-pressed={activeIntelligenceLayer === "aerial"} className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium shadow-md ${activeIntelligenceLayer === "aerial" ? "border-[#1a73e8] bg-[#1a73e8] text-white" : "border-black/10 bg-white/95 text-stone-800 hover:bg-stone-50"}`} title="Odtwórz widok Aerial View lub orbitę 3D" onClick={() => onAerialRequest?.(getCurrentMapPoint())}><Plane className="h-[13px] w-[13px]" />Przelot</button>
        {([
          ["solar", "Słońce", Sun],
          ["air", "Powietrze", AirVent],
          ["pollen", "Pyłki", Flower2],
          ["weather", "Pogoda", CloudSun],
          ["terrain", "Teren / m n.p.m.", Mountain],
          ["timezone", "Czas", Clock3],
        ] as const).map(([id, label, Icon]) => (
          <button key={id} type="button" aria-pressed={visualLayer === id} className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium shadow-md ${visualLayer === id ? "border-fuchsia-400 bg-fuchsia-500 text-white shadow-[0_0_16px_rgba(217,70,239,.4)]" : "border-black/10 bg-white/95 text-stone-800 hover:bg-stone-50"}`} onClick={() => {
            if (id === "solar" || id === "air" || id === "pollen") activateVisualLayer(id);
            else if (id === "terrain") activateVisualLayer("terrain", "terrain");
            else if (visualLayer === id) setVisualLayer(null);
            callbacks.current.onIntelligenceRequest?.(id, getCurrentMapPoint());
          }}><Icon className="h-[13px] w-[13px]" />{label}</button>
        ))}
      </div>
    </div>
  );
}
