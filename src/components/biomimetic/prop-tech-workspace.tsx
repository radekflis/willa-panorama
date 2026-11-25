"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  Check,
  Compass,
  Copy,
  FileCheck2,
  FolderSearch,
  Home,
  Mail,
  Megaphone,
  Moon,
  Paintbrush,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import { BiomimeticPropertyCard } from "./biomimetic-property-card";
import { BiomimeticPropertyMap, PropertyMarkerData } from "./biomimetic-property-map";
import { BiomimeticPropertyDetail, PropertyDetailData } from "./biomimetic-property-detail";
import { LiquidPriceSlider } from "./liquid-price-slider";

export interface WorkspaceProperty extends PropertyDetailData {
  priceNumeric: number;
  priceShort: string;
  imageUrl: string;
  lat: number;
  lng: number;
}

type RoleId = "buyer" | "owner" | "agency";
type FeatureId =
  | "dom"
  | "td"
  | "ok"
  | "zap"
  | "ar"
  | "st"
  | "op"
  | "mk"
  | "au"
  | "sk"
  | "pl"
  | "ob";

interface FeatureNode {
  title: string;
  desc: string;
  tool?: "studio" | "archive" | "marketing" | "audit" | "contact" | "plans";
}

interface FeatureConfig {
  id: FeatureId;
  label: string;
  icon: React.ElementType;
  isPlan?: boolean;
  nodes?: FeatureNode[];
}

const ROLE_LABELS: Record<RoleId, string> = {
  buyer: "Kupujący",
  owner: "Właściciel",
  agency: "Agencja",
};

const ROLE_FEATURES: Record<RoleId, FeatureId[]> = {
  buyer: ["dom", "td", "ok", "zap"],
  owner: ["ar", "st", "op", "mk", "au", "sk", "pl"],
  agency: ["ob", "ar", "st", "op", "mk", "au", "sk", "pl"],
};

const FEATURES: Record<FeatureId, FeatureConfig> = {
  dom: { id: "dom", label: "Nieruchomość", icon: Home, isPlan: true },
  td: {
    id: "td",
    label: "Spacer 3D",
    icon: Compass,
    nodes: [
      { title: "Model 3D Splat", desc: "Obracalny model 3D Gaussian Splatting (.ksplat) renderowany płynnie w przeglądarce przez Three.js." },
      { title: "Satelita HD", desc: "Widok satelitarny wysokiej rozdzielczości na bryłę domu, dach i układ działki." },
      { title: "Rzuty pięter", desc: "Interaktywne rzuty parteru, piętra i zagospodarowania ogrodu." },
      { title: "Lot drona", desc: "Panoramiczne ujęcia otoczenia, jeziora i linii lasu z lotu ptaka." },
    ],
  },
  ok: {
    id: "ok",
    label: "Okolica",
    icon: Sparkles,
    nodes: [
      { title: "Szlaki i przyroda", desc: "Masyw Ślęży, Park Krajobrazowy Doliny Bystrzycy i leśne trasy rowerowe." },
      { title: "Woda i rekreacja", desc: "Jezioro Mietkowskie, przystań żeglarska i strefa windsurfingu." },
      { title: "Gastronomia", desc: "Lokalne restauracje, kawiarnie i winnice w promieniu 15 minut." },
      { title: "Infrastruktura", desc: "Szkoły, apteki, stacja kolejowa i szybki dojazd do Wrocławia." },
    ],
  },
  zap: {
    id: "zap",
    label: "Zapytaj właściciela",
    icon: Mail,
    nodes: [
      { title: "Formularz", desc: "Wyślij bezpośrednie pytanie do właściciela bez pośredników.", tool: "contact" },
      { title: "Prezentacja", desc: "Umów prywatną wizytę na miejscu lub wideospacer na żywo.", tool: "contact" },
    ],
  },
  ar: {
    id: "ar",
    label: "Archiwum",
    icon: FolderSearch,
    nodes: [
      { title: "Szukaj „Jodła”", desc: "Wyszukiwarka po treści zdjęć i tagach AI (np. jodła, basen, taras).", tool: "archive" },
      { title: "Zdjęcia", desc: "Wszystkie ujęcia posegregowane automatycznie na strefy domu.", tool: "archive" },
      { title: "Wideo", desc: "Filmy z drona i wnętrz przygotowane pod konwersję 3D." },
      { title: "Import lokalny", desc: "Szybkie wgrywanie całych folderów z dysku lub iPada." },
    ],
  },
  st: {
    id: "st",
    label: "Studio AI",
    icon: Paintbrush,
    nodes: [
      { title: "Prompt FLUX.1", desc: "Zmiana zdjęcia poleceniem tekstowym w otwartym modelu FLUX.1 Kontext.", tool: "studio" },
      { title: "Kopie 2K/4K/8K", desc: "Wynik zapisywany wyłącznie jako kopia — oryginał pozostaje nietknięty.", tool: "studio" },
      { title: "Ochrona kosztów", desc: "Architektura Dwóch Biegów: szkice za ułamek grosza, finał w 4K/8K." },
    ],
  },
  op: {
    id: "op",
    label: "Opis i Potencjał",
    icon: Sparkles,
    nodes: [
      { title: "8 parametrów", desc: "Cena, metraż, pokoje, Bio-Index 97%, ekspozycja, działka, otoczenie, status." },
      { title: "Opis AI", desc: "Długi, edytowalny opis wygenerowany z głębokiej analizy zdjęć." },
      { title: "Potencjał lokalizacji", desc: "Analiza wzrostu wartości, przyrody, dojazdu i potencjału najmu." },
    ],
  },
  mk: {
    id: "mk",
    label: "Marketing",
    icon: Megaphone,
    nodes: [
      { title: "SEO & Google Ads", desc: "Gotowe tytuły, meta opisy i słowa kluczowe bez haraczu portali.", tool: "marketing" },
      { title: "Facebook / Grupy", desc: "Gotowy post sprzedażowy z kluczowymi parametrami i linkiem.", tool: "marketing" },
    ],
  },
  au: {
    id: "au",
    label: "Audytor Umów",
    icon: FileCheck2,
    nodes: [
      { title: "Audyt PL / UE", desc: "Sprawdzenie zadatku, terminów i ryzyk w umowie przedwstępnej.", tool: "audit" },
      { title: "Wgraj skan OCR", desc: "Odczyt trudnych plików PDF i zdjęć dokumentów (Tesseract OCR).", tool: "audit" },
    ],
  },
  sk: {
    id: "sk",
    label: "Skrzynka",
    icon: Mail,
    nodes: [
      { title: "Zapytania", desc: "Bezpośrednie wiadomości od kupujących zainteresowanych ofertą." },
      { title: "Umówione wizyty", desc: "Kalendarz prezentacji na żywo i spotkań online." },
    ],
  },
  pl: {
    id: "pl",
    label: "Pakiety",
    icon: Sparkles,
    nodes: [
      { title: "Właściciel Direct", desc: "49 zł / projekt — pełna prezentacja, Studio FLUX.1, SEO/Ads, BLIK/karta.", tool: "plans" },
      { title: "Agencja White-Label", desc: "199 zł / mies. — własna marka, wiele obiektów i audytor umów.", tool: "plans" },
    ],
  },
  ob: {
    id: "ob",
    label: "Moje obiekty",
    icon: Building2,
    nodes: [
      { title: "Portfel Agencji", desc: "Przełączanie wszystkich nieruchomości prowadzonych przez agencję." },
      { title: "Marka White-Label", desc: "Własne logo, domena i kolorystyka prezentacji dla klientów." },
    ],
  },
};

const HOUSE_ROOMS = [
  { id: "salon", name: "Salon", x: 18, y: 20, w: 152, h: 112, img: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80", desc: "58 m² z panoramicznym przeszkleniem na południe i wyjściem na taras." },
  { id: "kuchnia", name: "Kuchnia", x: 178, y: 20, w: 124, h: 72, img: "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=900&q=80", desc: "Wyspa z naturalnego kamienia, ukryta spiżarnia i światło poranne." },
  { id: "sypialnia", name: "Sypialnia", x: 178, y: 100, w: 124, h: 74, img: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=900&q=80", desc: "Master bedroom z prywatną garderobą i widokiem na korony drzew." },
  { id: "lazienka", name: "Łazienka", x: 18, y: 140, w: 72, h: 66, img: "https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=900&q=80", desc: "Strefa kąpielowa z wolnostojącą wanną i naturalnym światłem." },
  { id: "gabinet", name: "Gabinet", x: 98, y: 140, w: 72, h: 66, img: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80", desc: "Cicha przestrzeń do pracy zdalnej ze światłowodem." },
  { id: "taras", name: "Taras", x: 18, y: 214, w: 152, h: 58, img: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=900&q=80", desc: "Modrzewiowy taras z basenem i ekspozycją południowo-zachodnią." },
  { id: "ogrod", name: "Ogród", x: 178, y: 182, w: 124, h: 90, img: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80", desc: "1 000 m² dojrzałego ogrodu ze starodrzewem, jodłami i szklarnią." },
];

export function PropTechWorkspace({ properties }: { properties: WorkspaceProperty[] }) {
  const [role, setRole] = useState<RoleId>("buyer");
  const [isDark, setIsDark] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"Lokalizacja" | "Cena" | null>(null);
  const [maxPrice, setMaxPrice] = useState(5000000);
  const [locationQuery, setLocationQuery] = useState("");
  const [savedIds, setSavedIds] = useState<string[]>([]);

  // Stan Map-OS (aktywna funkcja + dolna szuflada)
  const [activeFeature, setActiveFeature] = useState<FeatureId | null>(null);
  const [activeSheet, setActiveSheet] = useState<{
    title: string;
    desc: string;
    img?: string;
    tool?: FeatureNode["tool"];
  } | null>(null);

  // Mini-narzędzia w dolnej szufladzie
  const [studioPrompt, setStudioPrompt] = useState("");
  const [studioQuality, setStudioQuality] = useState<"2K" | "4K" | "8K">("4K");
  const [studioLoading, setStudioLoading] = useState(false);
  const [studioResult, setStudioResult] = useState<string | null>(null);
  const [studioError, setStudioError] = useState<string | null>(null);
  const [archiveQuery, setArchiveQuery] = useState("jodła");
  const [copied, setCopied] = useState(false);
  const [contactSent, setContactSent] = useState(false);

  useEffect(() => {
    try {
      const dark = window.localStorage.getItem("lbf_dark_mode") === "1";
      setIsDark(dark);
      document.documentElement.classList.toggle("dark", dark);
      const saved = window.localStorage.getItem("lbf_saved_ids");
      if (saved) setSavedIds(JSON.parse(saved));
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
      const q = locationQuery.trim().toLowerCase();
      const locOk =
        !q || p.location.toLowerCase().includes(q) || p.title.toLowerCase().includes(q);
      return priceOk && locOk;
    });
  }, [properties, maxPrice, locationQuery]);

  const activeProperty = useMemo(
    () => properties.find((p) => p.id === selectedId) ?? filteredProperties[0] ?? properties[0],
    [properties, filteredProperties, selectedId]
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

  const runFluxStudio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studioPrompt.trim() || !activeProperty) return;
    setStudioLoading(true);
    setStudioError(null);
    try {
      const res = await fetch("/api/studio/edit-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: activeProperty.imageUrl,
          prompt: studioPrompt.trim(),
          quality: studioQuality,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        setStudioResult(data.url);
      } else {
        setStudioError(data.error || "Nie udało się wygenerować obrazu.");
      }
    } catch {
      setStudioError("Błąd połączenia ze Studiem AI.");
    } finally {
      setStudioLoading(false);
    }
  };

  const featureConfig = activeFeature ? FEATURES[activeFeature] : null;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#F3EFE6] dark:bg-[#06110E] text-stone-900 dark:text-stone-100 transition-colors duration-500">
      {/* WARSTWA 0: Prawdziwa mapa Mapbox GL */}
      <div className="absolute inset-0 z-0">
        <BiomimeticPropertyMap
          properties={markers}
          hoveredId={hoveredId}
          selectedId={selectedId}
          onHover={setHoveredId}
          onSelect={(id) => {
            setSelectedId(id);
            setActiveFeature(role === "buyer" ? "dom" : "op");
          }}
          isDark={isDark}
        />
      </div>

      {/* GÓRA ŚRODEK: Kapsuła 3 Wydań + Filtr + Dzień/Noc */}
      <header className="fixed left-1/2 top-4 z-40 -translate-x-1/2 flex flex-col items-center gap-2 max-w-[96vw]">
        <div className="flex items-center gap-1.5 rounded-full bg-white/80 dark:bg-emerald-950/75 p-1.5 backdrop-blur-2xl border border-white/85 dark:border-emerald-400/25 shadow-xl">
          {(Object.keys(ROLE_LABELS) as RoleId[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                setRole(r);
                setActiveFeature(null);
                setActiveSheet(null);
              }}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                role === r
                  ? "bg-emerald-900 dark:bg-emerald-400 text-white dark:text-emerald-950 shadow"
                  : "text-stone-700 dark:text-stone-200 hover:bg-black/5 dark:hover:bg-white/10"
              }`}
            >
              {ROLE_LABELS[r]}
            </button>
          ))}

          <span className="mx-1 h-4 w-px bg-stone-300/70 dark:bg-emerald-700/50" />

          <button
            type="button"
            onClick={() => setActiveFilter(activeFilter === "Cena" ? null : "Cena")}
            className="rounded-full px-3 py-1.5 text-xs font-medium text-stone-700 dark:text-stone-200 hover:bg-black/5 dark:hover:bg-white/10"
          >
            Cena
          </button>

          <button
            type="button"
            onClick={toggleDark}
            aria-label="Tryb Dzień / Noc"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70 dark:bg-emerald-900/70 text-stone-800 dark:text-emerald-300"
          >
            {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
        </div>

        <AnimatePresence>
          {activeFilter && !activeFeature && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-[28px] bg-white/85 dark:bg-emerald-950/85 px-5 py-3 backdrop-blur-2xl border border-white/85 dark:border-emerald-400/25 shadow-xl"
            >
              <LiquidPriceSlider value={maxPrice} onChange={setMaxPrice} />
              <input
                type="text"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                placeholder="Filtruj lokalizację lub nazwę..."
                className="mt-2 w-full rounded-full border border-stone-300/70 dark:border-emerald-600/40 bg-white/80 dark:bg-emerald-950 px-3.5 py-1.5 text-xs focus:outline-none"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* LEWA STRONA (widok mapy głównej): Pływające karty nieruchomości */}
      {!activeFeature && (
        <aside
          className="fixed bottom-6 left-4 top-20 z-20 hidden md:block w-[360px] overflow-y-auto pr-1 space-y-4 no-scrollbar"
          style={{
            maskImage:
              "linear-gradient(to bottom, transparent 0%, black 3%, black 96%, transparent 100%)",
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
              onSelect={(id) => {
                setSelectedId(id);
                setActiveFeature(role === "buyer" ? "dom" : "op");
              }}
              onHoverChange={setHoveredId}
            />
          ))}
        </aside>
      )}

      {/* PRAWA STRONA (od góry do dołu): Pionowy dock biomimetycznych kropli Liquid Glass */}
      <nav
        aria-label="Funkcje portalu"
        className="fixed right-4 top-20 bottom-6 z-30 flex flex-col items-end gap-2.5 overflow-y-auto py-1 pr-0.5 no-scrollbar"
      >
        {ROLE_FEATURES[role].map((fId, idx) => {
          const item = FEATURES[fId];
          const Icon = item.icon;
          const isActive = activeFeature === fId;
          return (
            <motion.button
              key={fId}
              type="button"
              whileHover={{ scale: 1.05, x: -3 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                setActiveFeature(fId);
                setActiveSheet(null);
                setStudioResult(null);
                setStudioError(null);
              }}
              className="group flex items-center gap-2.5 focus:outline-none"
            >
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-xl border transition-all ${
                  isActive
                    ? "bg-emerald-900 text-white border-emerald-400 shadow-lg"
                    : "bg-white/80 dark:bg-emerald-950/75 text-stone-800 dark:text-stone-100 border-white/85 dark:border-emerald-400/25 shadow-sm"
                }`}
              >
                {item.label}
              </span>
              <span
                style={{ animationDelay: `-${idx * 1.4}s` }}
                className={`lbf-orb flex h-12 w-12 items-center justify-center transition-all ${
                  isActive
                    ? "!bg-emerald-800 !text-white ring-2 ring-emerald-400"
                    : "text-emerald-950 dark:text-emerald-200"
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
            </motion.button>
          );
        })}
      </nav>

      {/* NAKŁADKA MAP-OS: Mapa wybranej funkcji (Plan domu w Liquid Glass LUB konstelacja węzłów) */}
      <AnimatePresence>
        {featureConfig && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-25 bg-[#F3EFE6]/88 dark:bg-[#06110E]/90 backdrop-blur-xl"
          >
            {/* Delikatne izolinie topograficzne w tle mapy funkcji */}
            <svg
              viewBox="0 0 800 600"
              preserveAspectRatio="xMidYMid slice"
              className="pointer-events-none absolute inset-0 h-full w-full opacity-30 dark:opacity-20"
            >
              {[1, 2, 3, 4, 5, 6, 7].map((k) => (
                <ellipse
                  key={k}
                  cx="400"
                  cy="300"
                  rx={k * 65}
                  ry={k * 44}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={k % 2 === 0 ? 1.2 : 0.6}
                  className="text-emerald-800 dark:text-emerald-400"
                />
              ))}
            </svg>

            {/* Powrót na prawdziwą mapę */}
            <button
              type="button"
              onClick={() => {
                setActiveFeature(null);
                setActiveSheet(null);
              }}
              className="lbf-droplet-btn fixed left-4 top-4 z-40 flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-stone-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Mapa główna</span>
            </button>

            {/* Tytuł mapy funkcji */}
            <div className="pointer-events-none fixed left-1/2 top-20 z-30 -translate-x-1/2 text-center">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-emerald-800 dark:text-emerald-400">
                {activeProperty?.title || "Willa Panorama"}
              </div>
              <h2 className="text-xl font-bold tracking-tight">{featureConfig.label}</h2>
            </div>

            {/* WARIANT A: Interaktywny plan domu w płynnym szkle */}
            {featureConfig.isPlan ? (
              <div className="relative flex h-full w-full items-center justify-center px-4 pt-12 pb-28 md:pr-44">
                <div className="w-full max-w-xl rounded-[36px] bg-white/55 dark:bg-emerald-950/50 p-4 backdrop-blur-2xl border border-white/85 dark:border-emerald-400/25 shadow-2xl">
                  <svg viewBox="0 0 320 290" className="w-full h-auto">
                    {HOUSE_ROOMS.map((room) => {
                      const selected = activeSheet?.title === room.name;
                      return (
                        <g
                          key={room.id}
                          onClick={() =>
                            setActiveSheet({
                              title: room.name,
                              desc: room.desc,
                              img: room.img,
                            })
                          }
                          className="cursor-pointer group"
                        >
                          <rect
                            x={room.x}
                            y={room.y}
                            width={room.w}
                            height={room.h}
                            rx={20}
                            className={`transition-all duration-300 ${
                              selected
                                ? "fill-emerald-700/75 stroke-amber-400"
                                : "fill-emerald-600/20 dark:fill-emerald-400/15 stroke-emerald-800/40 dark:stroke-emerald-300/40 group-hover:fill-emerald-600/35"
                            }`}
                            strokeWidth={selected ? 2.5 : 1.5}
                          />
                          <text
                            x={room.x + room.w / 2}
                            y={room.y + room.h / 2 + 4}
                            textAnchor="middle"
                            className={`text-[12px] font-semibold pointer-events-none ${
                              selected ? "fill-white" : "fill-stone-900 dark:fill-stone-100"
                            }`}
                          >
                            {room.name}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                  <p className="mt-2 text-center text-[11px] text-stone-500 dark:text-emerald-200/70">
                    Kliknij dowolne pomieszczenie na planie, aby otworzyć zdjęcia i parametry strefy.
                  </p>
                </div>
              </div>
            ) : (
              /* WARIANT B: Konstelacja szklanych wysp-węzłów dla funkcji */
              <div className="relative h-full w-full md:pr-40">
                {(featureConfig.nodes || []).map((node, i, arr) => {
                  const angle = (i / arr.length) * Math.PI * 2 - Math.PI / 2;
                  const rx = arr.length > 3 ? 27 : 20;
                  const ry = arr.length > 3 ? 24 : 18;
                  const left = 50 + Math.cos(angle) * rx;
                  const top = 48 + Math.sin(angle) * ry;
                  const selected = activeSheet?.title === node.title;
                  return (
                    <motion.button
                      key={node.title}
                      type="button"
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: i * 0.05, type: "spring", stiffness: 260, damping: 20 }}
                      onClick={() =>
                        setActiveSheet({
                          title: node.title,
                          desc: node.desc,
                          tool: node.tool,
                        })
                      }
                      style={{ left: `${left}%`, top: `${top}%`, animationDelay: `-${i * 1.2}s` }}
                      className={`lbf-orb absolute -translate-x-1/2 -translate-y-1/2 flex h-28 w-32 items-center justify-center p-3 text-center text-xs font-bold leading-snug transition-all ${
                        selected
                          ? "!bg-emerald-900 !text-white ring-2 ring-amber-400 scale-110 z-30"
                          : "text-stone-900 dark:text-emerald-100 hover:scale-105"
                      }`}
                    >
                      {node.title}
                    </motion.button>
                  );
                })}
              </div>
            )}

            {/* DOLNA SZUFLADA LIQUID GLASS (zdjęcia pomieszczenia lub działające narzędzie) */}
            <AnimatePresence>
              {activeSheet && (
                <motion.div
                  initial={{ y: 80, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 80, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 320, damping: 26 }}
                  className="fixed bottom-4 left-4 right-4 md:right-48 z-40 mx-auto max-w-3xl rounded-[32px] bg-white/90 dark:bg-emerald-950/90 p-5 backdrop-blur-2xl border border-white/90 dark:border-emerald-400/30 shadow-2xl"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold">{activeSheet.title}</h3>
                      <p className="mt-0.5 text-xs text-stone-600 dark:text-stone-300">
                        {activeSheet.desc}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveSheet(null)}
                      aria-label="Zamknij panel"
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-200/70 dark:bg-white/10"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Podgląd zdjęcia pomieszczenia */}
                  {activeSheet.img && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <img
                        src={activeSheet.img}
                        alt={activeSheet.title}
                        className="h-40 w-full rounded-[20px] object-cover border border-white/80"
                      />
                      <div className="flex flex-col justify-between rounded-[20px] bg-emerald-950/5 dark:bg-white/5 p-3.5 text-xs">
                        <span>Strefa gotowa do prezentacji 3D i edycji w Studiu AI.</span>
                        <button
                          type="button"
                          onClick={() => setActiveFeature("st")}
                          className="lbf-droplet-btn mt-3 py-2 text-center font-bold text-emerald-950"
                        >
                          Otwórz w Studiu AI →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Narzędzie: Studio AI (FLUX.1) */}
                  {activeSheet.tool === "studio" && (
                    <form onSubmit={runFluxStudio} className="mt-3 space-y-2.5">
                      <div className="flex flex-wrap gap-2">
                        <input
                          type="text"
                          value={studioPrompt}
                          onChange={(e) => setStudioPrompt(e.target.value)}
                          placeholder="Np. Dodaj delfina w basenie albo zmień światło na zachód słońca..."
                          className="flex-1 min-w-[200px] rounded-full border border-stone-300 dark:border-emerald-600/40 bg-white dark:bg-emerald-950 px-4 py-2 text-xs"
                        />
                        {(["2K", "4K", "8K"] as const).map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => setStudioQuality(q)}
                            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                              studioQuality === q
                                ? "bg-emerald-900 text-white"
                                : "bg-stone-200/70 dark:bg-white/10"
                            }`}
                          >
                            {q}
                          </button>
                        ))}
                        <button
                          type="submit"
                          disabled={studioLoading}
                          className="lbf-droplet-btn !bg-emerald-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                        >
                          {studioLoading ? "FLUX.1 pracuje..." : "Generuj kopię"}
                        </button>
                      </div>
                      {studioError && <p className="text-xs font-semibold text-rose-600">{studioError}</p>}
                      {studioResult && (
                        <img
                          src={studioResult}
                          alt="Wynik FLUX.1"
                          className="h-44 w-full rounded-[20px] object-cover border border-emerald-400"
                        />
                      )}
                    </form>
                  )}

                  {/* Narzędzie: Wyszukiwarka Archiwum ("Jodła") */}
                  {activeSheet.tool === "archive" && (
                    <div className="mt-3 space-y-2">
                      <input
                        type="text"
                        value={archiveQuery}
                        onChange={(e) => setArchiveQuery(e.target.value)}
                        placeholder="Szukaj po treści zdjęcia (np. jodła, taras, salon)..."
                        className="w-full rounded-full border border-stone-300 dark:border-emerald-600/40 bg-white dark:bg-emerald-950 px-4 py-2 text-xs"
                      />
                      <div className="flex items-center justify-between text-xs">
                        <span>Dopasowano strefy dla hasła: „{archiveQuery}”</span>
                        <Link href="/properties" className="font-bold text-emerald-800 dark:text-emerald-300 underline">
                          Pełne archiwum i import folderów →
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Narzędzie: Marketing */}
                  {activeSheet.tool === "marketing" && (
                    <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-stone-100/80 dark:bg-white/5 p-3 text-xs">
                      <span className="line-clamp-2">
                        🌿 {activeProperty?.title} ({activeProperty?.area} m²) — {activeProperty?.price}. Bezpośrednio, z mapą i spacerem 3D!
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(
                            `${activeProperty?.title} — ${activeProperty?.location}, ${activeProperty?.price}`
                          );
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1800);
                        }}
                        className="lbf-droplet-btn shrink-0 flex items-center gap-1 px-3 py-1.5 font-bold text-emerald-950"
                      >
                        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copied ? "Skopiowano" : "Kopiuj"}</span>
                      </button>
                    </div>
                  )}

                  {/* Narzędzie: Kontakt */}
                  {activeSheet.tool === "contact" && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        setContactSent(true);
                      }}
                      className="mt-3 flex flex-wrap gap-2"
                    >
                      <input
                        type="text"
                        required
                        placeholder="Telefon lub e-mail"
                        className="flex-1 rounded-full border border-stone-300 dark:border-emerald-600/40 bg-white dark:bg-emerald-950 px-4 py-2 text-xs"
                      />
                      <button
                        type="submit"
                        className="lbf-droplet-btn !bg-emerald-900 px-5 py-2 text-xs font-bold text-white"
                      >
                        {contactSent ? "Wysłano!" : "Wyślij do właściciela"}
                      </button>
                    </form>
                  )}

                  {/* Narzędzie: Audytor / Pakiety */}
                  {(activeSheet.tool === "audit" || activeSheet.tool === "plans") && (
                    <div className="mt-3 flex justify-end">
                      <Link
                        href={activeSheet.tool === "plans" ? "/billing" : "/properties"}
                        className="lbf-droplet-btn !bg-emerald-900 px-5 py-2 text-xs font-bold text-white"
                      >
                        {activeSheet.tool === "plans" ? "Przejdź do płatności BLIK / Karta →" : "Otwórz pełny Audytor OCR →"}
                      </Link>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal szczegółów z analizatorem nasłonecznienia (opcjonalny) */}
      <AnimatePresence>
        {false && activeProperty && (
          <BiomimeticPropertyDetail property={activeProperty} onClose={() => setSelectedId(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
