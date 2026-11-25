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
  ExternalLink,
  FileCheck2,
  FolderSearch,
  Home,
  Mail,
  Megaphone,
  Moon,
  Paintbrush,
  Phone,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import { BiomimeticPropertyCard } from "./biomimetic-property-card";
import {
  BiomimeticPropertyMap,
  MapCameraTarget,
  PoiMarkerData,
  PropertyMarkerData,
} from "./biomimetic-property-map";
import { PropertyDetailData } from "./biomimetic-property-detail";
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
type ToolId = "studio" | "archive" | "marketing" | "audit" | "contact" | "plans";

interface FeatureNode {
  title: string;
  desc: string;
  tool?: ToolId;
  bearing?: number;
  pitch?: number;
  zoom?: number;
}

interface FeatureConfig {
  id: FeatureId;
  label: string;
  icon: React.ElementType;
  isPlan?: boolean;
  nodes?: FeatureNode[];
}

interface DrawerState {
  title: string;
  desc: string;
  img?: string;
  tool?: ToolId;
  poi?: PoiMarkerData;
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
      { title: "Model 3D z filmu", desc: "Spacer 3D (.ksplat) z jednego filmu smartfonem.", pitch: 70, zoom: 17 },
      { title: "Satelita HD", desc: "Widok z góry na działkę i nasłonecznienie.", pitch: 0, zoom: 17.5 },
      { title: "Lot drona 360°", desc: "Przelot wokół bryły domu i otoczenia.", pitch: 65, bearing: 120, zoom: 16 },
    ],
  },
  ok: {
    id: "ok",
    label: "Okolica",
    icon: Sparkles,
    nodes: [
      { title: "Zdrowie", desc: "Przychodnia i apteka — kliknij piny na żywej mapie.", zoom: 13.6, pitch: 38 },
      { title: "Aktywny wypoczynek", desc: "Rowerowa pętla o długości 18 km.", zoom: 13.2, pitch: 42, bearing: 35 },
      { title: "Woda", desc: "Przystań żeglarska i windsurfing.", zoom: 13.5, pitch: 45, bearing: -40 },
    ],
  },
  zap: {
    id: "zap",
    label: "Zapytaj właściciela",
    icon: Mail,
    nodes: [
      { title: "Bezpośredni kontakt", desc: "0% prowizji przy zakupie bezpośrednim.", tool: "contact" },
      { title: "Umów prezentację", desc: "Wizyta na miejscu lub wideospacer.", tool: "contact" },
    ],
  },
  ar: {
    id: "ar",
    label: "Archiwum",
    icon: FolderSearch,
    nodes: [
      { title: "Szukaj „Jodła”", desc: "Wyszukiwarka po treści zdjęć i wideo AI.", tool: "archive" },
      { title: "Film pod 3D", desc: "Wgraj film ze smartfona pod spacer 3D.", tool: "archive" },
    ],
  },
  st: {
    id: "st",
    label: "Studio AI",
    icon: Paintbrush,
    nodes: [
      { title: "FLUX.1 Kontext", desc: "Otwarty model FLUX.1 na Fal.ai — edycja fotografii tekstem.", tool: "studio" },
      { title: "Kopie 2K / 4K / 8K", desc: "Oryginał pozostaje nietknięty, wynik powstaje jako kopia.", tool: "studio" },
    ],
  },
  op: {
    id: "op",
    label: "Opis i Potencjał",
    icon: Sparkles,
    nodes: [
      { title: "8 parametrów", desc: "Wnioski wyciągnięte z analizy zdjęć i mapy." },
      { title: "Potencjał lokalizacji", desc: "Analiza wartości, infrastruktury i przyrody." },
    ],
  },
  mk: {
    id: "mk",
    label: "Marketing & MLS",
    icon: Megaphone,
    nodes: [
      { title: "Sieć MLS (Felix Blau)", desc: "Multiplikacja dotarcia przez sieć agencji MLS.", tool: "marketing" },
      { title: "SEO / Google Ads / FB", desc: "Gotowe pakiety reklamowe i posty.", tool: "marketing" },
    ],
  },
  au: {
    id: "au",
    label: "Audytor Umów",
    icon: FileCheck2,
    nodes: [
      { title: "Audyt PL / UE", desc: "Kontrola zadatku, terminów i ryzyk.", tool: "audit" },
      { title: "Skan OCR", desc: "Odczyt skanów i PDF-ów.", tool: "audit" },
    ],
  },
  sk: {
    id: "sk",
    label: "Skrzynka",
    icon: Mail,
    nodes: [
      { title: "Zapytania", desc: "Wiadomości od kupujących i agentów MLS." },
      { title: "Prezentacje", desc: "Harmonogram spotkań." },
    ],
  },
  pl: {
    id: "pl",
    label: "Pakiety",
    icon: Sparkles,
    nodes: [
      { title: "Właściciel Direct", desc: "49 zł / projekt — Living Map-OS, FLUX.1, 3D i MLS.", tool: "plans" },
      { title: "Agencja White-Label", desc: "199 zł / mies. — marka i portfel obiektów.", tool: "plans" },
    ],
  },
  ob: {
    id: "ob",
    label: "Moje obiekty",
    icon: Building2,
    nodes: [
      { title: "Portfel Agencji", desc: "Wszystkie nieruchomości na jednej żywej mapie." },
      { title: "Marka White-Label", desc: "Własne logo, kolory i domena." },
    ],
  },
};

const HOUSE_ROOMS = [
  { id: "salon", name: "Salon · Pd-Zach", x: 18, y: 20, w: 152, h: 112, bearing: 215, pitch: 72, img: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80", desc: "Widok przez południowo-zachodnie przeszklenia — kamera obraca się w stronę słońca." },
  { id: "kuchnia", name: "Kuchnia · Wsch", x: 178, y: 20, w: 124, h: 72, bearing: 90, pitch: 68, img: "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=900&q=80", desc: "Poranne światło wschodnie i wyspa z kamienia." },
  { id: "sypialnia", name: "Sypialnia · Pn", x: 178, y: 100, w: 124, h: 74, bearing: 0, pitch: 66, img: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=900&q=80", desc: "Cisza od północy i widok na korony drzew." },
  { id: "lazienka", name: "Łazienka", x: 18, y: 140, w: 72, h: 66, bearing: 270, pitch: 62, img: "https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=900&q=80", desc: "Strefa kąpielowa z naturalnym światłem." },
  { id: "gabinet", name: "Gabinet", x: 98, y: 140, w: 72, h: 66, bearing: 315, pitch: 64, img: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80", desc: "Cichy gabinet ze światłowodem." },
  { id: "taras", name: "Taras · Południe", x: 18, y: 214, w: 152, h: 58, bearing: 180, pitch: 75, img: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=900&q=80", desc: "Perspektywa południowa z tarasu i basenu (180°)." },
  { id: "ogrod", name: "Ogród · Zachód", x: 178, y: 182, w: 124, h: 90, bearing: 260, pitch: 70, img: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80", desc: "Dojrzały ogród ze starodrzewem, jodłami i szklarnią." },
];

export function PropTechWorkspace({ properties }: { properties: WorkspaceProperty[] }) {
  const [role, setRole] = useState<RoleId>("buyer");
  const [isDark, setIsDark] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [maxPrice, setMaxPrice] = useState(5_000_000);
  const [locationQuery, setLocationQuery] = useState("");
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [activeFeature, setActiveFeature] = useState<FeatureId | null>(null);
  const [activeDrawer, setActiveDrawer] = useState<DrawerState | null>(null);
  const [cameraTarget, setCameraTarget] = useState<MapCameraTarget | null>(null);
  const [studioSource, setStudioSource] = useState<string | null>(null);
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
      if (saved) setSavedIds(JSON.parse(saved) as string[]);
    } catch {
      setSavedIds([]);
    }
  }, []);

  const filteredProperties = useMemo(() => {
    const query = locationQuery.trim().toLocaleLowerCase("pl");
    return properties.filter(
      (property) =>
        property.priceNumeric <= maxPrice &&
        (!query ||
          property.location.toLocaleLowerCase("pl").includes(query) ||
          property.title.toLocaleLowerCase("pl").includes(query))
    );
  }, [locationQuery, maxPrice, properties]);

  const activeProperty = useMemo(
    () => properties.find((property) => property.id === selectedId) ?? filteredProperties[0] ?? properties[0],
    [filteredProperties, properties, selectedId]
  );

  const markers: PropertyMarkerData[] = useMemo(
    () =>
      filteredProperties.map((property) => ({
        id: property.id,
        priceShort: property.priceShort,
        lat: property.lat,
        lng: property.lng,
        ecoScore: property.ecoScore ?? 94,
      })),
    [filteredProperties]
  );

  const poiMarkers = useMemo<PoiMarkerData[]>(() => {
    if (!activeProperty || activeFeature !== "ok") return [];
    const googleMaps = (query: string) =>
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    return [
      {
        id: "health",
        label: "Przychodnia Zdrowia",
        category: "Zdrowie",
        lat: activeProperty.lat + 0.018,
        lng: activeProperty.lng - 0.014,
        phone: "tel:+48713250000",
        url: googleMaps("Przychodnia Zdrowia Mietków"),
        desc: "Placówka medyczna w kilku minutach od nieruchomości.",
      },
      {
        id: "pharmacy",
        label: "Apteka",
        category: "Zdrowie",
        lat: activeProperty.lat + 0.011,
        lng: activeProperty.lng + 0.024,
        url: googleMaps("Apteka Mietków"),
        desc: "Apteka w centrum osiedla.",
      },
      {
        id: "bike",
        label: "Szlak Rowerowy · 18 km",
        category: "Rekreacja",
        lat: activeProperty.lat - 0.016,
        lng: activeProperty.lng + 0.032,
        url: googleMaps("szlak rowerowy Jezioro Mietkowskie"),
        desc: "Malownicza pętla wokół jeziora, pól i lasu.",
      },
      {
        id: "marina",
        label: "Przystań & Windsurfing",
        category: "Woda",
        lat: activeProperty.lat - 0.028,
        lng: activeProperty.lng - 0.021,
        url: googleMaps("Przystań Jezioro Mietkowskie windsurfing"),
        desc: "Marina, plaża i strefa windsurfingowa.",
      },
    ];
  }, [activeFeature, activeProperty]);

  const flyToProperty = (overrides: Partial<MapCameraTarget>) => {
    if (!activeProperty) return;
    setCameraTarget({
      lng: activeProperty.lng,
      lat: activeProperty.lat,
      zoom: 17.2,
      pitch: 45,
      bearing: 0,
      ...overrides,
      ts: Date.now(),
    });
  };

  const selectFeature = (id: FeatureId) => {
    setActiveFeature(id);
    setActiveDrawer(null);
    setStudioResult(null);
    setStudioError(null);
    if (id === "ok") {
      flyToProperty({ zoom: 13.6, pitch: 38, bearing: 0 });
    }
  };

  const toggleDark = () => {
    setIsDark((current) => {
      const next = !current;
      document.documentElement.classList.toggle("dark", next);
      window.localStorage.setItem("lbf_dark_mode", next ? "1" : "0");
      return next;
    });
  };

  const toggleSave = (id: string) => {
    setSavedIds((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      window.localStorage.setItem("lbf_saved_ids", JSON.stringify(next));
      return next;
    });
  };

  const runFluxStudio = async (event: React.FormEvent) => {
    event.preventDefault();
    const imageUrl = studioSource ?? activeProperty?.imageUrl;
    if (!studioPrompt.trim() || !imageUrl) return;
    setStudioLoading(true);
    setStudioError(null);
    try {
      const response = await fetch("/api/studio/edit-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, prompt: studioPrompt.trim(), quality: studioQuality }),
      });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        setStudioError(data.error ?? "Nie udało się wygenerować obrazu.");
        return;
      }
      setStudioResult(data.url);
    } catch (error) {
      setStudioError(error instanceof Error ? error.message : "Błąd połączenia ze Studiem AI.");
    } finally {
      setStudioLoading(false);
    }
  };

  const copyMarketing = async () => {
    if (!activeProperty) return;
    const text = `${activeProperty.title} — ${activeProperty.location}, ${activeProperty.area} m², ${activeProperty.price}. Living Map-OS + spacer 3D. MLS: Felix Blau.`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setStudioError("Nie udało się skopiować treści. Zaznacz tekst ręcznie.");
    }
  };

  const feature = activeFeature ? FEATURES[activeFeature] : null;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#F3EFE6] text-stone-900 transition-colors duration-500 dark:bg-[#06110E] dark:text-stone-100">
      <div className="absolute inset-0 z-0">
        <BiomimeticPropertyMap
          properties={markers}
          hoveredId={hoveredId}
          selectedId={selectedId}
          onHover={setHoveredId}
          onSelect={(id) => {
            setSelectedId(id);
            selectFeature(role === "buyer" ? "dom" : "op");
          }}
          isDark={isDark}
          cameraTarget={cameraTarget}
          poiMarkers={poiMarkers}
          onSelectPoi={(poi) =>
            setActiveDrawer({ title: poi.label, desc: poi.desc, poi })
          }
        />
      </div>

      <div className="pointer-events-none absolute inset-0 z-20">
        <header className="pointer-events-auto absolute left-1/2 top-4 z-40 flex max-w-[96vw] -translate-x-1/2 flex-col items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-white/85 bg-white/80 p-1.5 shadow-xl backdrop-blur-2xl dark:border-emerald-400/25 dark:bg-emerald-950/75">
            {(Object.keys(ROLE_LABELS) as RoleId[]).map((roleId) => (
              <button
                key={roleId}
                type="button"
                onClick={() => {
                  setRole(roleId);
                  setActiveFeature(null);
                  setActiveDrawer(null);
                }}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  role === roleId
                    ? "bg-emerald-900 text-white shadow dark:bg-emerald-400 dark:text-emerald-950"
                    : "text-stone-700 hover:bg-black/5 dark:text-stone-200 dark:hover:bg-white/10"
                }`}
              >
                {ROLE_LABELS[roleId]}
              </button>
            ))}
            <span className="mx-1 h-4 w-px bg-stone-300/70 dark:bg-emerald-700/50" />
            <button
              type="button"
              onClick={() => setShowFilter((visible) => !visible)}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-black/5 dark:text-stone-200 dark:hover:bg-white/10"
            >
              Filtr
            </button>
            <button
              type="button"
              onClick={toggleDark}
              aria-label="Przełącz Dzień / Noc"
              className="flex h-8 items-center gap-1 rounded-full bg-white/70 px-2 text-xs text-stone-800 dark:bg-emerald-900/70 dark:text-emerald-300"
            >
              {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{isDark ? "Dzień" : "Noc"}</span>
            </button>
          </div>

          <AnimatePresence>
            {showFilter && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="w-[min(360px,92vw)] rounded-[28px] border border-white/85 bg-white/88 px-5 py-3 shadow-xl backdrop-blur-2xl dark:border-emerald-400/25 dark:bg-emerald-950/88"
              >
                <LiquidPriceSlider value={maxPrice} onChange={setMaxPrice} />
                <input
                  type="text"
                  value={locationQuery}
                  onChange={(event) => setLocationQuery(event.target.value)}
                  placeholder="Lokalizacja lub nazwa nieruchomości"
                  className="mt-2 w-full rounded-full border border-stone-300/70 bg-white/80 px-3.5 py-1.5 text-xs focus:outline-none dark:border-emerald-600/40 dark:bg-emerald-950"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {!feature && (
          <aside
            className="no-scrollbar pointer-events-auto absolute bottom-6 left-4 top-20 hidden w-[350px] space-y-4 overflow-y-auto pr-1 md:block"
            style={{ maskImage: "linear-gradient(to bottom, transparent 0%, black 4%, black 96%, transparent 100%)" }}
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
                  selectFeature(role === "buyer" ? "dom" : "op");
                }}
                onHoverChange={setHoveredId}
              />
            ))}
          </aside>
        )}

        <nav
          aria-label="Funkcje Living Map-OS"
          className="no-scrollbar pointer-events-auto absolute bottom-5 right-3 top-20 flex flex-col items-end gap-2.5 overflow-y-auto py-1 pr-0.5"
        >
          {ROLE_FEATURES[role].map((featureId, index) => {
            const item = FEATURES[featureId];
            const Icon = item.icon;
            const isActive = activeFeature === featureId;
            return (
              <button
                key={featureId}
                type="button"
                onClick={() => selectFeature(featureId)}
                className="group flex items-center gap-2.5 focus:outline-none"
              >
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold shadow-sm backdrop-blur-xl transition-all ${
                    isActive
                      ? "border-emerald-400 bg-emerald-900 text-white shadow-lg"
                      : "border-white/85 bg-white/80 text-stone-800 dark:border-emerald-400/25 dark:bg-emerald-950/75 dark:text-stone-100"
                  }`}
                >
                  {item.label}
                </span>
                <span
                  style={{ animationDelay: `-${index * 1.4}s` }}
                  className={`lbf-droplet-3d flex h-12 w-12 items-center justify-center text-emerald-950 dark:text-emerald-100 ${
                    isActive ? "ring-2 ring-amber-300" : ""
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
              </button>
            );
          })}
        </nav>

        <AnimatePresence>
          {feature && (
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none"
            >
              <button
                type="button"
                onClick={() => {
                  setActiveFeature(null);
                  setActiveDrawer(null);
                }}
                className="lbf-droplet-3d pointer-events-auto absolute left-4 top-4 flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Mapa główna
              </button>

              <div className="pointer-events-none absolute left-1/2 top-20 -translate-x-1/2 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-800 drop-shadow-sm dark:text-emerald-300">
                  {activeProperty?.title ?? "Willa Panorama"}
                </p>
                <h2 className="text-xl font-bold tracking-tight drop-shadow-md">{feature.label}</h2>
              </div>

              {feature.isPlan ? (
                <div className="pointer-events-auto absolute bottom-24 left-4 top-20 w-[min(430px,calc(100vw-32px))] md:bottom-8">
                  <div className="lbf-glass h-full overflow-hidden rounded-[36px] p-4">
                    <svg viewBox="0 0 320 290" className="h-full w-full">
                      {HOUSE_ROOMS.map((room) => {
                        const selected = activeDrawer?.title === room.name;
                        return (
                          <g
                            key={room.id}
                            role="button"
                            tabIndex={0}
                            aria-label={`Zobacz ${room.name}`}
                            onClick={() => {
                              flyToProperty({ bearing: room.bearing, pitch: room.pitch, zoom: 17.2 });
                              setStudioSource(room.img);
                              setActiveDrawer({ title: room.name, desc: room.desc, img: room.img });
                            }}
                            onKeyDown={(event) => {
                              if (event.key !== "Enter" && event.key !== " ") return;
                              event.preventDefault();
                              flyToProperty({ bearing: room.bearing, pitch: room.pitch, zoom: 17.2 });
                              setStudioSource(room.img);
                              setActiveDrawer({ title: room.name, desc: room.desc, img: room.img });
                            }}
                            className="group cursor-pointer"
                          >
                            <rect
                              x={room.x}
                              y={room.y}
                              width={room.w}
                              height={room.h}
                              rx={20}
                              className={`stroke-emerald-800/45 transition-all duration-300 dark:stroke-emerald-300/45 ${
                                selected
                                  ? "fill-emerald-700/75 stroke-amber-400"
                                  : "fill-white/35 group-hover:fill-emerald-400/35 dark:fill-emerald-400/15"
                              }`}
                              strokeWidth={selected ? 2.5 : 1.5}
                            />
                            <text
                              x={room.x + room.w / 2}
                              y={room.y + room.h / 2 + 4}
                              textAnchor="middle"
                              className={`pointer-events-none text-[10px] font-semibold ${
                                selected ? "fill-white" : "fill-stone-900 dark:fill-stone-100"
                              }`}
                            >
                              {room.name}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>
              ) : (
                <div className="absolute bottom-28 left-4 top-24 flex w-[min(310px,calc(100vw-92px))] flex-col justify-center gap-4">
                  {(feature.nodes ?? []).map((node, index) => (
                    <motion.button
                      key={node.title}
                      type="button"
                      initial={{ x: -24, opacity: 0 }}
                      animate={{ x: index % 2 ? 18 : 0, opacity: 1 }}
                      transition={{ delay: index * 0.06, type: "spring", stiffness: 280, damping: 22 }}
                      onClick={() => {
                        if (node.zoom !== undefined) {
                          flyToProperty({
                            zoom: node.zoom,
                            pitch: node.pitch,
                            bearing: node.bearing ?? 0,
                          });
                        }
                        setActiveDrawer({ title: node.title, desc: node.desc, tool: node.tool });
                      }}
                      className={`lbf-droplet-3d pointer-events-auto w-full px-5 py-4 text-left ${
                        activeDrawer?.title === node.title ? "ring-2 ring-amber-300" : ""
                      }`}
                    >
                      <span className="block text-xs font-bold">{node.title}</span>
                      <span className="mt-1 block text-[10px] leading-relaxed text-stone-700 dark:text-emerald-100/80">
                        {node.desc}
                      </span>
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.section>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {activeDrawer && (
            <motion.aside
              initial={{ y: 90, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 90, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="lbf-glass pointer-events-auto absolute bottom-4 left-4 right-4 mx-auto max-w-3xl rounded-[32px] p-5 md:right-48"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold">{activeDrawer.title}</h3>
                  <p className="mt-0.5 text-xs text-stone-600 dark:text-stone-300">{activeDrawer.desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveDrawer(null)}
                  aria-label="Zamknij panel"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-200/70 dark:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {activeDrawer.img && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <img src={activeDrawer.img} alt={activeDrawer.title} className="h-40 w-full rounded-[20px] object-cover" />
                  <div className="flex flex-col justify-between rounded-[20px] bg-emerald-950/5 p-3.5 text-xs dark:bg-white/5">
                    <span>Rzeczywista perspektywa widoku z okna została ustawiona na żywej mapie.</span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveFeature("st");
                        setActiveDrawer({
                          title: "Studio FLUX.1",
                          desc: "Edytuj kopię zdjęcia strefy za pomocą otwartego modelu FLUX.1 Kontext.",
                          tool: "studio",
                        });
                      }}
                      className="lbf-droplet-btn mt-3 py-2 text-center font-bold"
                    >
                      Przejdź do Studia FLUX.1 →
                    </button>
                  </div>
                </div>
              )}

              {activeDrawer.poi && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {activeDrawer.poi.phone && (
                    <a
                      href={activeDrawer.poi.phone}
                      className="lbf-droplet-btn flex items-center gap-2 px-4 py-2 text-xs font-bold"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      Zadzwoń
                    </a>
                  )}
                  {activeDrawer.poi.url && (
                    <a
                      href={activeDrawer.poi.url}
                      target="_blank"
                      rel="noreferrer"
                      className="lbf-droplet-btn flex items-center gap-2 px-4 py-2 text-xs font-bold"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Google Maps
                    </a>
                  )}
                </div>
              )}

              {activeDrawer.tool === "studio" && (
                <form onSubmit={runFluxStudio} className="mt-3 space-y-2.5">
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      value={studioPrompt}
                      onChange={(event) => setStudioPrompt(event.target.value)}
                      placeholder="Np. Zmień światło na ciepły zachód słońca..."
                      className="min-w-[200px] flex-1 rounded-full border border-stone-300 bg-white px-4 py-2 text-xs dark:border-emerald-600/40 dark:bg-emerald-950"
                    />
                    {(["2K", "4K", "8K"] as const).map((quality) => (
                      <button
                        key={quality}
                        type="button"
                        onClick={() => setStudioQuality(quality)}
                        className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                          studioQuality === quality
                            ? "bg-emerald-900 text-white"
                            : "bg-stone-200/70 dark:bg-white/10"
                        }`}
                      >
                        {quality}
                      </button>
                    ))}
                    <button
                      type="submit"
                      disabled={studioLoading || !studioPrompt.trim()}
                      className="rounded-full bg-emerald-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                    >
                      {studioLoading ? "FLUX.1 pracuje..." : "Generuj kopię"}
                    </button>
                  </div>
                  {studioError && <p className="text-xs font-semibold text-rose-600">{studioError}</p>}
                  {studioResult && (
                    <img src={studioResult} alt="Wynik edycji FLUX.1" className="h-44 w-full rounded-[20px] border border-emerald-400 object-cover" />
                  )}
                </form>
              )}

              {activeDrawer.tool === "archive" && (
                <div className="mt-3 space-y-2">
                  <input
                    type="text"
                    value={archiveQuery}
                    onChange={(event) => setArchiveQuery(event.target.value)}
                    placeholder="Szukaj po treści zdjęcia..."
                    className="w-full rounded-full border border-stone-300 bg-white px-4 py-2 text-xs dark:border-emerald-600/40 dark:bg-emerald-950"
                  />
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span>Dopasowano strefy dla hasła: „{archiveQuery}”</span>
                    <Link href="/properties" className="font-bold text-emerald-800 underline dark:text-emerald-300">
                      Pełne archiwum →
                    </Link>
                  </div>
                </div>
              )}

              {activeDrawer.tool === "marketing" && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-stone-100/80 p-3 text-xs dark:bg-white/5">
                  <span className="line-clamp-2">
                    {activeProperty?.title} — {activeProperty?.location}, {activeProperty?.area} m². MLS: Felix Blau.
                  </span>
                  <button
                    type="button"
                    onClick={copyMarketing}
                    className="lbf-droplet-btn flex shrink-0 items-center gap-1 px-3 py-1.5 font-bold"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Skopiowano" : "Kopiuj"}
                  </button>
                </div>
              )}

              {activeDrawer.tool === "contact" && (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    setContactSent(true);
                  }}
                  className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
                >
                  <input required type="text" placeholder="Imię" className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs dark:border-emerald-600/40 dark:bg-emerald-950" />
                  <input required type="text" placeholder="Telefon lub e-mail" className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs dark:border-emerald-600/40 dark:bg-emerald-950" />
                  <button type="submit" className="rounded-full bg-emerald-900 px-5 py-2 text-xs font-bold text-white">
                    {contactSent ? "Wysłano!" : "Wyślij"}
                  </button>
                </form>
              )}

              {(activeDrawer.tool === "audit" || activeDrawer.tool === "plans") && (
                <div className="mt-3 flex justify-end">
                  <Link
                    href={activeDrawer.tool === "plans" ? "/billing" : "/properties"}
                    className="lbf-droplet-btn px-5 py-2 text-xs font-bold"
                  >
                    {activeDrawer.tool === "plans" ? "Pakiety i płatność →" : "Otwórz pełny Audytor OCR →"}
                  </Link>
                </div>
              )}
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
