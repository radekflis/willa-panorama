"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { marketplacePins, users } from "@/db/schema";
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

  if (!title || title.length > 160) {
    return { error: "Podaj tytuł oferty (maksymalnie 160 znaków)." };
  }
  if (!city || city.length > 100) {
    return { error: "Podaj miasto (maksymalnie 100 znaków)." };
  }
  if (!Number.isSafeInteger(pricePln) || pricePln < 1 || pricePln > 2_147_483_647) {
    return { error: "Cena musi być dodatnią liczbą całkowitą w PLN." };
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
    title,
    city,
    pricePln,
  });

  revalidatePath("/marketplace");
  return { success: "Oferta została dodana do Giełdy 0%." };
}
