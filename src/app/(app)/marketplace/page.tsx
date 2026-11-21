import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { marketplacePins, users } from "@/db/schema";
import { createClient } from "@/lib/auth/server";
import { MarketplaceWorkspace, type PublicPin } from "./marketplace-workspace";

export default async function MarketplacePage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error?.name === "AuthSessionMissingError") redirect("/login");
  if (error) throw error;
  if (!user) redirect("/login");

  const [account] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  const rows = await db
    .select({
      id: marketplacePins.id,
      ownerId: marketplacePins.ownerId,
      pinType: marketplacePins.pinType,
      transactionType: marketplacePins.transactionType,
      lat: marketplacePins.lat,
      lng: marketplacePins.lng,
      city: marketplacePins.city,
      title: marketplacePins.title,
      description: marketplacePins.description,
      pricePln: marketplacePins.pricePln,
      areaM2: marketplacePins.areaM2,
      rooms: marketplacePins.rooms,
      status: marketplacePins.status,
    })
    .from(marketplacePins)
    .where(eq(marketplacePins.status, "active"))
    .orderBy(desc(marketplacePins.createdAt))
    .limit(100);

  const pins: PublicPin[] = rows.map((pin) => ({ ...pin }));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-8 px-5 py-10 sm:px-8 sm:py-12 xl:px-12">
      <header className="border-b border-white/10 pb-6">
        <span className="eyebrow">WILLA PANORAMA · 5$ DIRECT EXCHANGE</span>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-medium tracking-tight text-white">Globalna Mapa 5$</h1>
            <p className="mt-2 text-sm text-slate-400">Wyłączność kontaktu na 72 godziny po odblokowaniu za 5$.</p>
          </div>
          <div className="flex gap-2">
            <span className="rounded-full border border-amber-200/20 bg-amber-200/10 px-3 py-1.5 font-mono text-[9px] text-amber-100">ZŁOTO / SPRZEDAŻ</span>
            <span className="rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 py-1.5 font-mono text-[9px] text-cyan-100">CYJAN / POSZUKUJĄCY</span>
          </div>
        </div>
      </header>
      <MarketplaceWorkspace
        pins={pins}
        userId={user.id}
        role={account?.role ?? "owner"}
        googleMapsKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? null}
      />
    </main>
  );
}
