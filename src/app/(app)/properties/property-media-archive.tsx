"use client";

import React, { useState } from "react";

export type ArchiveMediaItem = {
  id: string;
  url: string;
  aiDescription?: string | null;
  aiTags?: string[] | null;
  mediaType?: string | null;
  category?: string | null;
  resolutionTier?: string | null;
  [key: string]: unknown;
};

type PropertyMediaArchiveProps = {
  propertyId: string;
  propertyTitle?: string;
  media?: ArchiveMediaItem[];
  heroMediaIds?: string[];
  onMediaUpdated?: () => void | Promise<void>;
};

export function PropertyMediaArchive({
  propertyId,
  propertyTitle,
  media = [],
  heroMediaIds = [],
  onMediaUpdated,
}: PropertyMediaArchiveProps) {
  const [selectedItem, setSelectedItem] = useState<ArchiveMediaItem | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [quality, setQuality] = useState<"2K" | "4K" | "8K">("4K");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !propertyId) return;
    setUploading(true);
    setMessage("Przesyłanie pliku do archiwum...");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/properties/${propertyId}/media`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error || "Nie udało się przesłać pliku.");
      } else {
        setMessage("Dodano nowy materiał do archiwum.");
        if (onMediaUpdated) await onMediaUpdated();
      }
    } catch {
      setMessage("Błąd połączenia podczas przesyłania.");
    } finally {
      setUploading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !propertyId || !prompt.trim()) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/studio/edit-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          mediaId: selectedItem.id,
          prompt: prompt.trim(),
          quality,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error || "Nie udało się wygenerować kopii.");
      } else {
        if (data.url) setGeneratedUrl(data.url);
        setMessage(data.warning || "Utworzono nową kopię w archiwum.");
        if (onMediaUpdated) await onMediaUpdated();
      }
    } catch {
      setMessage("Błąd komunikacji ze Studiem AI.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="lbf-glass lbf-rise space-y-5 rounded-[28px] p-6" aria-label="Archiwum zdjęć i wideo">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[#1C2B23]">
            Archiwum mediów &amp; Studio AI{propertyTitle ? ` · ${propertyTitle}` : ""}
          </h3>
          <p className="text-xs text-[#4E5B53]">
            Wybierz zdjęcie, aby otworzyć podgląd i wygenerować nową kopię bez naruszania oryginału.
          </p>
        </div>

        <label className="lbf-pill cursor-pointer bg-[#1C2B23] px-4 py-2 text-xs font-medium text-[#FAF9F6]">
          {uploading ? "Przesyłanie..." : "+ Dodaj plik"}
          <input
            type="file"
            accept="image/*,video/*"
            onChange={handleUpload}
            className="hidden"
          />
        </label>
      </div>

      {message && (
        <p className="rounded-2xl bg-white/80 px-4 py-2 text-xs font-medium text-[#1C2B23]">
          {message}
        </p>
      )}

      {media.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#1C2B23]/20 p-6 text-center text-xs text-[#4E5B53]">
          Brak plików w archiwum tej nieruchomości. Dodaj pierwsze zdjęcie lub wideo.
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {media.map((item) => {
            const active = selectedItem?.id === item.id;
            const isHero = heroMediaIds.includes(item.id);
            return (
              <div
                key={item.id}
                className={`group relative h-36 w-52 shrink-0 overflow-hidden rounded-2xl border ${
                  active
                    ? "border-[#C9734E] ring-2 ring-[#C9734E]/30"
                    : isHero
                    ? "border-[#1C2B23]"
                    : "border-white/80"
                } bg-white/70`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedItem(item);
                    setGeneratedUrl(null);
                    setMessage("");
                  }}
                  className="h-full w-full text-left"
                >
                  {item.mediaType === "video" ? (
                    <video
                      src={item.url}
                      preload="metadata"
                      muted
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <img
                      src={item.url}
                      alt={item.aiDescription ?? "Zdjęcie nieruchomości"}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  )}
                  <span className="absolute inset-x-2 bottom-2 truncate rounded-full bg-[#1C2B23]/80 px-2.5 py-1 text-[11px] text-[#FAF9F6]">
                    {item.aiDescription || item.category || "Materiał"}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {selectedItem && (
        <div className="rounded-3xl border border-white/85 bg-white/75 p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-[#1C2B23]">Podgląd i modyfikacja w Studiu</h4>
            <button
              type="button"
              onClick={() => {
                setSelectedItem(null);
                setGeneratedUrl(null);
              }}
              className="lbf-pill bg-[#1C2B23]/10 px-3 py-1 text-xs font-medium text-[#1C2B23]"
            >
              Zamknij
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="overflow-hidden rounded-2xl border border-[#1C2B23]/10 bg-white">
                <img
                  src={generatedUrl || selectedItem.url}
                  alt={generatedUrl ? "Wygenerowana kopia" : "Oryginał"}
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>
              {generatedUrl && (
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#C9734E]">Wyświetlana: nowa kopia</span>
                  <button
                    type="button"
                    onClick={() => setGeneratedUrl(null)}
                    className="underline text-[#4E5B53]"
                  >
                    Pokaż oryginał
                  </button>
                </div>
              )}
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3">
              <textarea
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Opisz zmianę aranżacji, oświetlenia lub detalu..."
                className="lbf-input text-xs"
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
                        : "bg-white text-[#1C2B23]"
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="lbf-pill w-full bg-[#1C2B23] py-2.5 text-xs font-semibold text-[#FAF9F6] disabled:opacity-50"
              >
                {saving ? "Generowanie..." : "Zastosuj i zapisz kopię"}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
