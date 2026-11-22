import { count, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  Building2,
  Coins,
  FileText,
  Handshake,
  Sparkles,
} from "lucide-react";
import { db } from "@/db";
import { creditWallets, properties, users } from "@/db/schema";
import { createClient } from "@/lib/auth/server";

const modules = [
  {
    href: "/properties",
    label: "Nieruchomości",
    description: "Zarządzaj ofertami, mediami i publikacją bez prowizji.",
    icon: Building2,
    detail: "01 / PROPERTY NETWORK",
    className: "dashboard-tile-properties",
  },
  {
    href: "/studio",
    label: "Studio AI i 3D",
    description: "Analizuj wnętrza, wyceniaj i projektuj spacery 3D.",
    icon: Sparkles,
    detail: "02 / SPATIAL INTELLIGENCE",
    className: "dashboard-tile-studio",
  },
  {
    href: "/documents",
    label: "Dokumenty i OCR",
    description: "Pracuj z dokumentami, OCR i audytem umów.",
    icon: FileText,
    detail: "03 / DOCUMENT SYSTEMS",
    className: "dashboard-tile-documents",
  },
  {
    href: "/marketplace",
    label: "Giełda 0%",
    description: "Odkrywaj oferty bezpośrednie i radar kupujących.",
    icon: Handshake,
    detail: "04 / DIRECT EXCHANGE",
    className: "dashboard-tile-marketplace",
  },
  {
    href: "/billing",
    label: "Plany i Kredyty",
    description: "Sprawdzaj saldo, plany i rozliczenia.",
    icon: Coins,
    detail: "05 / ACCOUNT RESOURCES",
    className: "dashboard-tile-billing",
  },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError?.name === "AuthSessionMissingError") redirect("/login");
  if (userError) throw userError;
  if (!user) redirect("/login");

  const [neonUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (!neonUser) {
    if (!user.email) {
      throw new Error("Cannot create a Neon user record without an email address.");
    }

    await db
      .insert(users)
      .values({ id: user.id, email: user.email, plan: "free" })
      .onConflictDoNothing({ target: users.id });
  }

  const [wallet] = await db
    .select({ balance: creditWallets.balance })
    .from(creditWallets)
    .where(eq(creditWallets.userId, user.id))
    .limit(1);

  const creditBalance = wallet?.balance ?? 5;
  const [{ propertyCount }] = await db
    .select({ propertyCount: count() })
    .from(properties);

  return (
    <main className="dashboard-page mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-9 px-5 py-7 sm:px-8 sm:py-10 xl:px-12">
      <section className="telemetry-grid" aria-label="Telemetria systemu">
        <div className="telemetry-item">
          <span className="telemetry-label">Oferty w bazie Neon</span>
          <span className="telemetry-value tabular-nums">
            {propertyCount.toLocaleString("pl-PL")}
          </span>
          <span className="telemetry-caption">Łączna liczba w bazie</span>
        </div>
        <div className="telemetry-item">
          <span className="telemetry-label">Saldo kredytów</span>
          <span className="telemetry-value tabular-nums">
            {creditBalance.toLocaleString("pl-PL")}
          </span>
          <span className="telemetry-caption">Dostępne na Twoim koncie</span>
        </div>
        <div className="telemetry-item telemetry-system">
          <span className="telemetry-label">Status systemu</span>
          <span className="telemetry-value flex items-center gap-2.5">
            <span className="status-pulse" aria-hidden="true" />
            ONLINE
          </span>
          <span className="telemetry-caption">Wszystkie systemy operacyjne</span>
        </div>
      </section>

      <header className="dashboard-heading">
        <div>
          <span className="eyebrow">WILLA PANORAMA / CONTROL CENTER</span>
          <h1 className="mt-3 text-3xl font-medium tracking-[-0.04em] text-white sm:text-4xl">
            Przestrzeń, która
            <br className="hidden sm:block" /> pracuje dla Ciebie.
          </h1>
          <p className="mt-3 text-sm text-slate-400">
            Zalogowano jako {user.email ?? "użytkownik"} · wybierz moduł, aby
            kontynuować.
          </p>
        </div>
      </header>

      <section
        aria-label="Moduły aplikacji"
        className="dashboard-bento grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6"
      >
        {modules.map(({ href, label, description, icon: Icon, detail, className }) => (
          <Link
            key={href}
            href={href}
            className={`dashboard-tile group flex min-h-56 flex-col justify-between p-6 sm:p-7 lg:col-span-3 ${className} ${href === "/properties" ? "lg:row-span-2" : ""}`}
          >
            <div className="flex items-start justify-between">
              <span className="dashboard-tile-icon">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <ArrowUpRight
                className="dashboard-tile-arrow h-5 w-5"
                aria-hidden="true"
              />
            </div>
            <div className="mt-8">
              <span className="dashboard-tile-detail">{detail}</span>
              <h2 className="mt-2 text-lg font-medium tracking-tight text-white sm:text-xl">
                {label}
              </h2>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-400">
                {description}
              </p>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
