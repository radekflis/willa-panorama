"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  Building2,
  ImagePlus,
  LoaderCircle,
  MapPin,
  Ruler,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PropertyAnalysisPanel } from "./property-analysis-panel";
import { PropertyMediaArchive } from "./property-media-archive";
import type { MediaCategory, PropertyParameter } from "@/db/schema";
import {
  createPropertyAction,
  deletePropertyAction,
  togglePropertyStatusAction,
  type PropertyActionState,
} from "./actions";

export type PropertyListItem = {
  id: string;
  title: string;
  city: string;
  address: string;
  pricePln: number;
  areaSqm: string;
  rooms: number;
  status: "draft" | "published" | "sold" | "archived";
  description: string | null;
  richHighlights: string | null;
  locationPotential: string | null;
  parametersJson: PropertyParameter[];
  heroMediaIds: string[];
  media: PropertyMediaItem[];
  coverUrl: string | null;
};

export type PropertyMediaItem = {
  id: string;
  url: string;
  mediaType: "photo" | "video";
  category: MediaCategory;
  aiTags: string[];
  aiDescription: string | null;
  isOriginal: boolean;
  parentMediaId: string | null;
  resolutionTier: "2K" | "4K" | "8K";
};

const initialActionState: PropertyActionState = {};
const inputClassName = "spatial-input mt-1.5 w-full";

export function PropertyManager({
  properties,
}: {
  properties: PropertyListItem[];
}) {
  const [state, formAction, pending] = useActionState(
    createPropertyAction,
    initialActionState,
  );

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="order-2 space-y-4 lg:order-1" aria-label="Twoje oferty">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Twoje nieruchomości</h2>
            <p className="mt-1 text-sm text-slate-400">
              {properties.length}{" "}
              {properties.length === 1
                ? "oferta"
                : properties.length > 1 && properties.length < 5
                  ? "oferty"
                  : "ofert"}
            </p>
          </div>
          <Building2 className="h-5 w-5 text-indigo-200" aria-hidden="true" />
        </div>

        {properties.length === 0 ? (
          <div className="card-lab flex min-h-64 flex-col items-center justify-center px-6 py-10 text-center">
            <Building2 className="h-9 w-9 text-slate-500" aria-hidden="true" />
            <h3 className="mt-4 font-semibold">Nie masz jeszcze ofert</h3>
            <p className="mt-2 max-w-sm text-sm text-slate-400">
              Dodaj pierwszą nieruchomość, aby zacząć zarządzać jej publikacją i
              zdjęciami.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {properties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </section>

      <aside className="card-lab order-1 p-5 sm:p-6 lg:sticky lg:top-6 lg:order-2">
        <div className="mb-5">
          <span className="eyebrow">
            Nowa oferta
          </span>
          <h2 className="mt-1 text-xl font-semibold">Dodaj nieruchomość</h2>
          <p className="mt-1 text-sm text-slate-400">
            Utwórz szkic, który możesz opublikować w dowolnym momencie.
          </p>
        </div>

        <form action={formAction} className="space-y-4">
          <label className="block text-sm font-medium">
            Tytuł
            <input
              className={inputClassName}
              name="title"
              placeholder="np. Jasne mieszkanie blisko parku"
              required
              maxLength={160}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium">
              Miasto
              <input
                className={inputClassName}
                name="city"
                placeholder="Warszawa"
                required
                maxLength={100}
              />
            </label>
            <label className="block text-sm font-medium">
              Adres
              <input
                className={inputClassName}
                name="address"
                placeholder="ulica i numer"
                required
                maxLength={200}
              />
            </label>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <label className="block text-sm font-medium">
              Cena (PLN)
              <input
                className={inputClassName}
                name="pricePln"
                type="number"
                min="1"
                step="1"
                required
              />
            </label>
            <label className="block text-sm font-medium">
              Metraż (m²)
              <input
                className={inputClassName}
                name="areaSqm"
                type="number"
                min="0.01"
                step="0.01"
                required
              />
            </label>
            <label className="block text-sm font-medium">
              Pokoje
              <input
                className={inputClassName}
                name="rooms"
                type="number"
                min="1"
                step="1"
                defaultValue="1"
                required
              />
            </label>
          </div>

          <label className="block text-sm font-medium">
            Opis
            <textarea
              className={`${inputClassName} min-h-24 resize-y`}
              name="description"
              placeholder="Opisz najważniejsze atuty nieruchomości…"
              maxLength={5000}
            />
          </label>

          {state.error && <ActionMessage message={state.error} error />}
          {state.success && <ActionMessage message={state.success} />}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? (
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Building2 className="h-4 w-4" aria-hidden="true" />
            )}
            {pending ? "Zapisywanie…" : "Dodaj nieruchomość"}
          </Button>
        </form>
      </aside>
    </div>
  );
}

function PropertyCard({ property }: { property: PropertyListItem }) {
  const [statusState, statusAction, statusPending] = useActionState(
    togglePropertyStatusAction,
    initialActionState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deletePropertyAction,
    initialActionState,
  );
  const statusLabel = {
    draft: "Szkic",
    published: "Opublikowana",
    sold: "Sprzedana",
    archived: "Zarchiwizowana",
  }[property.status];
  const price = new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(property.pricePln);

  return (
    <article className="card-lab overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        <div className="relative h-52 shrink-0 bg-[#FAF9F6] border border-[#DDD8CD] sm:h-auto sm:min-h-52 sm:w-56">
          {property.coverUrl ? (
            <Image
              src={property.coverUrl}
              alt={`Zdjęcie nieruchomości: ${property.title}`}
              fill
              sizes="(max-width: 640px) 100vw, 224px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full min-h-52 flex-col items-center justify-center gap-2 text-slate-500">
              <ImagePlus className="h-8 w-8" aria-hidden="true" />
              <span className="text-xs">Brak zdjęcia</span>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                  property.status === "published"
                    ? "border border-emerald-300/20 bg-emerald-300/10 text-emerald-200"
                    : "border border-[#DDD8CD] bg-[#FAF9F6] border border-[#DDD8CD] shadow-[0_8px_30px_rgba(28,43,35,0.04)] text-slate-300"
                }`}
              >
                {statusLabel}
              </span>
              <h3 className="mt-2 break-words text-lg font-semibold leading-snug">
                {property.title}
              </h3>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-400">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {property.city} · {property.address}
              </p>
            </div>
            <p className="whitespace-nowrap text-lg font-semibold text-indigo-200">
              {price}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-b border-[#DDD8CD] pb-4 text-sm text-slate-300">
            <span className="flex items-center gap-1.5">
              <Ruler className="h-4 w-4 text-slate-500" aria-hidden="true" />
              {Number(property.areaSqm).toLocaleString("pl-PL")} m²
            </span>
            <span>{property.rooms} pokoje</span>
          </div>

          <div className="mt-auto flex flex-wrap gap-2 pt-4">
            <form action={statusAction}>
              <input type="hidden" name="propertyId" value={property.id} />
              <Button
                type="submit"
                variant="secondary"
                size="sm"
                disabled={statusPending}
              >
                {statusPending && (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                )}
                Zmień status publikacji
              </Button>
            </form>
            <PhotoUpload propertyId={property.id} />
            <form
              action={deleteAction}
              onSubmit={(event) => {
                if (!window.confirm("Czy na pewno usunąć tę nieruchomość?")) {
                  event.preventDefault();
                }
              }}
            >
              <input type="hidden" name="propertyId" value={property.id} />
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="text-rose-300 hover:bg-rose-300/10"
                disabled={deletePending}
              >
                {deletePending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                )}
                Usuń
              </Button>
            </form>
          </div>
          {statusState.error && (
            <ActionMessage message={statusState.error} error />
          )}
          {statusState.success && (
            <ActionMessage message={statusState.success} />
          )}
          {deleteState.error && <ActionMessage message={deleteState.error} error />}
          {deleteState.success && <ActionMessage message={deleteState.success} />}
        </div>
      </div>
      <div className="space-y-5 border-t border-[#DDD8CD] p-4 sm:p-6">
        <PropertyMediaArchive
          propertyId={property.id}
          propertyTitle={property.title}
          media={property.media}
          heroMediaIds={property.heroMediaIds}
        />
        <PropertyAnalysisPanel
          propertyId={property.id}
          richHighlights={property.richHighlights}
          locationPotential={property.locationPotential}
          parametersJson={property.parametersJson}
        />
      </div>
    </article>
  );
}

function PhotoUpload({ propertyId }: { propertyId: string }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  async function uploadPhoto(file: File) {
    setPending(true);
    setMessage("Przesyłanie zdjęcia…");
    setError(false);
    setPreviewUrl(URL.createObjectURL(file));

    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch(`/api/properties/${propertyId}/media`, {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(true);
        setMessage(result.error ?? "Nie udało się przesłać zdjęcia.");
        setPreviewUrl(null);
        return;
      }

      setMessage("Zdjęcie zostało dodane.");
      setPreviewUrl(null);
      router.refresh();
    } catch {
      setError(true);
      setMessage("Nie udało się połączyć z serwerem. Spróbuj ponownie.");
      setPreviewUrl(null);
    } finally {
      setPending(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label="Wybierz zdjęcie nieruchomości"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) void uploadPhoto(file);
        }}
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={pending}
        onClick={() => fileInput.current?.click()}
      >
        {pending ? (
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Upload className="h-4 w-4" aria-hidden="true" />
        )}
        {pending ? "Wysyłanie…" : "Dodaj zdjęcie"}
      </Button>
      {previewUrl && (
        <div className="relative h-12 w-16 overflow-hidden rounded-lg border border-[#DDD8CD]">
          <Image
            src={previewUrl}
            alt="Podgląd przesyłanego zdjęcia"
            fill
            unoptimized
            sizes="64px"
            className="object-cover"
          />
        </div>
      )}
      {message && (
        <span
          role={error ? "alert" : "status"}
          className={`text-xs ${error ? "text-rose-300" : "text-emerald-300"}`}
        >
          {message}
        </span>
      )}
    </div>
  );
}

function ActionMessage({
  message,
  error = false,
}: {
  message: string;
  error?: boolean;
}) {
  return (
    <p
      role={error ? "alert" : "status"}
      className={`mt-3 text-sm ${error ? "text-rose-300" : "text-emerald-300"}`}
    >
      {message}
    </p>
  );
}
