"use client";

import { useEffect, useRef } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const DEFAULT_CENTER = { lat: 50.967, lng: 16.615 };
let loaderConfigured = false;

export function BiomimeticPropertyMap({ onMapError }: { onMapError: (error: string | null) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onMapErrorRef = useRef(onMapError);
  onMapErrorRef.current = onMapError;

  useEffect(() => {
    if (!apiKey) {
      onMapErrorRef.current("Google Maps wymaga klucza API. Dodaj NEXT_PUBLIC_GOOGLE_MAPS_API_KEY do konfiguracji i uruchom aplikację ponownie.");
      return;
    }

    let cancelled = false;
    let map: google.maps.Map | null = null;
    let map3d: google.maps.maps3d.Map3DElement | null = null;

    async function initialize() {
      try {
        if (!loaderConfigured) {
          setOptions({ key: apiKey, v: "beta", language: "pl", region: "PL" });
          loaderConfigured = true;
        }
        const { Map3DElement, MapMode } = await importLibrary("maps3d");
        if (cancelled || !containerRef.current) return;
        map3d = new Map3DElement({
          center: DEFAULT_CENTER,
          mode: MapMode.HYBRID,
          defaultUIHidden: false,
          tilt: 60,
          heading: 20,
          range: 1000,
        });
        map3d.style.display = "block";
        map3d.style.width = "100%";
        map3d.style.height = "100%";
        containerRef.current.append(map3d);
      } catch (error) {
        console.error("Nie udało się załadować widoku 3D Google Maps:", error);
        if (cancelled || !containerRef.current) return;

        try {
          const { Map } = await importLibrary("maps");
          if (cancelled || !containerRef.current) return;
          map = new Map(containerRef.current, {
            center: DEFAULT_CENTER,
            zoom: 14,
            mapTypeId: "hybrid",
            tilt: 45,
            heading: 20,
            renderingType: google.maps.RenderingType.VECTOR,
            tiltInteractionEnabled: true,
            headingInteractionEnabled: true,
            disableDefaultUI: false,
            mapTypeControl: false,
          });
          onMapErrorRef.current("Widok 3D jest niedostępny. Wyświetlono mapę 2D.");
        } catch (fallbackError) {
          console.error("Nie udało się załadować Google Maps:", fallbackError);
          if (!cancelled) onMapErrorRef.current("Nie udało się załadować Google Maps. Sprawdź klucz, dostęp do API i połączenie.");
        }
      }
    }

    void initialize();
    return () => {
      cancelled = true;
      if (map) google.maps.event.clearInstanceListeners(map);
      map3d?.remove();
    };
  }, []);

  return <div ref={containerRef} className="h-full w-full" aria-label="Interaktywna mapa Google Maps" />;
}
