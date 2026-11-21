import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Coins, FileText, Handshake, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/(auth)/actions";
import { createClient } from "@/lib/auth/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) redirect("/login");

  const { data: wallet, error: walletError } = await supabase
    .from("credit_wallets")
    .select("balance")
    .eq("user_id", user.id)
    .maybeSingle();

  if (walletError) throw walletError;

  const creditBalance = wallet?.balance ?? 5;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#EAEAEA] pb-6">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs uppercase tracking-wider text-[#6B0F1A]">
            Willa Panorama · Pulpit
          </span>
          <h1 className="text-3xl font-semibold tracking-[-0.02em] text-[#111111]">
            Witaj w swoim panelu
          </h1>
          <p className="mt-1 text-sm text-[#525252]">
            Zalogowano jako {user.email ?? "użytkownik"}
          </p>
        </div>
        <form action={signOutAction}>
          <Button type="submit" variant="secondary" size="sm">
            Wyloguj
          </Button>
        </form>
      </div>

      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="card-lab flex flex-col gap-2 p-6">
          <Building2 className="h-5 w-5 text-[#6B0F1A]" />
          <h2 className="text-base font-semibold">Nieruchomości</h2>
          <p className="text-sm text-[#525252]">
            Dodawaj oferty, zdjęcia HDR i publikuj karty 0%.
          </p>
        </div>
        <div className="card-lab flex flex-col gap-2 p-6">
          <Sparkles className="h-5 w-5 text-[#6B0F1A]" />
          <h2 className="text-base font-semibold">Studio AI i 3D</h2>
          <p className="text-sm text-[#525252]">
            Wycena, analiza wnętrz, spacery 3D i lokalizacja.
          </p>
        </div>
        <div className="card-lab flex flex-col gap-2 p-6">
          <FileText className="h-5 w-5 text-[#6B0F1A]" />
          <h2 className="text-base font-semibold">Dokumenty i OCR</h2>
          <p className="text-sm text-[#525252]">
            Kreator 5 umów PL/UE oraz darmowy OCR i audyt AI.
          </p>
        </div>
        <div className="card-lab flex flex-col gap-2 p-6">
          <Handshake className="h-5 w-5 text-[#6B0F1A]" />
          <h2 className="text-base font-semibold">Giełda 0%</h2>
          <p className="text-sm text-[#525252]">
            Tablica ofert bezpośrednich i radarów kupujących.
          </p>
        </div>
        <div className="card-lab flex flex-col gap-2 p-6">
          <Coins className="h-5 w-5 text-[#6B0F1A]" />
          <h2 className="text-base font-semibold">Plany i Kredyty</h2>
          <p className="text-sm text-[#525252]">
            Saldo: {creditBalance} kredytów · rozliczenia Stripe.
          </p>
        </div>
      </section>
    </main>
  );
}
