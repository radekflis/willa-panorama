"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity, ArrowUpRight, Building2, MapPin, Sparkles } from "lucide-react";
import { PropertyMediaArchive } from "../properties/property-media-archive";
import type { PropertyMediaItem } from "../properties/property-manager";

type StudioProperty = {
  id: string;
  title: string;
  city: string;
  pricePln: number;
  areaSqm: string;
  rooms: number;
  heroMediaIds: string[];
  media: PropertyMediaItem[];
};

const modes = [
  {
    id: "valuation",
    label: "Wycena AI",
    note: "Analiza ceny ofertowej i kluczowych parametrów.",
    icon: Sparkles,
  },
  {
    id: "staging",
    label: "Studio Aranżacji i Modyfikacji Zdjęć",
    note: "Zaznacz obszar pędzlem i utwórz nową kopię zdjęcia.",
    icon: Building2,
  },
  {
    id: "location",
    label: "Analiza Lokalizacji",
    note: "Kontekst lokalizacji i dane nieruchomości.",
    icon: MapPin,
  },
] as const;

type StudioMode = (typeof modes)[number]["id"];

const priceFormat = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
  maximumFractionDigits: 0,
});

export function StudioWorkspace({
  properties,
}: {
  properties: StudioProperty[];
}) {
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [mode, setMode] = useState<StudioMode>("valuation");
  const selectedProperty = properties.find(({ id }) => id === propertyId);
  const selectedMode = modes.find(({ id }) => id === mode) ?? modes[0];

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <section className="card-lab space-y-7 p-5 sm:p-7">
        <div>
          <span className="eyebrow">01 / PROPERTY CONTEXT</span>
          <label
            htmlFor="studio-property"
            className="mt-4 block text-sm font-medium text-slate-200"
          >
            Nieruchomość
          </label>
          {properties.length ? (
            <select
              id="studio-property"
              className="spatial-input mt-2"
              value={propertyId}
              onChange={(event) => setPropertyId(event.target.value)}
            >
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.title} · {property.city}
                </option>
              ))}
            </select>
          ) : (
            <div className="mt-3 rounded-xl border border-dashed border-white/15 p-5 text-sm text-slate-400">
              Dodaj nieruchomość, aby rozpocząć pracę w Studio.
              <Link
                href="/properties"
                className="mt-3 inline-flex items-center gap-1 text-indigo-200 hover:text-white"
              >
                Przejdź do ofert <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>

        <div>
          <span className="eyebrow">02 / WORKSPACE MODE</span>
          <div className="mt-3 grid gap-2">
            {modes.map(({ id, label, note, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-pressed={mode === id}
                onClick={() => setMode(id)}
                className={`studio-mode ${mode === id ? "studio-mode-active" : ""}`}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 text-left">
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="mt-1 block text-xs text-slate-400">{note}</span>
                </span>
                {mode === id && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-indigo-300 shadow-[0_0_12px_rgba(165,180,252,.8)]" />
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section
        className="studio-preview card-lab flex min-h-[430px] flex-col overflow-hidden"
        aria-live="polite"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-7">
          <div>
            <span className="eyebrow">LIVE WORKSPACE / PREVIEW</span>
            <h2 className="mt-1 text-sm font-medium text-slate-100">
              {selectedMode.label}
            </h2>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/5 px-3 py-1.5 font-mono text-[10px] tracking-wide text-emerald-200">
            <Activity className="h-3 w-3" aria-hidden="true" />
            READY
          </span>
        </div>

        <div className="studio-scene relative flex flex-1 flex-col justify-end p-6 sm:p-8">
          <div className="studio-scene-orbit" aria-hidden="true" />
          <div className="studio-building-art" aria-hidden="true">
            <div className="studio-building-roof" />
            <div className="studio-building-body">
              <i /><i /><i /><i /><i /><i />
            </div>
            <div className="studio-building-base" />
          </div>
          <div className="relative z-10 rounded-2xl border border-white/10 bg-[#080c14]/80 p-5 backdrop-blur-xl sm:max-w-lg">
            <span className="eyebrow">SELECTED PROPERTY</span>
            {selectedProperty ? (
              <>
                <h3 className="mt-2 text-lg font-medium text-white">
                  {selectedProperty.title}
                </h3>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-400">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  {selectedProperty.city}
                </p>
                <div className="mt-4 grid grid-cols-3 gap-3 border-t border-white/10 pt-4">
                  <PreviewMetric
                    label="Cena ofertowa"
                    value={priceFormat.format(selectedProperty.pricePln)}
                  />
                  <PreviewMetric
                    label="Powierzchnia"
                    value={`${Number(selectedProperty.areaSqm).toLocaleString("pl-PL")} m²`}
                  />
                  <PreviewMetric label="Pokoje" value={String(selectedProperty.rooms)} />
                </div>
                <p className="mt-4 text-xs leading-relaxed text-slate-400">
                  To podgląd danych oferty. Wynik analizy {selectedMode.label.toLowerCase()} pojawi się po uruchomieniu usługi.
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-400">
                Wybierz nieruchomość, aby zobaczyć jej kontekst w tym trybie.
              </p>
            )}
          </div>
        </div>
      </section>
      </div>
      {selectedProperty && (
        <PropertyMediaArchive
          propertyId={selectedProperty.id}
          propertyTitle={selectedProperty.title}
          media={selectedProperty.media}
          heroMediaIds={selectedProperty.heroMediaIds}
        />
      )}
    </div>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-medium tabular-nums text-slate-100">
        {value}
      </p>
    </div>
  );
}
