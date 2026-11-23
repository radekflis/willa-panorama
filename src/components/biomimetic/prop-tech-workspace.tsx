"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun, Sparkles } from "lucide-react";
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

type PlatformRole = "buyer" | "owner" | "agency";

const ROLES: Array<{ id: PlatformRole; label: string }> = [
  { id: "buyer", label: "Kupujący" },
  { id: "owner", label: "Właściciel" },
  { id: "agency", label: "Agencja" },
];

export function PropTechWorkspace({ properties }: { properties: WorkspaceProperty[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<WorkspaceView>("map");
  const [maxPrice, setMaxPrice] = useState<number>(5000000);
  const [locationQuery, setLocationQuery] = useState<string>("");
  const [isDark, setIsDark] = useState<boolean>(false);
  const [role, setRole] = useState<PlatformRole>("buyer");
  const [savedIds, setSavedIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const storedSaved = window.localStorage.getItem("lbf_saved_ids");
      if (storedSaved) {
        const parsed = JSON.parse(storedSaved);
        if (Array.isArray(parsed)) setSavedIds(parsed);
      }
      const storedDark = window.localStorage.getItem("lbf_dark_mode") === "1";
      setIsDark(storedDark);
      document.documentElement.classList.toggle("dark", storedDark);

      const storedRole = window.localStorage.getItem("lbf_role") as PlatformRole | null;
      if (storedRole && ["buyer", "owner", "agency"].includes(storedRole)) {
        setRole(storedRole);
        document.documentElement.dataset.role = storedRole;
      }
    } catch {}
  }, []);

  const toggleDark = () => {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      window.localStorage.setItem("lbf_dark_mode", next ? "1" : "0");
      return next;
    });
  };

  const selectRole = (next: PlatformRole) => {
    setRole(next);
    document.documentElement.dataset.role = next;
    window.localStorage.setItem("lbf_role", next);
  };

  const toggleSave = (id: string) => {
    setSavedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      window.localStorage.setItem("lbf_saved_ids", JSON.stringify(next));
      return next;
    });
  };

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

  const savedProperties = useMemo(
    () => properties.filter((p) => savedIds.includes(p.id)),
    [properties, savedIds]
  );

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
    <div className="relative h-screen w-screen overflow-hidden bg-[#F5F3EE] dark:bg-[#06110E] transition-colors duration-500">
      <div className="absolute inset-0 z-0">
        <BiomimeticPropertyMap
          properties={markers}
          hoveredId={hoveredId}
          selectedId={selectedId}
          onHover={setHoveredId}
          onSelect={(id) => setSelectedId(id)}
          isDark={isDark}
        />
      </div>

      {/* Lewy górny róg: Logo */}
      <div className="fixed left-5 top-5 z-30 hidden md:flex items-center gap-2.5 rounded-full bg-white/80 dark:bg-emerald-950/70 px-3.5 py-2 backdrop-blur-2xl border border-white/80 dark:border-emerald-400/25 shadow-lg">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-900 dark:bg-emerald-400 text-[11px] font-bold text-white dark:text-emerald-950">
          WP
        </span>
        <span className="text-xs font-semibold tracking-tight text-stone-900 dark:text-stone-100">
          Willa Panorama
        </span>
      </div>

      {/* Prawy górny róg: Role + Dzień/Noc + Studio AI */}
      <div className="fixed right-5 top-5 z-30 flex items-center gap-2">
        <div className="hidden xl:flex items-center gap-1 rounded-full bg-white/80 dark:bg-emerald-950/70 p-1 backdrop-blur-2xl border border-white/80 dark:border-emerald-400/25 shadow-lg">
          {ROLES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => selectRole(r.id)}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                role === r.id
                  ? "bg-emerald-800 dark:bg-emerald-400 text-white dark:text-emerald-950"
                  : "text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={toggleDark}
          aria-label="Przełącz tryb Dzień / Noc"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 dark:bg-emerald-950/70 text-stone-800 dark:text-emerald-300 backdrop-blur-2xl border border-white/80 dark:border-emerald-400/25 shadow-lg transition-transform hover:scale-105 active:scale-95"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <Link
          href="/properties"
          className="flex items-center gap-1.5 rounded-full bg-emerald-900 dark:bg-emerald-400 px-4 py-2.5 text-xs font-semibold text-white dark:text-emerald-950 shadow-lg transition-transform hover:scale-105 active:scale-95"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Studio AI</span>
        </Link>
      </div>

      {/* Środek góra: Kapsuła filtrów */}
      <motion.header
        layout
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="fixed left-1/2 top-5 z-30 -translate-x-1/2 rounded-[28px] bg-white/80 dark:bg-emerald-950/75 p-2 backdrop-blur-2xl border border-white/75 dark:border-emerald-400/25 shadow-lg"
      >
        <div className="flex items-center gap-2">
          {["Lokalizacja", "Cena"].map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(activeFilter === filter ? null : filter)}
              className={`rounded-full px-4 py-2 text-xs font-medium transition-colors ${
                activeFilter === filter
                  ? "bg-emerald-800 dark:bg-emerald-400 text-white dark:text-emerald-950"
                  : "text-stone-700 dark:text-stone-200 hover:bg-black/5 dark:hover:bg-white/10"
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
                  className="w-64 rounded-full border border-stone-300/80 dark:border-emerald-500/30 bg-white/90 dark:bg-emerald-950/90 px-3.5 py-1.5 text-xs text-stone-900 dark:text-stone-100 focus:outline-none"
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
              isLiked={savedIds.includes(property.id)}
              onToggleLike={toggleSave}
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
                isLiked={savedIds.includes(property.id)}
                onToggleLike={toggleSave}
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
        <div className="relative z-20 mx-auto h-full max-w-6xl overflow-y-auto px-5 pt-24 pb-28 no-scrollbar">
          {savedProperties.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="rounded-[28px] bg-white/85 dark:bg-emerald-950/80 px-6 py-5 text-sm font-medium text-stone-800 dark:text-stone-100 backdrop-blur-xl border border-white/80 dark:border-emerald-400/25 shadow-xl">
                Brak zapisanych ofert. Kliknij serduszko na dowolnej karcie, aby dodać ją tutaj.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {savedProperties.map((property) => (
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
                  isLiked={true}
                  onToggleLike={toggleSave}
                  onSelect={(id) => setSelectedId(id)}
                  onHoverChange={setHoveredId}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <BiomimeticFloatingDock
        activeView={activeView}
        onViewChange={setActiveView}
        savedCount={savedIds.length}
      />

      <AnimatePresence>
        {selectedProperty && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedId(null)}
            className="fixed inset-0 z-40 flex items-center justify-center bg-stone-950/35 p-6 backdrop-blur-md"
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
