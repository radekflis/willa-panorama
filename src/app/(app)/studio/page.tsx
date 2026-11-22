import { asc, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { properties, propertyMedia } from "@/db/schema";
import { createClient } from "@/lib/auth/server";
import { StudioWorkspace } from "./studio-workspace";
import type { PropertyMediaItem } from "../properties/property-manager";

export default async function StudioPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error?.name === "AuthSessionMissingError") redirect("/login");
  if (error) throw error;
  if (!user) redirect("/login");

  const userProperties = await db
    .select({
      id: properties.id,
      title: properties.title,
      city: properties.city,
      pricePln: properties.pricePln,
      areaSqm: properties.areaSqm,
      rooms: properties.rooms,
      heroMediaIds: properties.heroMediaIds,
    })
    .from(properties)
    .where(eq(properties.ownerId, user.id));

  const propertyIds = userProperties.map((property) => property.id);
  const media = propertyIds.length ? await db.select({
    id: propertyMedia.id,
    propertyId: propertyMedia.propertyId,
    url: propertyMedia.url,
    mediaType: propertyMedia.mediaType,
    category: propertyMedia.category,
    aiTags: propertyMedia.aiTags,
    aiDescription: propertyMedia.aiDescription,
    isOriginal: propertyMedia.isOriginal,
    parentMediaId: propertyMedia.parentMediaId,
    resolutionTier: propertyMedia.resolutionTier,
  }).from(propertyMedia).where(inArray(propertyMedia.propertyId, propertyIds)).orderBy(asc(propertyMedia.sortOrder)) : [];
  const mediaByProperty = new Map<string, PropertyMediaItem[]>();
  for (const item of media) {
    const items = mediaByProperty.get(item.propertyId) ?? [];
    const { propertyId, ...mediaItem } = item;
    items.push(mediaItem);
    mediaByProperty.set(propertyId, items);
  }
  const studioProperties = userProperties.map((property) => ({
    ...property,
    heroMediaIds: property.heroMediaIds ?? [],
    media: mediaByProperty.get(property.id) ?? [],
  }));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-5 py-10 sm:px-8 sm:py-12">
      <header className="border-b border-white/10 pb-6">
        <span className="eyebrow">WILLA PANORAMA · SPATIAL INTELLIGENCE</span>
        <h1 className="mt-3 text-3xl font-medium tracking-tight text-white">
          Studio Aranżacji i Modyfikacji Zdjęć
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Wybierz zdjęcie, zaznacz obszar pędzlem i opisz zmianę w języku naturalnym.
        </p>
      </header>
      <StudioWorkspace properties={studioProperties} />
    </main>
  );
}
