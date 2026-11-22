"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderOpen, Image as ImageIcon, LoaderCircle, Search, Star, Upload, Video, WandSparkles, X } from "lucide-react";
import type { MediaCategory } from "@/db/schema";
import type { PropertyMediaItem } from "./property-manager";

const categoryTabs: Array<{ id: "all" | MediaCategory; label: string }> = [
  { id: "all", label: "Wszystkie" },
  { id: "wnetrza", label: "Wnętrza" },
  { id: "ogrod", label: "Ogród" },
  { id: "elewacja", label: "Elewacja" },
  { id: "otoczenie", label: "Otoczenie" },
  { id: "widoki", label: "Widoki" },
  { id: "detale", label: "Detale" },
  { id: "inne", label: "Inne" },
];

type Props = {
  propertyId: string;
  propertyTitle: string;
  media: PropertyMediaItem[];
  heroMediaIds: string[];
};

export function PropertyMediaArchive({ propertyId, propertyTitle, media: initialMedia, heroMediaIds: initialHeroIds }: Props) {
  const router = useRouter();
  const filesInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const [media, setMedia] = useState(initialMedia);
  const [heroIds, setHeroIds] = useState(initialHeroIds);
  const [album, setAlbum] = useState<"photo" | "video" | null>(null);
  const [category, setCategory] = useState<"all" | MediaCategory>("all");
  const [query, setQuery] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editingMedia, setEditingMedia] = useState<PropertyMediaItem | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [quality, setQuality] = useState<"2K" | "4K" | "8K">("2K");
  const [editing, setEditing] = useState(false);
  const [editMessage, setEditMessage] = useState("");
  const [brushCanvas, setBrushCanvas] = useState<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    setMedia(initialMedia);
    setHeroIds(initialHeroIds);
  }, [initialMedia, initialHeroIds]);

  useEffect(() => {
    folderInput.current?.setAttribute("webkitdirectory", "");
    folderInput.current?.setAttribute("directory", "");
  }, []);

  useEffect(() => {
    if (!editingMedia || !brushCanvas) return;
    brushCanvas.width = 1200;
    brushCanvas.height = 800;
    const context = brushCanvas.getContext("2d");
    context?.clearRect(0, 0, brushCanvas.width, brushCanvas.height);
  }, [editingMedia, brushCanvas]);

  const photos = useMemo(() => media.filter((item) => item.mediaType === "photo"), [media]);
  const videos = useMemo(() => media.filter((item) => item.mediaType === "video"), [media]);
  const heroPhotos = useMemo(() => {
    const chosen = heroIds.map((id) => photos.find((item) => item.id === id)).filter((item): item is PropertyMediaItem => Boolean(item));
    return chosen.length ? chosen : photos.slice(0, 8);
  }, [heroIds, photos]);
  const visibleMedia = useMemo(() => media.filter((item) => {
    if (item.mediaType !== album) return false;
    if (category !== "all" && item.category !== category) return false;
    const text = `${item.category} ${item.aiTags.join(" ")} ${item.aiDescription ?? ""}`.toLocaleLowerCase("pl");
    return text.includes(query.trim().toLocaleLowerCase("pl"));
  }), [album, category, media, query]);

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    let uploaded = 0;
    const errors: string[] = [];
    for (const file of Array.from(files)) {
      const body = new FormData();
      body.set("file", file);
      try {
        const response = await fetch(`/api/properties/${propertyId}/media`, { method: "POST", body });
        const result = await response.json() as { error?: string };
        if (!response.ok) errors.push(`${file.name}: ${result.error ?? "błąd wysyłania"}`);
        else uploaded++;
        setUploadMessage(`Przesłano ${uploaded}/${files.length}${errors.length ? ` · błędy: ${errors.length}` : ""}`);
      } catch {
        errors.push(`${file.name}: brak połączenia`);
      }
    }
    setUploading(false);
    setUploadMessage(errors.length ? `${uploaded} plików dodano. ${errors.slice(0, 3).join("; ")}` : `Dodano ${uploaded} plików do archiwum.`);
    if (filesInput.current) filesInput.current.value = "";
    if (folderInput.current) folderInput.current.value = "";
    router.refresh();
  }

  async function toggleHero(mediaId: string) {
    const next = heroIds.includes(mediaId) ? heroIds.filter((id) => id !== mediaId) : [...heroIds, mediaId];
    if (next.length > 30) {
      setUploadMessage("Wizytówka może zawierać maksymalnie 30 zdjęć.");
      return;
    }
    const previous = heroIds;
    setHeroIds(next);
    try {
      const response = await fetch(`/api/properties/${propertyId}/media`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heroMediaIds: next }),
      });
      if (!response.ok) {
        const result = await response.json() as { error?: string };
        throw new Error(result.error ?? "Nie udało się zapisać wizytówki.");
      }
    } catch (reason) {
      setHeroIds(previous);
      setUploadMessage(reason instanceof Error ? reason.message : "Nie udało się zapisać wizytówki.");
    }
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const context = canvas.getContext("2d");
    if (!context) return;
    context.strokeStyle = "rgba(255,255,255,.82)";
    context.lineWidth = 40 * (canvas.width / rect.width);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineTo((event.clientX - rect.left) * (canvas.width / rect.width), (event.clientY - rect.top) * (canvas.height / rect.height));
    context.stroke();
  }

  async function editImage() {
    if (!editingMedia || !editPrompt.trim()) return;
    setEditing(true);
    setEditMessage("Przetwarzanie…");
    try {
      let mask: string | undefined;
      if (brushCanvas) {
        const exportCanvas = document.createElement("canvas");
        exportCanvas.width = brushCanvas.width;
        exportCanvas.height = brushCanvas.height;
        const context = exportCanvas.getContext("2d");
        if (context) {
          context.fillStyle = "#000";
          context.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
          context.drawImage(brushCanvas, 0, 0);
          mask = exportCanvas.toDataURL("image/jpeg", 0.6);
        }
      }
      const response = await fetch("/api/studio/edit-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, mediaId: editingMedia.id, prompt: editPrompt, quality, mask }),
        signal: AbortSignal.timeout(45_000),
      });
      const result = await response.json() as { id?: string; url?: string; warning?: string; error?: string };
      if (!response.ok || !result.id || !result.url) throw new Error(result.error ?? "Nie udało się utworzyć kopii zdjęcia.");
      setMedia((current) => [...current, {
        ...editingMedia,
        id: result.id!,
        url: result.url!,
        isOriginal: false,
        parentMediaId: editingMedia.id,
        resolutionTier: quality,
        aiTags: [...editingMedia.aiTags, "aranżacja AI"],
      }]);
      setEditMessage(result.warning ?? "Utworzono kopię zdjęcia. Oryginał pozostał bez zmian.");
      router.refresh();
    } catch (reason) {
      setEditMessage(reason instanceof Error ? reason.message : "Nie udało się zapisać kopii zdjęcia.");
    } finally {
      setEditing(false);
    }
  }

  return (
    <section className="space-y-5" aria-label="Archiwum zdjęć i wideo">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="eyebrow">ARCHIWUM MEDIÓW</span>
          <h3 className="mt-1 text-lg font-medium text-[#1F2A24]">Zdjęcia i wideo</h3>
          <p className="mt-1 text-xs text-[#5C625B]">Importuj wiele plików z komputera lub urządzenia mobilnego.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={filesInput} type="file" multiple accept="image/*,video/mp4,video/webm,video/quicktime"
            className="sr-only" aria-label="Wybierz wiele zdjęć i filmów" onChange={(event) => void uploadFiles(event.currentTarget.files)} />
          <input ref={folderInput} type="file" multiple accept="image/*,video/mp4,video/webm,video/quicktime"
            className="sr-only" aria-label="Wybierz folder zdjęć i filmów" onChange={(event) => void uploadFiles(event.currentTarget.files)} />
          <button type="button" onClick={() => filesInput.current?.click()} disabled={uploading}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#DDD8CD] bg-[#FAF9F6] border border-[#DDD8CD] shadow-[0_8px_30px_rgba(28,43,35,0.04)] px-3 text-xs text-[#5C625B] hover:bg-[#FAF9F6] border border-[#DDD8CD] shadow-[0_8px_30px_rgba(28,43,35,0.04)] disabled:opacity-50">
            <Upload className="h-4 w-4" /> Pliki
          </button>
          <button type="button" onClick={() => folderInput.current?.click()} disabled={uploading}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#DDD8CD] bg-[#FAF9F6] border border-[#DDD8CD] shadow-[0_8px_30px_rgba(28,43,35,0.04)] px-3 text-xs text-[#5C625B] hover:bg-[#FAF9F6] border border-[#DDD8CD] shadow-[0_8px_30px_rgba(28,43,35,0.04)] disabled:opacity-50">
            <FolderOpen className="h-4 w-4" /> Folder
          </button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <AlbumTile type="photo" count={photos.length} media={photos} active={album === "photo"} onClick={() => { setAlbum(album === "photo" ? null : "photo"); setCategory("all"); }} />
        <AlbumTile type="video" count={videos.length} media={videos} active={album === "video"} onClick={() => { setAlbum(album === "video" ? null : "video"); setCategory("all"); }} />
      </div>
      {uploadMessage && <p role="status" className="text-xs text-[#5C625B]">{uploading && <LoaderCircle className="mr-1 inline h-3 w-3 animate-spin" />}{uploadMessage}</p>}

      {heroPhotos.length > 0 && (
        <div className="rounded-2xl border border-[#DDD8CD] bg-[#05070B]/70 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <span className="eyebrow">HERO CAROUSEL</span>
              <h4 className="mt-1 text-sm font-medium text-[#1F2A24]">Wizytówka zdjęciowa</h4>
            </div>
            <span className="font-mono text-[10px] text-slate-500">{heroIds.length ? `${heroIds.length} WYBRANYCH` : "AUTO"}</span>
          </div>
          <div className="flex snap-x scroll-smooth gap-3 overflow-x-auto pb-2">
            {heroPhotos.map((item) => (
              <div key={item.id} className="group relative h-36 w-56 shrink-0 snap-start overflow-hidden rounded-xl border border-[#DDD8CD]">
                <button type="button" className="h-full w-full" onClick={() => { setEditingMedia(item); setEditMessage(""); }}>
                  <img src={item.url} alt={`${propertyTitle} — wizytówka`} className="h-full w-full object-cover transition group-hover:scale-105" />
                </button>
                <button type="button" onClick={() => void toggleHero(item.id)} aria-label="Usuń zdjęcie z wizytówki"
                  className="absolute right-2 top-2 rounded-full border border-[#DDD8CD] bg-[#05070B]/80 p-1.5 text-amber-200">
                  <Star className="h-3.5 w-3.5 fill-current" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {album && (
        <div className="space-y-4 rounded-2xl border border-[#DDD8CD] bg-[#05070B]/70 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-[#1F2A24]">
              {album === "photo" ? <ImageIcon className="h-4 w-4 text-cyan-200" /> : <Video className="h-4 w-4 text-fuchsia-200" />}
              {album === "photo" ? "Archiwum zdjęć" : "Archiwum wideo"}
            </div>
            <label className="relative min-w-56 flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Jodła, taras, kominek…"
                aria-label="Szukaj po pomieszczeniu, tagach i opisie"
                className="h-10 w-full rounded-xl border border-[#DDD8CD] bg-[#FAF9F6] border border-[#DDD8CD] shadow-[0_8px_30px_rgba(28,43,35,0.04)] pl-9 pr-3 text-sm text-[#5C625B] outline-none placeholder:text-slate-600 focus:border-cyan-200/30" />
            </label>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categoryTabs.map((tab) => (
              <button key={tab.id} type="button" onClick={() => setCategory(tab.id)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs transition ${category === tab.id ? "border-cyan-200/30 bg-cyan-200/10 text-cyan-100" : "border-[#DDD8CD] text-[#5C625B] hover:bg-[#FAF9F6] border border-[#DDD8CD] shadow-[0_8px_30px_rgba(28,43,35,0.04)]"}`}>
                {tab.label}
              </button>
            ))}
          </div>
          {visibleMedia.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {visibleMedia.map((item) => (
                <MediaTile key={item.id} item={item} isHero={heroIds.includes(item.id)}
                  onOpen={() => { if (item.mediaType === "photo") { setEditingMedia(item); setEditMessage(""); } }}
                  onHero={() => void toggleHero(item.id)} />
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-[#DDD8CD] py-10 text-center text-sm text-slate-500">
              {query ? `Brak wyników dla „${query}”.` : "Brak materiałów w tej kategorii."}
            </p>
          )}
        </div>
      )}

      {editingMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-md sm:p-6" role="dialog" aria-modal="true" aria-label="Studio Aranżacji i Modyfikacji Zdjęć">
          <div className="flex max-h-[95vh] w-full max-w-6xl flex-col overflow-y-auto rounded-2xl border border-[#DDD8CD] bg-[#05070B] shadow-2xl">
            <header className="flex items-center justify-between border-b border-[#DDD8CD] px-4 py-3 sm:px-6">
              <div><span className="eyebrow">STUDIO ARANŻACJI I MODYFIKACJI ZDJĘĆ</span><p className="mt-1 text-xs text-[#5C625B]">Pędzlem zaznacz obszar do modyfikacji.</p></div>
              <button type="button" onClick={() => setEditingMedia(null)} aria-label="Zamknij Studio" className="rounded-lg p-2 text-[#5C625B] hover:bg-[#FAF9F6] border border-[#DDD8CD] shadow-[0_8px_30px_rgba(28,43,35,0.04)]"><X className="h-5 w-5" /></button>
            </header>
            <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,.7fr)]">
              <div className="relative aspect-[3/2] overflow-hidden rounded-xl border border-[#DDD8CD] bg-black">
                <img src={editingMedia.url} alt={propertyTitle} className="absolute inset-0 h-full w-full object-contain" />
                <canvas ref={setBrushCanvas} className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
                  onPointerDown={(event) => {
                    drawingRef.current = true;
                    event.currentTarget.setPointerCapture(event.pointerId);
                    const rect = event.currentTarget.getBoundingClientRect();
                    const context = event.currentTarget.getContext("2d");
                    if (!context) return;
                    context.beginPath();
                    context.moveTo((event.clientX - rect.left) * (event.currentTarget.width / rect.width), (event.clientY - rect.top) * (event.currentTarget.height / rect.height));
                    draw(event);
                  }}
                  onPointerMove={draw}
                  onPointerUp={() => { drawingRef.current = false; }}
                  onPointerCancel={() => { drawingRef.current = false; }} />
              </div>
              <div className="space-y-4">
                <label className="block text-sm text-[#5C625B]">Prompt aranżacji
                  <textarea value={editPrompt} onChange={(event) => setEditPrompt(event.target.value)} rows={6} maxLength={1500}
                    placeholder="np. Dodaj jasne meble skandynawskie, zachowując układ pomieszczenia…"
                    className="mt-2 w-full resize-y rounded-xl border border-[#DDD8CD] bg-[#FAF9F6] border border-[#DDD8CD] shadow-[0_8px_30px_rgba(28,43,35,0.04)] p-3 text-sm leading-6 text-[#1F2A24] outline-none focus:border-cyan-200/30" />
                </label>
                <fieldset>
                  <legend className="mb-2 text-sm text-[#5C625B]">Jakość wyjściowa</legend>
                  <div className="grid grid-cols-3 gap-2">
                    {(["2K", "4K", "8K"] as const).map((tier) => (
                      <button key={tier} type="button" aria-pressed={quality === tier} onClick={() => setQuality(tier)}
                        className={`rounded-xl border py-2 text-sm ${quality === tier ? "border-indigo-200/40 bg-indigo-200/10 text-indigo-100" : "border-[#DDD8CD] text-[#5C625B]"}`}>{tier}</button>
                    ))}
                  </div>
                </fieldset>
                <button type="button" onClick={() => void editImage()} disabled={editing || !editPrompt.trim()}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-200 px-4 text-sm font-semibold text-slate-950 hover:bg-indigo-100 disabled:opacity-50">
                  {editing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
                  {editing ? "Tworzę kopię…" : "Zastosuj i zapisz kopię"}
                </button>
                {editMessage && <p role="status" className="text-xs leading-relaxed text-[#5C625B]">{editMessage}</p>}
                <p className="text-[11px] leading-relaxed text-slate-500">Oryginalne zdjęcie pozostaje nietknięte. Wynik zawsze trafia do archiwum jako nowa kopia.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function AlbumTile({ type, count, media, active, onClick }: {
  type: "photo" | "video";
  count: number;
  media: PropertyMediaItem[];
  active: boolean;
  onClick: () => void;
}) {
  const Icon = type === "photo" ? ImageIcon : Video;
  return (
    <button type="button" onClick={onClick} aria-expanded={active}
      className={`flex min-h-28 items-center gap-4 rounded-2xl border p-3 text-left transition ${active ? "border-cyan-200/30 bg-cyan-200/[0.07]" : "border-[#DDD8CD] bg-[#05070B]/70 hover:border-[#DDD8CD]"}`}>
      <div className="flex -space-x-4">
        {media.slice(0, 3).map((item) => item.mediaType === "photo" ? (
          <img key={item.id} src={item.url} alt="" className="h-16 w-16 rounded-xl border-2 border-[#05070B] object-cover" />
        ) : (
          <span key={item.id} className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border-2 border-[#05070B] bg-[#FAF9F6] border border-[#DDD8CD]">
            <video src={item.url} preload="metadata" muted className="absolute inset-0 h-full w-full object-cover" />
            <Video className="relative z-10 h-6 w-6 text-[#1F2A24] drop-shadow" />
          </span>
        ))}
        {media.length === 0 && <span className="flex h-16 w-16 items-center justify-center rounded-xl border border-[#DDD8CD] bg-[#FAF9F6] border border-[#DDD8CD] shadow-[0_8px_30px_rgba(28,43,35,0.04)]"><Icon className="h-6 w-6 text-slate-500" /></span>}
      </div>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-[#1F2A24]">{type === "photo" ? "Zdjęcia" : "Wideo"}</span>
        <span className="mt-1 block font-mono text-xs text-[#5C625B]">{count} {count === 1 ? "plik" : "plików"}</span>
        <span className="mt-2 block text-[10px] text-cyan-200">{active ? "Otwarty album" : "Otwórz archiwum"}</span>
      </span>
    </button>
  );
}

function MediaTile({ item, isHero, onOpen, onHero }: {
  item: PropertyMediaItem;
  isHero: boolean;
  onOpen: () => void;
  onHero: () => void;
}) {
  return (
    <article className="group overflow-hidden rounded-xl border border-[#DDD8CD] bg-[#FAF9F6] border border-[#DDD8CD] shadow-[0_8px_30px_rgba(28,43,35,0.04)]">
      <div className="relative aspect-[4/3] bg-black">
        {item.mediaType === "photo" ? (
          <button type="button" onClick={onOpen} className="h-full w-full"><img src={item.url} alt={item.aiDescription ?? "Zdjęcie nieruchomości"} className="h-full w-full object-cover transition group-hover:scale-[1.03]" /></button>
        ) : (
          <video src={item.url} controls preload="metadata" className="h-full w-full object-cover" />
        )}
        {item.mediaType === "photo" && (
          <button type="button" onClick={onHero} aria-label={isHero ? "Usuń z wizytówki" : "Dodaj do wizytówki"}
            className={`absolute right-2 top-2 rounded-full border p-2 backdrop-blur ${isHero ? "border-amber-200/40 bg-[#05070B]/80 text-amber-200" : "border-[#DDD8CD] bg-[#05070B]/65 text-[#1F2A24]/70 hover:text-amber-200"}`}>
            <Star className={`h-3.5 w-3.5 ${isHero ? "fill-current" : ""}`} />
          </button>
        )}
        {!item.isOriginal && <span className="absolute bottom-2 left-2 rounded-md border border-indigo-200/20 bg-[#05070B]/80 px-2 py-1 text-[9px] text-indigo-100">KOPIA · {item.resolutionTier}</span>}
      </div>
      <div className="p-3">
        <p className="text-[10px] uppercase tracking-wide text-cyan-200">{categoryTabs.find((tab) => tab.id === item.category)?.label ?? item.category}</p>
        <p className="mt-1 line-clamp-2 min-h-8 text-xs leading-relaxed text-[#5C625B]">{item.aiDescription || item.aiTags.join(" · ") || "Oczekuje na analizę"}</p>
        {!!item.aiTags.length && <p className="mt-2 line-clamp-1 text-[10px] text-slate-500">{item.aiTags.join(" · ")}</p>}
      </div>
    </article>
  );
}
