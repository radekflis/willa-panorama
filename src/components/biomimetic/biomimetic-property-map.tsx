"use client";

import React, { useEffect, useRef } from "react";
import Map, { Marker, type MapRef } from "react-map-gl/mapbox";
import { motion, AnimatePresence } from "framer-motion";
import type mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

export interface PropertyMarkerData {
  id: string;
  priceShort: string;
  lat: number;
  lng: number;
  ecoScore: number;
}

export const BIOPHILIC_MAP_STYLE: mapboxgl.StyleSpecification = {
  version: 8,
  name: "Biophilic Organic Light",
  sources: {
    "mapbox-streets": {
      type: "vector",
      url: "mapbox://mapbox.mapbox-streets-v8",
    },
  },
  glyphs: "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#F3EFE6" },
    },
    {
      id: "landuse-parks",
      type: "fill",
      source: "mapbox-streets",
      "source-layer": "landuse",
      filter: ["in", "class", "park", "wood", "grass", "scrub"],
      paint: { "fill-color": "#DCE6D5", "fill-opacity": 0.85 },
    },
    {
      id: "water",
      type: "fill",
      source: "mapbox-streets",
      "source-layer": "water",
      paint: { "fill-color": "#CBE0E0" },
    },
    {
      id: "buildings",
      type: "fill",
      source: "mapbox-streets",
      "source-layer": "building",
      minzoom: 13,
      paint: { "fill-color": "#E6E0D4", "fill-opacity": 0.65 },
    },
    {
      id: "roads-minor",
      type: "line",
      source: "mapbox-streets",
      "source-layer": "road",
      filter: ["in", "class", "street", "street_limited", "service"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#FAF8F5",
        "line-width": ["interpolate", ["linear"], ["zoom"], 12, 1, 16, 6],
      },
    },
    {
      id: "roads-major",
      type: "line",
      source: "mapbox-streets",
      "source-layer": "road",
      filter: ["in", "class", "primary", "secondary", "trunk", "motorway"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#FFFFFF",
        "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1.5, 16, 10],
      },
    },
    {
      id: "place-labels",
      type: "symbol",
      source: "mapbox-streets",
      "source-layer": "place_label",
      layout: {
        "text-field": ["get", "name_pl"],
        "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
        "text-size": 12,
      },
      paint: {
        "text-color": "#5C665E",
        "text-halo-color": "#F3EFE6",
        "text-halo-width": 1.5,
      },
    },
  ],
};


export const BIOLUMINESCENT_DARK_MAP_STYLE: mapboxgl.StyleSpecification = {
  version: 8,
  name: "Bioluminescent Night",
  sources: {
    "mapbox-streets": {
      type: "vector",
      url: "mapbox://mapbox.mapbox-streets-v8",
    },
  },
  glyphs: "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
  layers: [
    { id: "background", type: "background", paint: { "background-color": "#06110E" } },
    {
      id: "landuse-parks",
      type: "fill",
      source: "mapbox-streets",
      "source-layer": "landuse",
      filter: ["in", "class", "park", "wood", "grass", "scrub"],
      paint: { "fill-color": "#0C261F", "fill-opacity": 0.9 },
    },
    {
      id: "water",
      type: "fill",
      source: "mapbox-streets",
      "source-layer": "water",
      paint: { "fill-color": "#082026" },
    },
    {
      id: "buildings",
      type: "fill",
      source: "mapbox-streets",
      "source-layer": "building",
      minzoom: 13,
      paint: { "fill-color": "#0F2923", "fill-opacity": 0.7 },
    },
    {
      id: "roads-minor",
      type: "line",
      source: "mapbox-streets",
      "source-layer": "road",
      filter: ["in", "class", "street", "street_limited", "service"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#163B32",
        "line-width": ["interpolate", ["linear"], ["zoom"], 12, 1, 16, 5],
      },
    },
    {
      id: "roads-major",
      type: "line",
      source: "mapbox-streets",
      "source-layer": "road",
      filter: ["in", "class", "primary", "secondary", "trunk", "motorway"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#1D5E4E",
        "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1.5, 16, 9],
      },
    },
    {
      id: "place-labels",
      type: "symbol",
      source: "mapbox-streets",
      "source-layer": "place_label",
      layout: {
        "text-field": ["get", "name_pl"],
        "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
        "text-size": 12,
      },
      paint: {
        "text-color": "#86EFAC",
        "text-halo-color": "#06110E",
        "text-halo-width": 1.5,
      },
    },
  ],
};

export interface MapCameraTarget {
  lng: number;
  lat: number;
  zoom: number;
  pitch?: number;
  bearing?: number;
  ts?: number;
}

export interface PoiMarkerData {
  id: string;
  label: string;
  category: string;
  lat: number;
  lng: number;
  phone?: string;
  url?: string;
  desc: string;
}

interface BiomimeticMapProps {
  properties: PropertyMarkerData[];
  hoveredId: string | null;
  selectedId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  isDark?: boolean;
  cameraTarget?: MapCameraTarget | null;
  poiMarkers?: PoiMarkerData[];
  onSelectPoi?: (poi: PoiMarkerData) => void;
}

export function BiomimeticPropertyMap({
  properties,
  hoveredId,
  selectedId,
  onHover,
  onSelect,
  isDark = false,
  cameraTarget = null,
  poiMarkers = [],
  onSelectPoi,
}: BiomimeticMapProps) {
  const mapRef = useRef<MapRef>(null);

  useEffect(() => {
    if (!cameraTarget || !mapRef.current) return;
    mapRef.current.flyTo({
      center: [cameraTarget.lng, cameraTarget.lat],
      zoom: cameraTarget.zoom,
      pitch: cameraTarget.pitch ?? 45,
      bearing: cameraTarget.bearing ?? 0,
      duration: 1200,
      essential: true,
    });
  }, [cameraTarget]);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!token) {
    return (
      <div className="relative flex h-full w-full flex-col items-center justify-center bg-[#F3EFE6] p-6 text-center">
        <div className="max-w-md rounded-[28px] bg-white/80 p-6 backdrop-blur-xl border border-white/85 shadow-lg">
          <p className="text-sm font-semibold text-stone-800">
            Tryb biofiliczny bez aktywnego tokena Mapbox
          </p>
          <p className="mt-1.5 text-xs text-stone-500">
            Dodaj NEXT_PUBLIC_MAPBOX_TOKEN w .env.local oraz na Vercelu, aby włączyć pełną mapę wektorową.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {properties.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelect(p.id)}
                className="rounded-full bg-emerald-800 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                {p.priceShort}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={token}
      initialViewState={{ longitude: 17.0385, latitude: 51.1079, zoom: 11.5 }}
      style={{ width: "100%", height: "100%" }}
      mapStyle={isDark ? BIOLUMINESCENT_DARK_MAP_STYLE : BIOPHILIC_MAP_STYLE}
    >
      {properties.map((prop) => {
        const isHighlighted = hoveredId === prop.id || selectedId === prop.id;

        return (
          <Marker
            key={prop.id}
            longitude={prop.lng}
            latitude={prop.lat}
            anchor="bottom"
            style={{ zIndex: isHighlighted ? 50 : 10 }}
          >
            <motion.button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(prop.id);
              }}
              onMouseEnter={() => onHover(prop.id)}
              onMouseLeave={() => onHover(null)}
              animate={{
                scale: isHighlighted ? 1.22 : 1,
                y: isHighlighted ? -6 : 0,
              }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: "spring", stiffness: 420, damping: 20 }}
              className={`relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold tracking-tight transition-colors duration-300 backdrop-blur-xl border ${
                isHighlighted
                  ? "bg-emerald-900 text-white border-emerald-400 shadow-[0_10px_25px_rgba(16,185,129,0.45)]"
                  : "bg-white/85 text-stone-900 border-white/90 shadow-[0_4px_14px_rgba(0,0,0,0.12)] hover:bg-white"
              }`}
            >
              <AnimatePresence>
                {isHighlighted && (
                  <motion.span
                    initial={{ opacity: 0.7, scale: 0.8 }}
                    animate={{ opacity: 0, scale: 1.75 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
                    className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-emerald-400/50"
                  />
                )}
              </AnimatePresence>

              <span
                className={`h-2 w-2 rounded-full ${
                  isHighlighted ? "bg-emerald-300" : "bg-emerald-500"
                }`}
              />
              <span>{prop.priceShort}</span>
            </motion.button>
          </Marker>
        );
      })}
      {poiMarkers.map((poi) => (
        <Marker
          key={poi.id}
          longitude={poi.lng}
          latitude={poi.lat}
          anchor="bottom"
          style={{ zIndex: 60 }}
          onClick={(event) => {
            event.originalEvent.stopPropagation();
            onSelectPoi?.(poi);
          }}
        >
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-full border border-emerald-300/70 bg-white/90 px-3 py-1.5 text-[11px] font-bold text-stone-900 shadow-lg backdrop-blur-xl transition-transform hover:scale-110 dark:bg-emerald-950/90 dark:text-emerald-100"
          >
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span>{poi.label}</span>
          </button>
        </Marker>
      ))}
    </Map>
  );
}
