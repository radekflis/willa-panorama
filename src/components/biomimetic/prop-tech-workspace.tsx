"use client";

import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BiomimeticPropertyCard } from "./biomimetic-property-card";
import { BiomimeticPropertyMap, PropertyMarkerData } from "./biomimetic-property-map";
import { BiomimeticPropertyDetail, PropertyDetailData } from "./biomimetic-property-detail";
import { BiomimeticFloatingDock, WorkspaceView } from "./biomimetic-floating-dock";
import { BiomimeticAIMatchCard } from "./biomimetic-ai-match-card";
import { LiquidPriceSlider } from "./liquid-price-slider";

export interface WorkspaceProperty extends PropertyDetailData {
  priceNumeric: number;
  priceShort: string;
  imageUrl: string;
  lat: number;
  lng: number;
}

export function PropTechWorkspace({ properties }: { properties: WorkspaceProperty[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<WorkspaceView>("map");
  const [maxPrice, setMaxPrice] = useState<number>(5000000);
  const [locationQuery, setLocationQuery] = useState<string>("");

  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      const priceOk = p.priceNumeric <= maxPrice;
      const locOk =
        !locationQuery.trim() ||
        p.location.toLowerCase().includes(locationQuery.trim().toLowerCase()) ||
        p.title.toLowerCase().includes(locationQuery.trim().toLowerCase());
      return priceOk && locOk;
    });
  }, [properties, maxPrice, locationQuery]);

  const markers: PropertyMarkerData[] = useMemo(
    () =>
      filteredProperties.map((p) => ({
        id: p.id,
        priceShort: p.priceShort,
        lat: p.lat,
        lng: p.lng,
        ecoScore: p.ecoScore ?? 94,
      })),
    [filteredProperties]
  );

  const selectedProperty = useMemo(
    () => properties.find((p) => p.id === selectedId) ?? null,
    [properties, selectedId]
  );

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#F5F3EE] dark:bg-[#071310]">
      <div className="absolute inset-0 z-0">
        <BiomimeticPropertyMap
          properties={markers}
          hoveredId={hoveredId}
          selectedId={selectedId}
          onHover={setHoveredId}
          onSelect={(id) => setSelectedId(id)}
        />
      </div>

      <motion.header
        layout
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="fixed left-1/2 top-5 z-30 -translate-x-1/2 rounded-[28px] bg-white/80 dark:bg-emerald-950/65 p-2 backdrop-blur-2xl border border-white/75 dark:border-emerald-500/20 shadow-lg"
      >
        <div className="flex items-center gap-2">
          {["Lokalizacja", "Cena"].map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(activeFilter === filter ? null : filter)}
              className={`rounded-full px-4 py-2 text-xs font-medium transition-colors ${
                activeFilter === filter
                  ? "bg-emerald-800 text-white"
                  : "text-stone-700 dark:text-stone-200 hover:bg-black/5"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        <AnimatePresence>
          {activeFilter && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden px-4 pt-3 pb-2 text-xs text-stone-600 dark:text-stone-300"
            >
              {activeFilter === "Cena" ? (
                <LiquidPriceSlider value={maxPrice} onChange={setMaxPrice} />
              ) : (
                <input
                  type="text"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  placeholder="Filtruj po lokalizacji lub tytule..."
                  className="w-64 rounded-full border border-stone-300/80 bg-white/90 px-3.5 py-1.5 text-xs text-stone-900 focus:outline-none"
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {activeView === "map" && (
        <aside
          className="fixed bottom-24 left-5 top-24 z-20 w-[390px] max-w-[calc(100vw-2.5rem)] overflow-y-auto pr-1 space-y-4 no-scrollbar"
          style={{
            maskImage:
              "linear-gradient(to bottom, transparent 0%, black 3%, black 95%, transparent 100%)",
          }}
        >
          {filteredProperties.map((property) => (
            <BiomimeticPropertyCard
              key={property.id}
              id={property.id}
              title={property.title}
              location={property.location}
              price={property.price}
              area={property.area}
              rooms={property.rooms}
              imageUrl={property.imageUrl}
              ecoScore={property.ecoScore}
              onSelect={(id) => setSelectedId(id)}
              onHoverChange={setHoveredId}
            />
          ))}
        </aside>
      )}

      {activeView === "grid" && (
        <div className="relative z-20 mx-auto h-full max-w-6xl overflow-y-auto px-5 pt-24 pb-28 no-scrollbar">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredProperties.map((property) => (
              <BiomimeticPropertyCard
                key={property.id}
                id={property.id}
                title={property.title}
                location={property.location}
                price={property.price}
                area={property.area}
                rooms={property.rooms}
                imageUrl={property.imageUrl}
                ecoScore={property.ecoScore}
                onSelect={(id) => setSelectedId(id)}
                onHoverChange={setHoveredId}
              />
            ))}
          </div>
        </div>
      )}

      {activeView === "ai-match" && (
        <div className="relative z-20 flex h-full w-full items-center justify-center px-5 pt-16 pb-24 overflow-y-auto">
          <BiomimeticAIMatchCard
            propertyTitle={selectedProperty?.title ?? filteredProperties[0]?.title}
            onBookTour={() => {
              const target = selectedProperty ?? filteredProperties[0];
              if (target) setSelectedId(target.id);
            }}
          />
        </div>
      )}

      {activeView === "saved" && (
        <div className="relative z-20 flex h-full w-full items-center justify-center px-5">
          <div className="rounded-[28px] bg-white/85 px-6 py-5 text-sm font-medium text-stone-800 backdrop-blur-xl border border-white/80 shadow-xl">
            Zapisane oferty są dostępne w katalogu oraz w widoku mapy.
          </div>
        </div>
      )}

      <BiomimeticFloatingDock
        activeView={activeView}
        onViewChange={setActiveView}
        savedCount={filteredProperties.length}
      />

      <AnimatePresence>
        {selectedProperty && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedId(null)}
            className="fixed inset-0 z-40 flex items-center justify-center bg-stone-950/30 p-6 backdrop-blur-md"
          >
            <BiomimeticPropertyDetail
              property={selectedProperty}
              onClose={() => setSelectedId(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
