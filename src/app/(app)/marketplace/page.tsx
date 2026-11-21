import Image from "next/image";
import { desc, eq, inArray } from "drizzle-orm";
import { MapPin, Sparkles } from "lucide-react";
import { db } from "@/db";
import {
  marketplacePins,
  properties,
  propertyMedia,
} from "@/db/schema";
import { MarketplaceForm } from "./marketplace-form";

const priceFormat = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
  maximumFractionDigits: 0,
});

export default async function MarketplacePage() {
  const [publishedProperties, activePins] = await Promise.all([
    db
      .select({
        id: properties.id,
        title: properties.title,
        city: properties.city,
        pricePln: properties.pricePln,
        areaSqm: properties.areaSqm,
        rooms: properties.rooms,
      })
      .from(properties)
      .where(eq(properties.status, "published"))
      .orderBy(desc(properties.createdAt))
      .limit(40),
    db
      .select({
        id: marketplacePins.id,
        title: marketplacePins.title,
        city: marketplacePins.city,
        pricePln: marketplacePins.pricePln,
      })
      .from(marketplacePins)
      .where(eq(marketplacePins.status, "active"))
      .orderBy(desc(marketplacePins.createdAt))
      .limit(40),
  ]);

  const propertyIds = publishedProperties.map(({ id }) => id);
  const covers = propertyIds.length
    ? await db
        .select({
          propertyId: propertyMedia.propertyId,
          url: propertyMedia.url,
        })
        .from(propertyMedia)
        .where(
          inArray(propertyMedia.propertyId, propertyIds),
        )
        .orderBy(desc(propertyMedia.isCover), desc(propertyMedia.sortOrder))
    : [];
  const coverByProperty = new Map<string, string>();
  for (const cover of covers) {
    if (!coverByProperty.has(cover.propertyId)) {
      coverByProperty.set(cover.propertyId, cover.url);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-8 px-5 py-10 sm:px-8 sm:py-12 xl:px-12">
      <header className="border-b border-white/10 pb-6">
        <span className="eyebrow">WILLA PANORAMA · DIRECT EXCHANGE</span>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-medium tracking-tight text-white">
              Giełda 0%
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Oferty bezpośrednie, bez prowizji pośrednika.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/5 px-3 py-1.5 font-mono text-[10px] tracking-wide text-emerald-200">
            <span className="status-pulse" aria-hidden="true" />
            {publishedProperties.length} OPUBLIKOWANYCH
          </span>
        </div>
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.7fr)]">
        <div className="space-y-8">
          <section aria-labelledby="marketplace-properties-heading">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <span className="eyebrow">PUBLIC LISTINGS</span>
                <h2
                  id="marketplace-properties-heading"
                  className="mt-1 text-lg font-medium text-slate-100"
                >
                  Opublikowane nieruchomości
                </h2>
              </div>
              <span className="font-mono text-xs tabular-nums text-slate-500">
                {publishedProperties.length.toString().padStart(2, "0")} / 40
              </span>
            </div>
            {publishedProperties.length === 0 ? (
              <div className="card-lab flex min-h-48 flex-col items-center justify-center p-6 text-center">
                <Sparkles className="h-6 w-6 text-indigo-200" aria-hidden="true" />
                <p className="mt-3 text-sm text-slate-300">
                  Brak opublikowanych ofert.
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Opublikowane nieruchomości pojawią się tutaj.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {publishedProperties.map((property) => {
                  const coverUrl = coverByProperty.get(property.id);
                  return (
                    <article
                      key={property.id}
                      className="card-lab overflow-hidden transition duration-200 hover:-translate-y-1 hover:border-white/20"
                    >
                      <div className="relative h-44 overflow-hidden bg-slate-900">
                        {coverUrl ? (
                          <Image
                            src={coverUrl}
                            alt={`Zdjęcie nieruchomości: ${property.title}`}
                            fill
                            sizes="(max-width: 768px) 100vw, 50vw"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-slate-500">
                            Brak zdjęcia oferty
                          </div>
                        )}
                        <span className="absolute left-3 top-3 rounded-full border border-emerald-200/20 bg-[#06100d]/80 px-2.5 py-1 font-mono text-[9px] tracking-wider text-emerald-200 backdrop-blur">
                          0% PROWIZJI
                        </span>
                      </div>
                      <div className="p-4">
                        <h3 className="truncate text-sm font-medium text-slate-100">
                          {property.title}
                        </h3>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                          {property.city}
                        </p>
                        <div className="mt-4 flex items-end justify-between gap-3">
                          <span className="text-base font-semibold tabular-nums text-white">
                            {priceFormat.format(property.pricePln)}
                          </span>
                          <span className="text-right text-[11px] text-slate-400">
                            {Number(property.areaSqm).toLocaleString("pl-PL")} m²
                            <br />
                            {property.rooms} pokoje
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section aria-labelledby="active-pins-heading">
            <div className="mb-4">
              <span className="eyebrow">COMMUNITY EXCHANGE</span>
              <h2
                id="active-pins-heading"
                className="mt-1 text-lg font-medium text-slate-100"
              >
                Aktywne piny
              </h2>
            </div>
            {activePins.length === 0 ? (
              <p className="card-lab p-5 text-sm text-slate-400">
                Aktywne piny z giełdy pojawią się w tym miejscu.
              </p>
            ) : (
              <div className="space-y-3">
                {activePins.map((pin) => (
                  <article
                    key={pin.id}
                    className="card-lab flex flex-wrap items-center justify-between gap-3 p-4"
                  >
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-medium text-slate-100">
                        {pin.title}
                      </h3>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                        <MapPin className="h-3 w-3" aria-hidden="true" />
                        {pin.city}
                      </p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-indigo-100">
                      {priceFormat.format(pin.pricePln)}
                    </span>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
        <MarketplaceForm />
      </div>
    </main>
  );
}
