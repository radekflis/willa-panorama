"use server";

import { revalidatePath } from "next/cache";
import { and, eq, gt, or } from "drizzle-orm";
import { db } from "@/db";
import { marketplacePins, users, directMessages } from "@/db/schema";
import { createClient } from "@/lib/auth/server";

export type MarketplaceActionState = {
  error?: string;
  success?: string;
};

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function createMarketplacePinAction(
  _previousState: MarketplaceActionState,
  formData: FormData,
): Promise<MarketplaceActionState> {
  const title = readText(formData, "title");
  const city = readText(formData, "city");
  const pricePln = Number(readText(formData, "pricePln"));
  const pinType = readText(formData, "pinType");
  const transactionType = readText(formData, "transactionType");
  const description = readText(formData, "description");
  const lat = Number(readText(formData, "lat"));
  const lng = Number(readText(formData, "lng"));
  const areaM2 = Number(readText(formData, "areaM2"));
  const rooms = Number(readText(formData, "rooms"));
  const contactPhone = readText(formData, "contactPhone");
  const contactEmail = readText(formData, "contactEmail");

  if (!title || title.length > 160) {
    return { error: "Podaj tytuł oferty (maksymalnie 160 znaków)." };
  }
  if (!city || city.length > 100) {
    return { error: "Podaj miasto (maksymalnie 100 znaków)." };
  }
  if (!Number.isSafeInteger(pricePln) || pricePln < 1 || pricePln > 2_147_483_647) {
    return { error: "Cena musi być dodatnią liczbą całkowitą w PLN." };
  }
  if (pinType !== "owner_offer" && pinType !== "buyer_request") {
    return { error: "Wybierz typ pinu: oferta właściciela lub poszukiwanie." };
  }
  if (transactionType !== "sale" && transactionType !== "rent") {
    return { error: "Wybierz sprzedaż lub wynajem." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error?.name === "AuthSessionMissingError") {
    return { error: "Zaloguj się, aby dodać ofertę." };
  }
  if (error) throw error;
  if (!user) return { error: "Zaloguj się, aby dodać ofertę." };
  if (!user.email) {
    return { error: "Konto nie ma adresu e-mail wymaganego do zapisu." };
  }

  await db
    .insert(users)
    .values({ id: user.id, email: user.email })
    .onConflictDoNothing({ target: users.id });
  await db.insert(marketplacePins).values({
    ownerId: user.id,
    pinType,
    transactionType,
    title,
    city,
    description,
    pricePln,
    areaM2: Number.isFinite(areaM2) && areaM2 > 0 ? areaM2 : null,
    rooms: Number.isFinite(rooms) && rooms > 0 ? rooms : null,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    contactPhone,
    contactEmail,
  });

  revalidatePath("/marketplace");
  return { success: "Oferta została dodana do Globalnej Mapy 5$." };
}

export async function restoreMarketplacePinAction(pinId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await db
    .update(marketplacePins)
    .set({ status: "active", lockedByUserId: null, lockedUntil: null, updatedAt: new Date() })
    .where(and(eq(marketplacePins.id, pinId), eq(marketplacePins.ownerId, user.id)));
  revalidatePath("/marketplace");
  revalidatePath("/inbox");
}

export async function sendDirectMessageAction(formData: FormData) {
  const pinId = readText(formData, "pinId");
  const content = readText(formData, "content");
  const receiverId = readText(formData, "receiverId");
  if (!pinId || !content || !receiverId) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const [pin] = await db
    .select({ ownerId: marketplacePins.ownerId, lockedByUserId: marketplacePins.lockedByUserId })
    .from(marketplacePins)
    .where(eq(marketplacePins.id, pinId))
    .limit(1);
  if (!pin) return;
  const participant = user.id === pin.ownerId || user.id === pin.lockedByUserId;
  if (!participant) return;

  await db.insert(directMessages).values({
    pinId,
    senderId: user.id,
    receiverId,
    content,
  });
  revalidatePath("/inbox");
}
