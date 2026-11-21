import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  Building2,
  Coins,
  FileText,
  Handshake,
  LayoutDashboard,
  LogOut,
  Inbox,
  Sparkles,
} from "lucide-react";
import { signOutAction } from "@/app/(auth)/actions";
import { createClient } from "@/lib/auth/server";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { users } from "@/db/schema";
import { RoleSwitcher } from "./role-switcher";

const allNavigation = [
  { href: "/dashboard", label: "Pulpit", icon: LayoutDashboard },
  { href: "/properties", label: "Nieruchomości", icon: Building2 },
  { href: "/studio", label: "Studio AI i 3D", icon: Sparkles },
  { href: "/documents", label: "Dokumenty i OCR", icon: FileText },
  { href: "/marketplace", label: "Globalna Mapa 5$", icon: Handshake },
  { href: "/inbox", label: "Skrzynka Odbiorcza", icon: Inbox },
  { href: "/billing", label: "Plany i Kredyty", icon: Coins },
];

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error?.name === "AuthSessionMissingError") redirect("/login");
  if (error) throw error;
  if (!user) redirect("/login");

  await db
    .insert(users)
    .values({ id: user.id, email: user.email ?? "", role: "owner" })
    .onConflictDoNothing({ target: users.id });
  const [account] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  const role = account?.role ?? "owner";
  const buyerLinks = new Set(["/dashboard", "/marketplace", "/inbox"]);
  const navigation =
    role === "buyer"
      ? allNavigation.filter(({ href }) => buyerLinks.has(href))
      : allNavigation;

  return (
    <div className="app-shell min-h-screen lg:flex">
      <aside className="app-sidebar flex shrink-0 flex-col lg:sticky lg:top-0 lg:h-screen lg:w-72">
        <Link href="/dashboard" className="app-brand flex items-center gap-3">
          <span className="app-brand-mark">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-semibold tracking-wide text-white">
              WILLA PANORAMA
            </span>
            <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400">
              Spatial Architecture OS
            </span>
          </span>
        </Link>

        <nav
          aria-label="Nawigacja główna"
          className="app-navigation flex gap-2 overflow-x-auto lg:mt-12 lg:flex-col lg:overflow-visible"
        >
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="app-nav-link">
              <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <RoleSwitcher role={role} />

        <div className="app-sidebar-footer mt-5 flex items-center justify-between gap-3 lg:mt-auto">
          <div className="flex min-w-0 items-center gap-3">
            <span className="app-user-avatar" aria-hidden="true">
              {(user.email?.[0] ?? "U").toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-100">
                {user.email ?? "Użytkownik"}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400">
                <Activity className="h-3 w-3 text-emerald-400" aria-hidden="true" />
                Konto aktywne
              </p>
            </div>
          </div>
          <form action={signOutAction}>
            <button type="submit" className="app-signout" aria-label="Wyloguj">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span>Wyloguj</span>
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
