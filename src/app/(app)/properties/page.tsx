"use client";

import React, { useEffect, useState } from "react";
import { LbfTopbar } from "@/components/lbf-topbar";

type PropertyItem = {
  id: string;
  title: string;
  city: string;
  address?: string | null;
  price?: number | null;
  area?: number | null;
  rooms?: number | null;
  status?: string | null;
  description?: string | null;
};

type MediaItem = {
  id: string;
  url: string;
  aiDescription?: string | null;
  aiTags?: string[] | null;
  mediaType?: string | null;
};

export default function PropertiesLiquidPage() {
  const [propertiesList, setPropertiesList] = useState<PropertyItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState("");

  // Formularz nowej oferty
  const [title, setTitle] = useState("");
  const [city, setCity] = useState("Wrocław");
  const [address, setAddress] = useState("");
  const [price, setPrice] = useState("");
  const [area, setArea] = useState("");
  const [rooms, setRooms] = useState("3");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  // Studio AI (z natychmiastowym podgladem wygenerowanej kopii)
  const [activePhoto, setActivePhoto] = useState<MediaItem | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [quality, setQuality] = useState<"2K" | "4K" | "8K">("4K");
  const [editing, setEditing] = useState(false);
  const [studioMsg, setStudioMsg] = useState("");

  const loadProperties = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/properties", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const items: PropertyItem[] = Array.isArray(data) ? data : data.properties ?? [];
        setPropertiesList(items);
        if (items.length > 0 && !selectedId) {
          setSelectedId(items[0].id);
        }
      }
    } catch {
      setStatusMsg("Nie udało się pobrać listy nieruchomości.");
    } finally {
      setLoading(false);
    }
  };

  const loadMedia = async (propId: string) => {
    if (!propId) return;
    try {
      const res = await fetch(`/api/properties/${propId}/media`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const items: MediaItem[] = Array.isArray(data) ? data : data.media ?? [];
        setMediaList(items);
      }
    } catch {
      setMediaList([]);
    }
  };

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    if (selectedId) loadMedia(selectedId);
  }, [selectedId]);

  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setStatusMsg("Podaj tytuł nieruchomości.");
      return;
    }
    setCreating(true);
    setStatusMsg("");
    try {
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          city: city.trim() || "Wrocław",
          address: address.trim() || null,
          price: price ? Number(price) : null,
          area: area ? Number(area) : null,
          rooms: rooms ? Number(rooms) : null,
          description: description.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatusMsg(data.error || "Nie udało się utworzyć oferty.");
      } else {
        setTitle("");
        setAddress("");
        setPrice("");
        setArea("");
        setDescription("");
        setStatusMsg("Dodano nową ofertę.");
        await loadProperties();
        if (data.id) setSelectedId(data.id);
      }
    } catch {
      setStatusMsg("Błąd sieci podczas zapisywania oferty.");
    } finally {
      setCreating(false);
    }
  };

  const handleUploadMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedId) return;
    setStatusMsg("Przesyłanie pliku...");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`/api/properties/${selectedId}/media`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatusMsg(data.error || "Nie udało się przesłać zdjęcia.");
      } else {
        setStatusMsg("Dodano zdjęcie do archiwum.");
        await loadMedia(selectedId);
      }
    } catch {
      setStatusMsg("Błąd przesyłania pliku.");
    }
  };

  const handleRunStudio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePhoto || !selectedId || !prompt.trim()) return;
    setEditing(true);
    setStudioMsg("");
    try {
      const res = await fetch("/api/studio/edit-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: selectedId,
          mediaId: activePhoto.id,
          prompt: prompt.trim(),
          quality,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStudioMsg(data.error || "Nie udało się wygenerować kopii.");
      } else {
        if (data.url) setGeneratedUrl(data.url);
        setStudioMsg(data.warning || "Utworzono nową kopię w archiwum.");
        await loadMedia(selectedId);
      }
    } catch {
      setStudioMsg("Błąd połączenia ze Studiem AI.");
    } finally {
      setEditing(false);
    }
  };

  return (
    <div className="min-h-screen pb-16">
      <LbfTopbar />

      <main className="mx-auto mt-6 max-w-6xl space-y-6 px-4">
        <section className="lbf-glass lbf-rise rounded-[32px] p-6 md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9734E]">
                Liquid Biomimetics Force · Nieruchomości
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#1C2B23] md:text-4xl">
                Portfel ofert &amp; Studio AI
              </h1>
              <p className="mt-1.5 text-sm text-[#4E5B53]">
                Płynna siatka dopasowana do aktywnej roli, archiwum mediów i natychmiastowy podgląd kopii.
              </p>
            </div>
            {statusMsg && (
              <span className="rounded-full bg-[#1C2B23] px-4 py-1.5 text-xs font-medium text-[#FAF9F6]">
                {statusMsg}
              </span>
            )}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Lista ofert i archiwum mediow */}
          <section className="space-y-6 lg:col-span-7">
            <div className="lbf-glass lbf-rise rounded-[28px] p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#1C2B23]">Zapisane nieruchomości</h2>
                <span className="text-xs text-[#4E5B53]">
                  {loading ? "Ładowanie..." : `${propertiesList.length} ofert`}
                </span>
              </div>

              {propertiesList.length === 0 && !loading ? (
                <p className="rounded-2xl border border-dashed border-[#1C2B23]/20 p-6 text-sm text-[#4E5B53]">
                  Brak zapisanych ofert. Dodaj pierwszą nieruchomość w panelu obok.
                </p>
              ) : (
                <div className="lbf-fluid-grid">
                  {propertiesList.map((item) => {
                    const isSelected = item.id === selectedId;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelectedId(item.id);
                          setActivePhoto(null);
                          setGeneratedUrl(null);
                        }}
                        className={`text-left rounded-3xl p-4 transition ${
                          isSelected
                            ? "bg-[#1C2B23] text-[#FAF9F6] shadow-lg"
                            : "bg-white/75 text-[#1C2B23] hover:bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-base font-semibold">{item.title}</span>
                          {item.price ? (
                            <span
                              className={`text-xs font-semibold ${
                                isSelected ? "text-[#F3C6B1]" : "text-[#C9734E]"
                              }`}
                            >
                              {item.price.toLocaleString("pl-PL")} zł
                            </span>
                          ) : null}
                        </div>
                        <p
                          className={`mt-1 text-xs ${
                            isSelected ? "text-[#FAF9F6]/75" : "text-[#4E5B53]"
                          }`}
                        >
                          {item.city}
                          {item.address ? ` · ${item.address}` : ""}
                        </p>
                        <div
                          className={`mt-3 flex gap-3 text-xs ${
                            isSelected ? "text-[#FAF9F6]/80" : "text-[#4E5B53]"
                          }`}
                        >
                          {item.area ? <span>{item.area} m²</span> : null}
                          {item.rooms ? <span>{item.rooms} pok.</span> : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedId && (
              <div className="lbf-glass lbf-rise rounded-[28px] p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-[#1C2B23]">Archiwum zdjęć wybranej oferty</h2>
                  <label className="lbf-pill cursor-pointer bg-[#1C2B23] px-4 py-2 text-xs font-medium text-[#FAF9F6]">
                    + Dodaj zdjęcie
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadMedia}
                      className="hidden"
                    />
                  </label>
                </div>

                {mediaList.length === 0 ? (
                  <p className="text-sm text-[#4E5B53]">
                    Brak zdjęć dla tej oferty. Kliknij „+ Dodaj zdjęcie”, aby wgrać fotografię.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {mediaList.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setActivePhoto(m);
                          setGeneratedUrl(null);
                          setStudioMsg("");
                        }}
                        className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/80 bg-white/60 text-left shadow-sm"
                      >
                        <img
                          src={m.url}
                          alt={m.aiDescription || "Zdjęcie nieruchomości"}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                        <span className="absolute inset-x-2 bottom-2 rounded-full bg-[#1C2B23]/80 px-2.5 py-1 text-[11px] font-medium text-[#FAF9F6]">
                          Otwórz w Studiu AI
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Formularz nowej oferty albo aktywne Studio AI */}
          <aside className="space-y-6 lg:col-span-5">
            {activePhoto ? (
              <div className="lbf-glass lbf-rise rounded-[28px] p-6">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-[#1C2B23]">Studio Aranżacji AI</h2>
                  <button
                    type="button"
                    onClick={() => {
                      setActivePhoto(null);
                      setGeneratedUrl(null);
                    }}
                    className="lbf-pill bg-[#1C2B23]/10 px-3 py-1 text-xs font-medium text-[#1C2B23]"
                  >
                    Zamknij
                  </button>
                </div>

                <div className="overflow-hidden rounded-2xl border border-white/80 bg-white/70">
                  <img
                    src={generatedUrl || activePhoto.url}
                    alt={generatedUrl ? "Wygenerowana kopia" : "Oryginał"}
                    className="aspect-[4/3] w-full object-cover"
                  />
                </div>

                {generatedUrl && (
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="font-medium text-[#C9734E]">Podgląd nowej kopii</span>
                    <button
                      type="button"
                      onClick={() => setGeneratedUrl(null)}
                      className="underline text-[#4E5B53]"
                    >
                      Pokaż oryginał
                    </button>
                  </div>
                )}

                <form onSubmit={handleRunStudio} className="mt-4 space-y-3">
                  <textarea
                    rows={3}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Opisz zmianę, np. ciepłe światło wieczorne, naturalny dąb, zieleń w oknie..."
                    className="lbf-input text-sm"
                  />

                  <div className="flex gap-2">
                    {(["2K", "4K", "8K"] as const).map((tier) => (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => setQuality(tier)}
                        className={`lbf-pill flex-1 py-1.5 text-xs font-semibold ${
                          quality === tier
                            ? "bg-[#C9734E] text-[#FAF9F6]"
                            : "bg-white/80 text-[#1C2B23]"
                        }`}
                      >
                        {tier}
                      </button>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={editing}
                    className="lbf-pill w-full bg-[#1C2B23] py-2.5 text-sm font-medium text-[#FAF9F6] disabled:opacity-50"
                  >
                    {editing ? "Generowanie kopii..." : "Zastosuj i zapisz kopię"}
                  </button>

                  {studioMsg && <p className="text-xs text-[#4E5B53]">{studioMsg}</p>}
                </form>
              </div>
            ) : (
              <div className="lbf-glass lbf-rise rounded-[28px] p-6">
                <h2 className="text-lg font-semibold text-[#1C2B23]">Nowa nieruchomość</h2>
                <p className="mt-1 text-xs text-[#4E5B53]">
                  Utwórz kartę obiektu i dodaj zdjęcia do archiwum.
                </p>

                <form onSubmit={handleCreateProperty} className="mt-4 space-y-3">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Tytuł, np. Willa nad wodą"
                    className="lbf-input text-sm"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Miasto"
                      className="lbf-input text-sm"
                    />
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Ulica i numer"
                      className="lbf-input text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="Cena PLN"
                      className="lbf-input text-sm"
                    />
                    <input
                      type="number"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      placeholder="Metraż m²"
                      className="lbf-input text-sm"
                    />
                    <input
                      type="number"
                      value={rooms}
                      onChange={(e) => setRooms(e.target.value)}
                      placeholder="Pokoje"
                      className="lbf-input text-sm"
                    />
                  </div>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Krótki opis bryły, działki, układu pomieszczeń..."
                    className="lbf-input text-sm"
                  />
                  <button
                    type="submit"
                    disabled={creating}
                    className="lbf-pill w-full bg-[#1C2B23] py-2.5 text-sm font-medium text-[#FAF9F6] disabled:opacity-50"
                  >
                    {creating ? "Zapisywanie..." : "Zapisz nieruchomość"}
                  </button>
                </form>
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
