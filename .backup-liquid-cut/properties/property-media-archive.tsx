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
  const [generatedCopyUrl, setGeneratedCopyUrl] = useState<string | null>(null);
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
                    <img src={item.url} alt={item.aiDescription ?? "Zdjęcie"} className="h-full w-full object-cover" />
                  </button>
                </div>
  return null;
