import { and, asc, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { properties, propertyMedia } from "@/db/schema";
import { createClient } from "@/lib/auth/server";
import { PropertyManager, type PropertyListItem } from "./property-manager";

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
    })
    .from(properties)
    .where(eq(properties.ownerId, user.id))
    .orderBy(asc(properties.createdAt));

  const propertyIds = userProperties.map((property) => property.id);
  const media =
    propertyIds.length > 0
      ? await db
          .select({
            propertyId: propertyMedia.propertyId,
            url: propertyMedia.url,
            isCover: propertyMedia.isCover,
            sortOrder: propertyMedia.sortOrder,
          })
          .from(propertyMedia)
          .where(
            and(
              inArray(propertyMedia.propertyId, propertyIds),
              eq(propertyMedia.isCover, true),
            ),
          )
          .orderBy(asc(propertyMedia.sortOrder))
      : [];
  const covers = new Map(media.map((item) => [item.propertyId, item.url]));
  const propertyItems: PropertyListItem[] = userProperties.map((property) => ({
    ...property,
    coverUrl: covers.get(property.id) ?? null,
  }));

  return (
    <main className="bg-grid-lab min-h-screen">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-10 sm:px-8 sm:py-12">
        <header className="flex flex-col gap-4 border-b border-[#EAEAEA] pb-6">
          <Link
            href="/dashboard"
            className="w-fit text-sm font-medium text-[#6B0F1A] hover:underline"
          >
            ← Powrót do pulpitu
          </Link>
          <div>
            <span className="font-mono text-xs uppercase tracking-wider text-[#6B0F1A]">
              Willa Panorama · Moduł
            </span>
            <h1 className="mt-1 text-3xl font-semibold tracking-[-0.02em] text-[#111111]">
              Nieruchomości
            </h1>
            <p className="mt-2 text-sm text-[#525252]">
              Zarządzaj swoimi ofertami, zdjęciami i publikacją.
            </p>
          </div>
        </header>

        <PropertyManager properties={propertyItems} />
      </div>
    </main>
  );
}
