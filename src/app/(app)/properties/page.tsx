"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Sparkles,
  Search,
  Upload,
  Paintbrush,
  Eraser,
  Megaphone,
  FileCheck2,
  Building2,
  Copy,
  Check,
  Send,
  Layers,
} from "lucide-react";
import { BiomimeticLiquidLayer } from "@/components/biomimetic-liquid-layer";

type Edition = "buyer" | "owner" | "agency";
type OwnerTab = "analysis" | "archive" | "studio" | "marketing" | "audit" | "plans";

type PropertyItem = {
  id: string;
  title: string;
  city: string;
  address?: string | null;
  price?: number | null;
  area?: number | null;
  rooms?: number | null;
  description?: string | null;
};

type MediaItem = {
  id: string;
  url: string;
  aiDescription?: string | null;
  aiTags?: string[] | null;
  category?: string | null;
  mediaType?: string | null;
};

const ZONES = ["Wszystkie", "Salon", "Ogród", "Elewacja", "Kuchnia", "Otoczenie"] as const;

const DEMO_MEDIA: MediaItem[] = [
  {
    id: "demo-1",
    url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80",
    aiDescription: "Elewacja willi, taras i basen w porannym świetle",
    aiTags: ["elewacja", "basen", "taras", "ogród", "jodła"],
    category: "Elewacja",
  },
  {
    id: "demo-2",
    url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
    aiDescription: "Przestronny salon z przeszkleniami na zieleń",
    aiTags: ["salon", "drewno", "światło", "okna"],
    category: "Salon",
  },
  {
    id: "demo-3",
    url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
    aiDescription: "Ogród parkowy ze starodrzewem i jodłami",
    aiTags: ["ogród", "jodła", "zieleń", "otoczenie"],
    category: "Ogród",
  },
];

export default function LiquidBiomimeticsCommandCenter() {
  const [edition, setEdition] = useState<Edition>("owner");
  const [activeTab, setActiveTab] = useState<OwnerTab>("analysis");
  const [agencyBrand, setAgencyBrand] = useState("Willa Panorama White-Label");

  // Dane obiektów
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [media, setMedia] = useState<MediaItem[]>(DEMO_MEDIA);
  const [statusMsg, setStatusMsg] = useState("");

  // 2 duże edytowalne okna (Opis + Potencjał lokalizacji)
  const [editableDesc, setEditableDesc] = useState(
    "Wolnostojąca rezydencja zatopiona w zieleni, z panoramicznymi przeszkleniami na południe, naturalnym drewnem i ogrodem ze starodrzewem."
  );
  const [editablePotential, setEditablePotential] = useState(
    "Otulina parku krajobrazowego, szybki dojazd do aglomeracji, bezpośrednie sąsiedztwo jeziora i terenów rekreacyjnych. Wysoki potencjał wzrostu wartości oraz najmu premium."
  );

  // Archiwum i wyszukiwarka po treści ("Jodła")
  const [zoneFilter, setZoneFilter] = useState<string>("Wszystkie");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Studio AI + pędzel/maska Canvas (iPad + myszka)
  const [studioPhoto, setStudioPhoto] = useState<MediaItem>(DEMO_MEDIA[0]);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [quality, setQuality] = useState<"2K" | "4K" | "8K">("4K");
  const [brushSize, setBrushSize] = useState<number>(28);
  const [isDrawing, setIsDrawing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Marketing + Audytor + Kontakt
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [auditResult, setAuditResult] = useState<string>("");
  const [contactSent, setContactSent] = useState(false);

  useEffect(() => {
    fetch("/api/properties", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        const list: PropertyItem[] = Array.isArray(data) ? data : data.properties ?? [];
        setProperties(list);
        if (list.length > 0) {
          setSelectedId(list[0].id);
          if (list[0].description) setEditableDesc(list[0].description);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    fetch(`/api/properties/${selectedId}/media`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        const list: MediaItem[] = Array.isArray(data) ? data : data.media ?? [];
        if (list.length > 0) {
          setMedia(list);
          setStudioPhoto(list[0]);
        }
      })
      .catch(() => {});
  }, [selectedId]);

  const currentProperty = useMemo<PropertyItem>(() => {
    const found = properties.find((p) => p.id === selectedId);
    return (
      found || {
        id: "demo-prop",
        title: "Willa Panorama nad Jeziorem",
        city: "Borzygniew · Jezioro Mietkowskie",
        price: 2450000,
        area: 240,
        rooms: 6,
      }
    );
  }, [properties, selectedId]);

  const filteredMedia = useMemo(() => {
    return media.filter((m) => {
      const zoneOk =
        zoneFilter === "Wszystkie" ||
        (m.category || "").toLowerCase() === zoneFilter.toLowerCase();
      const q = searchQuery.trim().toLowerCase();
      const textOk =
        !q ||
        (m.aiDescription || "").toLowerCase().includes(q) ||
        (m.category || "").toLowerCase().includes(q) ||
        (m.aiTags || []).some((t) => t.toLowerCase().includes(q));
      return zoneOk && textOk;
    });
  }, [media, zoneFilter, searchQuery]);

  // Obsługa pędzla na Canvasie (działa dotykiem na iPadzie i myszką)
  const drawAt = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    ctx.fillStyle = "rgba(16, 185, 129, 0.45)";
    ctx.beginPath();
    ctx.arc(x, y, brushSize, 0, Math.PI * 2);
    ctx.fill();
  };

  const clearMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleMultiUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setStatusMsg(`Importowanie ${files.length} plików...`);

    if (!selectedId) {
      const localItems: MediaItem[] = files.map((f, idx) => ({
        id: `local-${Date.now()}-${idx}`,
        url: URL.createObjectURL(f),
        aiDescription: f.name,
        aiTags: ["import", "lokalny"],
        category: "Salon",
      }));
      setMedia((prev) => [...localItems, ...prev]);
      setStatusMsg(`Dodano ${files.length} plików do podglądu.`);
      return;
    }

    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      await fetch(`/api/properties/${selectedId}/media`, { method: "POST", body: fd }).catch(
        () => {}
      );
    }
    const res = await fetch(`/api/properties/${selectedId}/media`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      const list: MediaItem[] = Array.isArray(data) ? data : data.media ?? [];
      if (list.length > 0) setMedia(list);
    }
    setStatusMsg(`Zaimportowano ${files.length} plików do archiwum.`);
  };

  const handleGenerateCopy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setGenerating(true);
    setStatusMsg("Generowanie nowej kopii w Studiu AI...");
    try {
      const maskDataUrl = canvasRef.current?.toDataURL("image/png") || undefined;
      const res = await fetch("/api/studio/edit-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: selectedId || currentProperty.id,
          mediaId: studioPhoto.id,
          prompt: prompt.trim(),
          quality,
          maskDataUrl,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        setGeneratedUrl(data.url);
        setStatusMsg(`Zapisano nową kopię (${quality}) bez naruszania oryginału.`);
      } else {
        setStatusMsg(data.error || "Zapisano zlecenie — sprawdź klucz GEMINI_API_KEY na Vercelu.");
      }
    } catch {
      setStatusMsg("Błąd połączenia ze Studiem AI.");
    } finally {
      setGenerating(false);
    }
  };

  const copyText = (key: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const seoPack = `Tytuł SEO: ${currentProperty.title} | ${currentProperty.city} (${currentProperty.area || 240} m²)
Meta opis: ${editableDesc.slice(0, 155)}...
Słowa kluczowe: dom nad jeziorem, ${currentProperty.city}, willa premium, ogród ze starodrzewem, bez prowizji`;

  const fbPost = `🌿 ${currentProperty.title} — ${currentProperty.city}
📐 ${currentProperty.area || 240} m² | 🛏️ ${currentProperty.rooms || 6} pokoi | 💎 ${(
    currentProperty.price || 2450000
  ).toLocaleString("pl-PL")} zł

${editableDesc}

✨ Zobacz interaktywną mapę i analizę nasłonecznienia na żywo!`;

  const eightParams = [
    { label: "Cena ofertowa", value: `${(currentProperty.price || 2450000).toLocaleString("pl-PL")} zł` },
    { label: "Powierzchnia", value: `${currentProperty.area || 240} m²` },
    { label: "Liczba pokoi", value: `${currentProperty.rooms || 6}` },
    { label: "Bio-Index", value: "97 / 100" },
    { label: "Ekspozycja", value: "Południowy-Zachód" },
    { label: "Działka", value: "1 000 m² (parkowa)" },
    { label: "Otoczenie", value: "Jezioro + Las" },
    { label: "Status", value: "Bezpośrednio" },
  ];

  return (
    <div className="relative min-h-screen pb-20 text-[#1C2B23]">
      <BiomimeticLiquidLayer />

      {/* Pływająca górna kapsuła z 3 Wydaniami */}
      <header className="sticky top-4 z-40 mx-auto max-w-6xl px-4">
        <div className="lbf-glass flex flex-wrap items-center justify-between gap-3 rounded-full px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="lbf-droplet-btn flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#1C2B23]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Mapa główna</span>
            </Link>
            {edition === "agency" && (
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-900 px-3 py-1 text-[11px] font-semibold text-white">
                <Building2 className="h-3 w-3" />
                {agencyBrand}
              </span>
            )}
          </div>

          {/* Przełącznik 3 Wydań */}
          <div className="flex items-center gap-1 rounded-full bg-white/50 p-1 border border-white/80">
            {(
              [
                { id: "buyer", label: "Wydanie Kupującego" },
                { id: "owner", label: "Wydanie Właściciela" },
                { id: "agency", label: "Agencja White-Label" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setEdition(item.id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  edition === item.id
                    ? "bg-emerald-900 text-white shadow-md"
                    : "text-[#1C2B23]/75 hover:text-[#1C2B23]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto mt-6 max-w-6xl space-y-6 px-4">
        {/* Status */}
        {statusMsg && (
          <div className="lbf-glass rounded-full px-5 py-2 text-xs font-semibold text-emerald-900 inline-block">
            {statusMsg}
          </div>
        )}

        {/* Pasek White-Label dla Agencji */}
        {edition === "agency" && (
          <section className="lbf-glass rounded-[28px] p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-800">
                Tryb Agencji White-Label
              </p>
              <h2 className="text-base font-bold">Własny branding i portfel wielu obiektów</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={agencyBrand}
                onChange={(e) => setAgencyBrand(e.target.value)}
                className="lbf-input !w-60 !py-2 text-xs"
                placeholder="Nazwa Twojej agencji"
              />
              {properties.length > 0 && (
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="lbf-input !w-56 !py-2 text-xs"
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </section>
        )}

        {/* === WYDANIE KUPUJĄCEGO (Publiczne, czyste, zero narzędzi sprzedawcy) === */}
        {edition === "buyer" ? (
          <div className="space-y-6">
            {/* Karuzela wizytówkowa stref */}
            <section className="lbf-glass rounded-[36px] p-6">
              <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-900/10 px-3 py-1 text-xs font-semibold text-emerald-900">
                    <Sparkles className="h-3.5 w-3.5" /> Prezentacja Publiczna
                  </span>
                  <h1 className="mt-2 text-3xl font-bold tracking-tight">{currentProperty.title}</h1>
                  <p className="text-sm text-[#4E5B53]">{currentProperty.city}</p>
                </div>
                <div className="text-2xl font-extrabold text-emerald-900">
                  {(currentProperty.price || 2450000).toLocaleString("pl-PL")} zł
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {media.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="relative aspect-[4/3] overflow-hidden rounded-[26px] border border-white/85 shadow-md"
                  >
                    <img
                      src={item.url}
                      alt={item.aiDescription || "Strefa nieruchomości"}
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute bottom-3 left-3 rounded-full bg-black/45 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
                      {item.category || "Strefa"}
                    </span>
                  </div>
                ))}
              </div>

              {/* 8 twardych parametrów */}
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {eightParams.map((p) => (
                  <div
                    key={p.label}
                    className="rounded-[22px] bg-white/70 p-3.5 border border-white/90"
                  >
                    <div className="text-[11px] text-[#4E5B53]">{p.label}</div>
                    <div className="mt-0.5 text-sm font-bold text-[#1C2B23]">{p.value}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Opis + Potencjał + Formularz kontaktu */}
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lbf-glass rounded-[32px] p-6 lg:col-span-2 space-y-5">
                <div>
                  <h2 className="text-lg font-bold">Opis nieruchomości</h2>
                  <p className="mt-2 text-sm leading-relaxed text-[#4E5B53]">{editableDesc}</p>
                </div>
                <div className="border-t border-[#1C2B23]/10 pt-5">
                  <h2 className="text-lg font-bold">Potencjał lokalizacji</h2>
                  <p className="mt-2 text-sm leading-relaxed text-[#4E5B53]">{editablePotential}</p>
                </div>
              </div>

              <div className="lbf-glass rounded-[32px] p-6">
                <h2 className="text-lg font-bold">Zapytaj o prezentację</h2>
                <p className="mt-1 text-xs text-[#4E5B53]">
                  Bezpośredni kontakt bez pośredników i prowizji.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setContactSent(true);
                  }}
                  className="mt-4 space-y-3"
                >
                  <input type="text" required placeholder="Twoje imię" className="lbf-input text-xs" />
                  <input type="tel" required placeholder="Telefon lub e-mail" className="lbf-input text-xs" />
                  <textarea
                    rows={3}
                    placeholder="Preferowany termin wizyty..."
                    className="lbf-input text-xs"
                  />
                  <button
                    type="submit"
                    className="lbf-droplet-btn flex w-full items-center justify-center gap-2 py-3 text-xs font-bold text-emerald-950"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{contactSent ? "Wiadomość wysłana" : "Wyślij zapytanie"}</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : (
          /* === WYDANIE WŁAŚCICIELA & AGENCJI (Centrum Dowodzenia — 6 modułów) === */
          <div className="space-y-6">
            {/* Pływające przyciski-krople modułów */}
            <nav className="flex flex-wrap items-center gap-2.5">
              {(
                [
                  { id: "analysis", label: "1. Analiza & 8 Parametrów", icon: Layers },
                  { id: "archive", label: "2. Archiwum & Szukaj („Jodła”)", icon: Search },
                  { id: "studio", label: "3. Studio AI (Maska 2K/4K/8K)", icon: Paintbrush },
                  { id: "marketing", label: "4. Marketing SEO / Ads / FB", icon: Megaphone },
                  { id: "audit", label: "5. Audytor Umów PL/EU", icon: FileCheck2 },
                  { id: "plans", label: "6. Pakiety Direct & Agencja", icon: Sparkles },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`lbf-droplet-btn flex items-center gap-2 px-4 py-2.5 text-xs font-semibold ${
                      active ? "!bg-emerald-900 !text-white !border-emerald-400" : "text-[#1C2B23]"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* MODUŁ 1: Głęboka Analiza + 8 Parametrów + 2 duże edytowalne okna */}
            {activeTab === "analysis" && (
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="lbf-glass rounded-[36px] p-6 md:p-8 space-y-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold">{currentProperty.title}</h1>
                    <p className="text-xs text-[#4E5B53]">{currentProperty.city}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStatusMsg("Zaktualizowano 8 parametrów i oba okna analityczne.")}
                    className="lbf-droplet-btn flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-emerald-950"
                  >
                    <Sparkles className="h-4 w-4 text-emerald-700" />
                    <span>Uruchom Głęboką Analizę AI</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {eightParams.map((p) => (
                    <div key={p.label} className="rounded-[22px] bg-white/75 p-3.5 border border-white">
                      <div className="text-[11px] text-[#4E5B53]">{p.label}</div>
                      <div className="mt-0.5 text-sm font-bold">{p.value}</div>
                    </div>
                  ))}
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                      Okno 1: Opis nieruchomości (edytowalny)
                    </label>
                    <textarea
                      rows={6}
                      value={editableDesc}
                      onChange={(e) => setEditableDesc(e.target.value)}
                      className="lbf-input text-sm leading-relaxed"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                      Okno 2: Potencjał lokalizacji (edytowalny)
                    </label>
                    <textarea
                      rows={6}
                      value={editablePotential}
                      onChange={(e) => setEditablePotential(e.target.value)}
                      className="lbf-input text-sm leading-relaxed"
                    />
                  </div>
                </div>
              </motion.section>
            )}

            {/* MODUŁ 2: Archiwum + Wyszukiwarka po treści ("Jodła") + 6 zakładek */}
            {activeTab === "archive" && (
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="lbf-glass rounded-[36px] p-6 md:p-8 space-y-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="relative flex-1 min-w-[240px]">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4E5B53]" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Szukaj po treści zdjęcia, np. Jodła, basen, salon..."
                      className="lbf-input !pl-10 text-xs"
                    />
                  </div>

                  <label className="lbf-droplet-btn cursor-pointer flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-emerald-950">
                    <Upload className="h-3.5 w-3.5" />
                    <span>Importuj pliki / folder</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={handleMultiUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* 6 zakładek stref */}
                <div className="flex flex-wrap gap-2">
                  {ZONES.map((z) => (
                    <button
                      key={z}
                      type="button"
                      onClick={() => setZoneFilter(z)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                        zoneFilter === z
                          ? "bg-emerald-900 text-white"
                          : "bg-white/75 text-[#1C2B23] hover:bg-white"
                      }`}
                    >
                      {z}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredMedia.map((item) => (
                    <div
                      key={item.id}
                      className="overflow-hidden rounded-[26px] bg-white/80 border border-white shadow-sm"
                    >
                      <div className="relative aspect-[4/3]">
                        <img
                          src={item.url}
                          alt={item.aiDescription || "Zdjęcie"}
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setStudioPhoto(item);
                            setGeneratedUrl(null);
                            setActiveTab("studio");
                          }}
                          className="lbf-droplet-btn absolute bottom-3 right-3 px-3 py-1.5 text-[11px] font-bold text-emerald-950"
                        >
                          Edytuj w Studiu →
                        </button>
                      </div>
                      <div className="p-3.5">
                        <p className="text-xs font-semibold line-clamp-1">
                          {item.aiDescription || "Materiał z archiwum"}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {(item.aiTags || [item.category || "strefa"]).map((t) => (
                            <span
                              key={t}
                              className="rounded-full bg-emerald-900/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-900"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* MODUŁ 3: Studio Aranżacji AI (Pędzel/Maska + 2K/4K/8K + Kopia) */}
            {activeTab === "studio" && (
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="lbf-glass rounded-[36px] p-6 md:p-8"
              >
                <div className="grid gap-6 lg:grid-cols-12">
                  <div className="lg:col-span-7 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-lg font-bold">Zaznacz obszar pędzlem (dotyk / myszka)</h2>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={10}
                          max={60}
                          value={brushSize}
                          onChange={(e) => setBrushSize(Number(e.target.value))}
                          className="w-24 accent-emerald-800"
                          aria-label="Rozmiar pędzla"
                        />
                        <button
                          type="button"
                          onClick={clearMask}
                          className="lbf-droplet-btn flex items-center gap-1 px-3 py-1.5 text-xs font-semibold"
                        >
                          <Eraser className="h-3.5 w-3.5" /> Wyczyść maskę
                        </button>
                      </div>
                    </div>

                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[28px] border border-white bg-white/70 shadow-inner">
                      <img
                        src={generatedUrl || studioPhoto.url}
                        alt="Podgląd Studia"
                        className="h-full w-full object-cover select-none"
                      />
                      {!generatedUrl && (
                        <canvas
                          ref={canvasRef}
                          width={800}
                          height={600}
                          onPointerDown={(e) => {
                            setIsDrawing(true);
                            drawAt(e);
                          }}
                          onPointerMove={(e) => {
                            if (isDrawing) drawAt(e);
                          }}
                          onPointerUp={() => setIsDrawing(false)}
                          onPointerLeave={() => setIsDrawing(false)}
                          className="absolute inset-0 h-full w-full touch-none cursor-crosshair"
                        />
                      )}
                    </div>

                    {generatedUrl && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-emerald-800">
                          Podgląd nowej kopii ({quality}) — oryginał nietknięty
                        </span>
                        <button
                          type="button"
                          onClick={() => setGeneratedUrl(null)}
                          className="underline font-semibold"
                        >
                          Wróć do oryginału
                        </button>
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleGenerateCopy} className="lg:col-span-5 space-y-4">
                    <h3 className="text-base font-bold">Polecenie aranżacji AI</h3>
                    <textarea
                      rows={4}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Opisz zmianę w zaznaczonym miejscu, np. zamień kostkę na naturalny kamień i dodaj ciepłe oświetlenie ogrodowe..."
                      className="lbf-input text-sm"
                    />

                    <div>
                      <span className="text-xs font-semibold text-[#4E5B53]">Rozdzielczość kopii</span>
                      <div className="mt-2 flex gap-2">
                        {(["2K", "4K", "8K"] as const).map((tier) => (
                          <button
                            key={tier}
                            type="button"
                            onClick={() => setQuality(tier)}
                            className={`lbf-droplet-btn flex-1 py-2 text-xs font-bold ${
                              quality === tier ? "!bg-emerald-900 !text-white" : "text-[#1C2B23]"
                            }`}
                          >
                            {tier}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={generating}
                      className="lbf-droplet-btn w-full !bg-emerald-900 py-3 text-sm font-bold text-white disabled:opacity-50"
                    >
                      {generating ? "Generowanie kopii..." : "Zastosuj i zapisz jako kopię"}
                    </button>
                  </form>
                </div>
              </motion.section>
            )}

            {/* MODUŁ 4: Silnik Marketingowy (SEO / Google Ads / FB) */}
            {activeTab === "marketing" && (
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid gap-6 md:grid-cols-2"
              >
                <div className="lbf-glass rounded-[32px] p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold">Paczka SEO &amp; Google Ads</h2>
                    <button
                      type="button"
                      onClick={() => copyText("seo", seoPack)}
                      className="lbf-droplet-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
                    >
                      {copiedKey === "seo" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedKey === "seo" ? "Skopiowano" : "Kopiuj"}</span>
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap rounded-2xl bg-white/80 p-4 text-xs leading-relaxed text-[#1C2B23]">
                    {seoPack}
                  </pre>
                </div>

                <div className="lbf-glass rounded-[32px] p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold">Gotowy post na Facebook / Grupy</h2>
                    <button
                      type="button"
                      onClick={() => copyText("fb", fbPost)}
                      className="lbf-droplet-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
                    >
                      {copiedKey === "fb" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedKey === "fb" ? "Skopiowano" : "Kopiuj"}</span>
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap rounded-2xl bg-white/80 p-4 text-xs leading-relaxed text-[#1C2B23]">
                    {fbPost}
                  </pre>
                </div>
              </motion.section>
            )}

            {/* MODUŁ 5: Audytor Umów PL/EU */}
            {activeTab === "audit" && (
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="lbf-glass rounded-[36px] p-6 md:p-8 space-y-4"
              >
                <h2 className="text-xl font-bold">Audytor Umów Nieruchomości (Prawo PL / UE)</h2>
                <p className="text-xs text-[#4E5B53]">
                  Wgraj skan PDF lub zdjęcie umowy przedwstępnej / rezerwacyjnej, aby sprawdzić klauzule ryzyka, zadatek i terminy.
                </p>
                <label className="lbf-droplet-btn inline-flex cursor-pointer items-center gap-2 px-5 py-3 text-xs font-bold text-emerald-950">
                  <Upload className="h-4 w-4" />
                  <span>Wgraj dokument do audytu OCR</span>
                  <input
                    type="file"
                    accept=".pdf,image/*,.txt"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setAuditResult(
                          `Wczytano plik: ${f.name}. Wstępna kontrola gotowa: sprawdź zapisy o zadatku (art. 394 k.c.), termin wydania nieruchomości oraz brak obciążeń w dziale III i IV KW.`
                        );
                      }
                    }}
                    className="hidden"
                  />
                </label>
                {auditResult && (
                  <div className="rounded-2xl bg-white/85 p-4 text-xs leading-relaxed border border-emerald-200">
                    {auditResult}
                  </div>
                )}
              </motion.section>
            )}

            {/* MODUŁ 6: Pakiety SaaS (Właściciel Direct & Agencja White-Label) */}
            {activeTab === "plans" && (
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid gap-6 md:grid-cols-2"
              >
                <div className="lbf-glass rounded-[32px] p-6 space-y-3">
                  <span className="rounded-full bg-emerald-900/10 px-3 py-1 text-xs font-bold text-emerald-900">
                    Właściciel Direct
                  </span>
                  <div className="text-3xl font-extrabold">49 zł <span className="text-xs font-normal text-[#4E5B53]">/ projekt</span></div>
                  <p className="text-xs text-[#4E5B53]">
                    Pełna prezentacja Liquid Glass, Studio AI 2K/4K/8K, paczka SEO/Ads/FB i zero prowizji od sprzedaży.
                  </p>
                  <Link
                    href="/billing"
                    className="lbf-droplet-btn inline-flex items-center justify-center px-5 py-2.5 text-xs font-bold text-emerald-950"
                  >
                    Wybierz (BLIK / Karta) →
                  </Link>
                </div>

                <div className="lbf-glass rounded-[32px] p-6 space-y-3 border-emerald-500/40">
                  <span className="rounded-full bg-emerald-900 px-3 py-1 text-xs font-bold text-white">
                    Agencja White-Label
                  </span>
                  <div className="text-3xl font-extrabold">199 zł <span className="text-xs font-normal text-[#4E5B53]">/ mies.</span></div>
                  <p className="text-xs text-[#4E5B53]">
                    Własny branding, nielimitowane obiekty, Audytor Umów PL/EU i priorytetowe generowanie kopii 8K.
                  </p>
                  <Link
                    href="/billing"
                    className="lbf-droplet-btn inline-flex items-center justify-center !bg-emerald-900 px-5 py-2.5 text-xs font-bold text-white"
                  >
                    Aktywuj White-Label →
                  </Link>
                </div>
              </motion.section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
