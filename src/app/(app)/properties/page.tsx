import { asc, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { properties, propertyMedia } from "@/db/schema";
import { createClient } from "@/lib/auth/server";
import { PropertyManager, type PropertyListItem, type PropertyMediaItem } from "./property-manager";

export default async function PropertiesPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error && error.name !== "AuthSessionMissingError") throw error;
  if (!user) redirect("/login");

  const userProperties = await db
    .select({
      id: properties.id,
      title: properties.title,
      city: properties.city,
      address: properties.address,
      pricePln: properties.pricePln,
      areaSqm: properties.areaSqm,
      rooms: properties.rooms,
      status: properties.status,
      description: properties.description,
      richHighlights: properties.richHighlights,
      locationPotential: properties.locationPotential,
      parametersJson: properties.parametersJson,
      heroMediaIds: properties.heroMediaIds,
    })
    .from(properties)
    .where(eq(properties.ownerId, user.id))
    .orderBy(asc(properties.createdAt));

  const propertyIds = userProperties.map((property) => property.id);
  const media =
    propertyIds.length > 0
      ? await db
          .select({
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
            isCover: propertyMedia.isCover,
            sortOrder: propertyMedia.sortOrder,
          })
          .from(propertyMedia)
          .where(inArray(propertyMedia.propertyId, propertyIds))
          .orderBy(asc(propertyMedia.sortOrder))
      : [] as Array<PropertyMediaItem & { propertyId: string; isCover: boolean; sortOrder: number }>;
  const mediaByProperty = new Map<string, PropertyMediaItem[]>();
  const covers = new Map<string, string>();
  media.forEach(({ propertyId, isCover, ...item }) => {
    const items = mediaByProperty.get(propertyId) ?? [];
    items.push(item);
    mediaByProperty.set(propertyId, items);
    if (isCover && item.mediaType === "photo" && !covers.has(propertyId)) covers.set(propertyId, item.url);
  });
  const propertyItems: PropertyListItem[] = userProperties.map((property) => ({
    ...property,
    coverUrl: covers.get(property.id) ?? null,
    media: mediaByProperty.get(property.id) ?? [],
    parametersJson: property.parametersJson ?? [],
    heroMediaIds: property.heroMediaIds ?? [],
  }));

  return (
    <main className="bg-grid-lab min-h-screen">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-10 sm:px-8 sm:py-12">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-6">
          <Link
            href="/dashboard"
            className="w-fit text-sm font-medium text-indigo-200 hover:text-white hover:underline"
          >
            ← Powrót do pulpitu
          </Link>
          <div>
            <span className="eyebrow">
              Willa Panorama · Moduł
            </span>
            <h1 className="mt-1 text-3xl font-semibold tracking-[-0.02em] text-white">
              Nieruchomości
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Zarządzaj swoimi ofertami, zdjęciami i publikacją.
            </p>
          </div>
        </header>

        <PropertyManager properties={propertyItems} />
      </div>
    </main>
  );
}
