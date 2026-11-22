"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type PlatformRole = "buyer" | "owner" | "agency";

const ROLES: Array<{ id: PlatformRole; label: string }> = [
  { id: "buyer", label: "Kupujący" },
  { id: "owner", label: "Właściciel" },
  { id: "agency", label: "Agencja" },
];

const NAV_LINKS = [
  { href: "/dashboard", label: "Pulpit" },
  { href: "/properties", label: "Nieruchomości & Studio" },
  { href: "/documents", label: "Dokumenty" },
  { href: "/inbox", label: "Skrzynka" },
];

export function LbfTopbar() {
  const pathname = usePathname();
  const [role, setRole] = useState<PlatformRole>("owner");

  useEffect(() => {
    const saved = window.localStorage.getItem("lbf_role") as PlatformRole | null;
    const initial: PlatformRole = saved && ["buyer", "owner", "agency"].includes(saved) ? saved : "owner";
    setRole(initial);
    document.documentElement.dataset.role = initial;
  }, []);

  const selectRole = (next: PlatformRole) => {
    setRole(next);
    document.documentElement.dataset.role = next;
    window.localStorage.setItem("lbf_role", next);
  };

  return (
    <header className="sticky top-3 z-40 mx-auto max-w-6xl px-4">
      <div className="lbf-glass flex flex-wrap items-center justify-between gap-3 rounded-full px-4 py-2.5">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1C2B23] text-xs font-semibold tracking-wider text-[#FAF9F6]">
            LBF
          </span>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight text-[#1C2B23]">
              Liquid Biomimetics Force
            </div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-[#4E5B53]">
              3D · AI · Spatial OS
            </div>
          </div>
        </Link>

        <nav className="flex flex-wrap items-center gap-1">
          {NAV_LINKS.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`lbf-pill px-3.5 py-1.5 text-xs font-medium ${
                  active
                    ? "bg-[#1C2B23] text-[#FAF9F6] shadow-sm"
                    : "text-[#1C2B23]/80 hover:bg-white/70 hover:text-[#1C2B23]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1 rounded-full bg-[#1C2B23]/8 p-1">
          {ROLES.map((r) => {
            const active = role === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => selectRole(r.id)}
                className={`lbf-pill px-3 py-1 text-xs font-medium ${
                  active
                    ? "bg-[#C9734E] text-[#FAF9F6] shadow-sm"
                    : "text-[#1C2B23]/75 hover:text-[#1C2B23]"
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
