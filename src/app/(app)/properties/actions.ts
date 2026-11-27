"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { properties, users } from "@/db/schema";
import { createClient } from "@/lib/auth/server";

export type PropertyActionState = {
  error?: string;
  success?: string;
};

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error && error.name !== "AuthSessionMissingError") throw error;
  if (!user) redirect("/login");

  return user;
}

function getText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function createPropertyAction(
  _previousState: PropertyActionState,
  formData: FormData,
): Promise<PropertyActionState> {
  const title = getText(formData, "title");
  const city = getText(formData, "city");
  const address = getText(formData, "address");
  const description = getText(formData, "description");
  const pricePln = Number(getText(formData, "pricePln"));
  const areaSqm = Number(getText(formData, "areaSqm"));
  const rooms = Number(getText(formData, "rooms"));
  const latText = getText(formData, "lat");
  const lngText = getText(formData, "lng");
  const lat = Number(latText);
  const lng = Number(lngText);

  if (!title || !city || !address) {
    return { error: "Uzupełnij tytuł, miasto i adres." };
  }
  if (!Number.isSafeInteger(pricePln) || pricePln < 1 || pricePln > 2_147_483_647) {
    return { error: "Cena musi być dodatnią liczbą całkowitą w PLN." };
  }
  if (!Number.isFinite(areaSqm) || areaSqm <= 0 || areaSqm > 99_999_999.99) {
    return { error: "Powierzchnia musi być większa od zera." };
  }
  if (!Number.isSafeInteger(rooms) || rooms < 1 || rooms > 2_147_483_647) {
    return { error: "Liczba pokoi musi być dodatnią liczbą całkowitą." };
  }
  if ((latText || lngText) && (!latText || !lngText || !Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lng) || Math.abs(lng) > 180)) {
    return { error: "Nieprawidłowe współrzędne nieruchomości." };
  }

  const user = await getAuthenticatedUser();
  if (!user.email) {
    return { error: "Konto nie ma adresu e-mail wymaganego do zapisu." };
  }

  await db
    .insert(users)
    .values({ id: user.id, email: user.email })
    .onConflictDoNothing({ target: users.id });

  await db.insert(properties).values({
    ownerId: user.id,
    slug: `${slugify(title) || "nieruchomosc"}-${randomUUID()}`,
    title,
    city,
    address,
    description: description || null,
    pricePln,
    areaSqm: areaSqm.toFixed(2),
    rooms,
    lat: latText ? lat.toFixed(6) : null,
    lng: lngText ? lng.toFixed(6) : null,
    status: "draft",
  });

  revalidatePath("/properties");
  return { success: "Nieruchomość została dodana." };
}

export async function togglePropertyStatusAction(
  _previousState: PropertyActionState,
  formData: FormData,
): Promise<PropertyActionState> {
  const propertyId = getText(formData, "propertyId");
  if (!propertyId) return { error: "Nie udało się rozpoznać nieruchomości." };

  const user = await getAuthenticatedUser();
  const [property] = await db
    .select({ id: properties.id, status: properties.status })
    .from(properties)
    .where(and(eq(properties.id, propertyId), eq(properties.ownerId, user.id)))
    .limit(1);

  if (!property) return { error: "Nie znaleziono tej nieruchomości." };

  await db
    .update(properties)
    .set({
      status: property.status === "published" ? "draft" : "published",
      updatedAt: new Date(),
    })
    .where(and(eq(properties.id, property.id), eq(properties.ownerId, user.id)));

  revalidatePath("/properties");
  return {
    success:
      property.status === "published"
        ? "Oferta została przeniesiona do szkiców."
        : "Oferta została opublikowana.",
  };
}

export async function deletePropertyAction(
  _previousState: PropertyActionState,
  formData: FormData,
): Promise<PropertyActionState> {
  const propertyId = getText(formData, "propertyId");
  if (!propertyId) return { error: "Nie udało się rozpoznać nieruchomości." };

  const user = await getAuthenticatedUser();
  const [deleted] = await db
    .delete(properties)
    .where(and(eq(properties.id, propertyId), eq(properties.ownerId, user.id)))
    .returning({ id: properties.id });

  if (!deleted) return { error: "Nie znaleziono tej nieruchomości." };

  revalidatePath("/properties");
  return { success: "Nieruchomość została usunięta." };
}
