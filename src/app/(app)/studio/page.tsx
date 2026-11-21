import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { properties } from "@/db/schema";
import { createClient } from "@/lib/auth/server";
import { StudioWorkspace } from "./studio-workspace";

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
    })
    .from(properties)
    .where(eq(properties.ownerId, user.id));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-5 py-10 sm:px-8 sm:py-12">
      <header className="border-b border-white/10 pb-6">
        <span className="eyebrow">WILLA PANORAMA · SPATIAL INTELLIGENCE</span>
        <h1 className="mt-3 text-3xl font-medium tracking-tight text-white">
          Studio AI &amp; 3D
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Wybierz nieruchomość i tryb pracy, aby przygotować podgląd analizy.
        </p>
      </header>
      <StudioWorkspace properties={userProperties} />
    </main>
  );
}
