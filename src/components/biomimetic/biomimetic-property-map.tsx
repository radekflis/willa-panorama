"use client";

import React, { useEffect, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

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
  onCloseStreetView?: () => void;
  pickLocationMode?: boolean;
  onPickLocation?: (coords: MapPoint) => void;
  terrainRequest?: number;
  orbitTarget?: (MapPoint & { ts: number }) | null;
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
  onCloseStreetView,
  pickLocationMode = false,
  onPickLocation,
  terrainRequest,
  orbitTarget,
}: BiomimeticMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const container3dRef = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onHover, onSelect, onSelectGooglePlace, onRouteInfo, onRouteError, onRouteWarnings, onMapError, onCloseStreetView, pickLocationMode, onPickLocation });
  callbacks.current = { onHover, onSelect, onSelectGooglePlace, onRouteInfo, onRouteError, onRouteWarnings, onMapError, onCloseStreetView, pickLocationMode, onPickLocation };
  const markers2d = useRef(new Map<string, google.maps.Marker>());
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [map3d, setMap3d] = useState<google.maps.maps3d.Map3DElement | null>(null);
  const [maps3dLibrary, setMaps3dLibrary] = useState<google.maps.Maps3DLibrary | null>(null);
  const [mapType, setMapType] = useState<"earth3d" | "hybrid" | "roadmap" | "terrain">("earth3d");
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
    } else if (map) {
      if (mapType === "earth3d" && map3d?.center) {
        map.setCenter({ lat: map3d.center.lat, lng: map3d.center.lng });
        if (map3d.range) map.setZoom(Math.max(0, Math.min(21, 17 - Math.log2(map3d.range / 350))));
      }
      map.setMapTypeId(type);
    }
    setMapType(type);
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
    map.setMapTypeId(mapType);
  }, [map, mapType]);

  useEffect(() => {
    if (terrainRequest) changeMapType("terrain");
  }, [terrainRequest]);

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
      <div ref={containerRef} className={mapType === "earth3d" ? "hidden h-full w-full" : "h-full w-full"} aria-label="Interaktywna mapa Google" />
      <div ref={container3dRef} className={mapType === "earth3d" ? "h-full w-full" : "hidden h-full w-full"} aria-label="Interaktywna mapa Google 3D" />
    </div>
  );
}
