"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { setOptions } from "@googlemaps/js-api-loader";

export type MapPoint = { lat: number; lng: number };
export type MapPlace = {
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  category: string | null;
  rating: number | null;
  ratingCount: number | null;
  hours: string[];
  photo: string | null;
  photoAuthors: string[];
  attributions: string[];
  location: MapPoint | null;
};
export type PropertyMapHandle = {
  searchNearby: (point: MapPoint) => Promise<void>;
  orbit: (point: MapPoint) => void;
};

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const DEFAULT_CENTER = { lat: 50.967, lng: 16.615 };
const PLACE_FIELDS = ["displayName", "formattedAddress", "nationalPhoneNumber", "websiteURI", "regularOpeningHours", "photos", "location", "rating", "userRatingCount", "primaryTypeDisplayName", "attributions"];
let loaderConfigured = false;

type Props = {
  onMapError: (error: string | null) => void;
  onPoint: (point: MapPoint, approximate: boolean) => void;
  onPlaceLoading: () => void;
  onPlace: (place: MapPlace) => void;
};

export const BiomimeticPropertyMap = forwardRef<PropertyMapHandle, Props>(function BiomimeticPropertyMap(props, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbacks = useRef(props);
  callbacks.current = props;
  const controls = useRef<PropertyMapHandle | null>(null);

  useImperativeHandle(ref, () => ({
    searchNearby: async (point) => {
      if (!controls.current) throw new Error("Mapa 3D nie jest dostępna.");
      await controls.current.searchNearby(point);
    },
    orbit: (point) => {
      if (!controls.current) throw new Error("Mapa 3D nie jest dostępna.");
      controls.current.orbit(point);
    },
  }), []);

  useEffect(() => {
    if (!apiKey) {
      callbacks.current.onMapError("Google Maps wymaga klucza API. Dodaj NEXT_PUBLIC_GOOGLE_MAPS_API_KEY do konfiguracji i uruchom aplikację ponownie.");
      return;
    }

    let cancelled = false;
    let map: google.maps.Map | null = null;
    let map3d: google.maps.maps3d.Map3DElement | null = null;
    let cleanup = () => {};

    async function initialize() {
      try {
        if (!loaderConfigured) {
          setOptions({ key: apiKey, v: "beta", language: "pl", region: "PL" });
          loaderConfigured = true;
        }
        const { Map3DElement, MapMode, Marker3DInteractiveElement } = await google.maps.importLibrary("maps3d");
        if (cancelled || !containerRef.current) return;
        const element = new Map3DElement({
          center: DEFAULT_CENTER, mode: MapMode.HYBRID, defaultUIHidden: false,
          tilt: 60, heading: 20, range: 1000,
        });
        map3d = element;
        element.style.display = "block";
        element.style.width = "100%";
        element.style.height = "100%";
        containerRef.current.append(element);

        let nearbyMarkers: google.maps.maps3d.Marker3DInteractiveElement[] = [];
        let pointMarker: google.maps.maps3d.Marker3DInteractiveElement | null = null;
        let selection = 0;
        let search = 0;
        let timer: ReturnType<typeof setTimeout> | null = null;
        let pointer: { id: number; x: number; y: number } | null = null;
        let suppressClickUntil = 0;

        const cancelPress = () => {
          if (timer) clearTimeout(timer);
          timer = null;
          pointer = null;
        };
        const selectPoint = (point: MapPoint, approximate: boolean) => {
          selection++;
          search++;
          pointMarker?.remove();
          pointMarker = new Marker3DInteractiveElement({
            position: point, altitudeMode: "RELATIVE_TO_GROUND", extruded: true,
            label: "Wybrany punkt", title: "Wybrany punkt",
          });
          const marker = pointMarker;
          marker.addEventListener("gmp-click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            selectPoint(point, approximate);
          });
          element.append(marker);
          if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            marker.animate([{ opacity: 0.5 }, { opacity: 1 }], { duration: 700, iterations: 3, direction: "alternate" });
          }
          callbacks.current.onPoint(point, approximate);
        };
        const selectCenter = () => {
          const center = element.center;
          if (!center) {
            callbacks.current.onMapError("Nie udało się ustalić środka mapy. Kliknij punkt na mapie.");
            return;
          }
          selectPoint({ lat: center.lat, lng: center.lng }, true);
        };
        const openPlace = async (id: string) => {
          const request = ++selection;
          callbacks.current.onPlaceLoading();
          try {
            const { Place } = await google.maps.importLibrary("places");
            const place = new Place({ id });
            await place.fetchFields({ fields: PLACE_FIELDS });
            if (cancelled || request !== selection) return;
            const location = place.location ? { lat: place.location.lat(), lng: place.location.lng() } : null;
            const photo = place.photos?.[0];
            callbacks.current.onPlace({
              name: place.displayName || "Miejsce",
              address: place.formattedAddress ?? null,
              phone: place.nationalPhoneNumber ?? null,
              website: place.websiteURI ?? null,
              category: place.primaryTypeDisplayName ?? null,
              rating: place.rating ?? null,
              ratingCount: place.userRatingCount ?? null,
              hours: place.regularOpeningHours?.weekdayDescriptions ?? [],
              photo: photo?.getURI({ maxWidth: 800 }) ?? null,
              photoAuthors: photo?.authorAttributions.map((author) => author.displayName) ?? [],
              attributions: place.attributions?.flatMap((attribution) => attribution.provider ? [attribution.provider] : []) ?? [],
              location,
            });
            if (location) element.flyCameraTo({ endCamera: { center: location, tilt: 60, range: 700 }, durationMillis: 1200 });
          } catch (error) {
            console.error("Nie udało się pobrać szczegółów miejsca:", error);
            if (!cancelled && request === selection) callbacks.current.onMapError("Nie udało się pobrać szczegółów miejsca. Sprawdź dostęp do Places API (New).");
          }
        };
        const searchNearby = async (point: MapPoint) => {
          const request = ++search;
          const { Place } = await google.maps.importLibrary("places");
          const { places } = await Place.searchNearby({
            fields: ["id", "displayName", "location", "rating"],
            locationRestriction: { center: point, radius: 1200 },
            maxResultCount: 18,
            includedTypes: ["restaurant", "cafe", "school", "hospital", "pharmacy", "park", "supermarket", "marina", "tourist_attraction"],
            language: "pl",
          });
          if (cancelled || request !== search) return;
          nearbyMarkers.forEach((marker) => marker.remove());
          nearbyMarkers = places.flatMap((place) => {
            if (!place.id || !place.location) return [];
            const label = `${place.displayName || "Miejsce"}${place.rating != null ? ` · ★ ${place.rating}` : ""}`;
            const marker = new Marker3DInteractiveElement({
              position: place.location, altitudeMode: "RELATIVE_TO_GROUND", extruded: true, label, title: label,
            });
            marker.addEventListener("gmp-click", (event) => {
              event.preventDefault();
              event.stopPropagation();
              void openPlace(place.id);
            });
            element.append(marker);
            return [marker];
          });
          if (nearbyMarkers.length === 0) callbacks.current.onMapError("Nie znaleziono miejsc w pobliżu wybranego punktu.");
        };
        controls.current = {
          searchNearby,
          orbit: (point) => element.flyCameraAround({ camera: { center: point, tilt: 60, range: 700 }, durationMillis: 20000, repeatCount: 1 }),
        };

        const onMapClick = (event: google.maps.maps3d.LocationClickEvent | google.maps.maps3d.PlaceClickEvent) => {
          const poiEvent = event as google.maps.maps3d.LocationClickEvent & {
            placeId?: string;
            fetchPlace?: () => Promise<google.maps.places.Place>;
          };
          if (poiEvent.placeId || poiEvent.fetchPlace) {
            event.preventDefault();
            event.stopPropagation();
            if (Date.now() < suppressClickUntil) return;
            if (poiEvent.placeId) void openPlace(poiEvent.placeId);
            else if (poiEvent.fetchPlace) {
              const request = ++selection;
              callbacks.current.onPlaceLoading();
              void poiEvent.fetchPlace().then((place) => {
                if (!cancelled && request === selection) void openPlace(place.id);
              }).catch((error: unknown) => {
                console.error("Nie udało się rozpoznać miejsca:", error);
                if (!cancelled && request === selection) callbacks.current.onMapError("Nie udało się rozpoznać miejsca.");
              });
            }
            return;
          }
          if (Date.now() < suppressClickUntil) return;
          if (event.position) selectPoint({ lat: event.position.lat, lng: event.position.lng }, false);
        };
        const onPointerDown = (event: PointerEvent) => {
          if (!event.isPrimary) {
            cancelPress();
            return;
          }
          if (event.button !== 0 || event.composedPath().some((item) => item instanceof Marker3DInteractiveElement || item instanceof HTMLButtonElement || item instanceof HTMLAnchorElement)) return;
          cancelPress();
          pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
          timer = setTimeout(() => {
            pointer = null;
            timer = null;
            suppressClickUntil = Date.now() + 1000;
            selectCenter();
          }, 550);
        };
        const onPointerMove = (event: PointerEvent) => {
          if (pointer?.id === event.pointerId && Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 10) cancelPress();
        };
        const onPointerEnd = (event: PointerEvent) => {
          if (pointer?.id === event.pointerId) cancelPress();
        };
        const onContextMenu = (event: MouseEvent) => {
          event.preventDefault();
          cancelPress();
          if (Date.now() < suppressClickUntil) return;
          suppressClickUntil = Date.now() + 1000;
          selectCenter();
        };
        const onMap3DError = (event: Event) => {
          console.error("Błąd widoku 3D Google Maps:", event);
          callbacks.current.onMapError("Wystąpił błąd mapy 3D. Sprawdź dostęp do Google Maps API i połączenie.");
        };
        element.addEventListener("gmp-click", onMapClick);
        element.addEventListener("gmp-error", onMap3DError);
        element.addEventListener("pointerdown", onPointerDown, true);
        window.addEventListener("pointermove", onPointerMove, true);
        window.addEventListener("pointerup", onPointerEnd);
        window.addEventListener("pointercancel", onPointerEnd);
        element.addEventListener("contextmenu", onContextMenu, true);
        cleanup = () => {
          cancelPress();
          element.removeEventListener("gmp-click", onMapClick);
          element.removeEventListener("gmp-error", onMap3DError);
          element.removeEventListener("pointerdown", onPointerDown, true);
          window.removeEventListener("pointermove", onPointerMove, true);
          window.removeEventListener("pointerup", onPointerEnd);
          window.removeEventListener("pointercancel", onPointerEnd);
          element.removeEventListener("contextmenu", onContextMenu, true);
          controls.current = null;
        };
        void searchNearby(DEFAULT_CENTER).catch((error: unknown) => {
          console.error("Nie udało się pobrać miejsc w pobliżu:", error);
          if (!cancelled) callbacks.current.onMapError("Nie udało się pobrać miejsc w pobliżu. Sprawdź dostęp do Places API (New).");
        });
      } catch (error) {
        console.error("Nie udało się załadować widoku 3D Google Maps:", error);
        if (cancelled || !containerRef.current) return;
        try {
          const { Map } = await google.maps.importLibrary("maps");
          if (cancelled || !containerRef.current) return;
          map = new Map(containerRef.current, {
            center: DEFAULT_CENTER, zoom: 14, mapTypeId: "hybrid", tilt: 45, heading: 20,
            renderingType: google.maps.RenderingType.VECTOR, tiltInteractionEnabled: true,
            headingInteractionEnabled: true, disableDefaultUI: false, mapTypeControl: false,
          });
          map.addListener("click", (event: google.maps.MapMouseEvent & { placeId?: string }) => {
            if (event.placeId) event.stop();
          });
          callbacks.current.onMapError("Widok 3D jest niedostępny. Wyświetlono mapę 2D.");
        } catch (fallbackError) {
          console.error("Nie udało się załadować Google Maps:", fallbackError);
          if (!cancelled) callbacks.current.onMapError("Nie udało się załadować Google Maps. Sprawdź klucz, dostęp do API i połączenie.");
        }
      }
    }

    void initialize();
    return () => {
      cancelled = true;
      cleanup();
      if (map) google.maps.event.clearInstanceListeners(map);
      map3d?.remove();
    };
  }, []);

  return <div ref={containerRef} className="h-full w-full" aria-label="Interaktywna mapa Google Maps" />;
});
