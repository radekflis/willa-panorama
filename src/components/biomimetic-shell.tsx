"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEdition, type Edition } from "./edition-provider";

const EDITIONS: { id: Edition; label: string }[] = [
  { id: "buyer", label: "Kupujący" },
  { id: "owner", label: "Właściciel" },
  { id: "agency", label: "Agencja" },
];

export function BiomimeticShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { edition, setEdition } = useEdition();

  if (pathname === "/dashboard") return <>{children}</>;

  const navItems =
    edition === "buyer"
      ? [
          { href: "/dashboard", label: "Prezentacja" },
          { href: "/properties", label: "Galeria & Spacer 3D" },
        ]
      : [
          { href: "/dashboard", label: "Pulpit" },
          { href: "/properties", label: "Archiwum & Studio AI" },
          { href: "/documents", label: "Umowy & OCR" },
          { href: "/inbox", label: "Skrzynka" },
        ];

  return (
    <div className="min-h-screen bg-[#F3F1EC] text-[#1F2A24]">
      {/* Plywajaca kapsula nawigacyjna */}
      <header className="sticky top-0 z-40 border-b border-[#DDD8CD]/80 bg-[#F3F1EC]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-3.5 md:px-8">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1C2B23] text-xs font-medium text-[#F3F1EC]">
                WP
              </span>
              <div className="leading-tight">
                <div className="font-editorial text-lg font-medium text-[#1F2A24]">
                  {edition === "agency" ? "Willa Panorama · White-Label" : "Willa Panorama"}
                </div>
                <div className="font-mono-label text-[9px] text-[#626861]">
                  BORZYGNIEW · BIOMIMETIC OS
                </div>
              </div>
            </Link>

            <nav className="hidden items-center gap-1 md:flex">
              {navItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={
                      active
                        ? "rounded-full bg-[#1C2B23] px-4 py-1.5 text-xs font-medium text-[#FAF9F6] transition"
                        : "rounded-full px-4 py-1.5 text-xs font-medium text-[#5C625B] transition hover:bg-[#E7E4DC] hover:text-[#1F2A24]"
                    }
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Przelacznik 3 Wydan */}
          <div className="flex items-center rounded-full border border-[#DDD8CD] bg-[#FAF9F6] p-1">
            {EDITIONS.map((ed) => {
              const active = edition === ed.id;
              return (
                <button
                  key={ed.id}
                  type="button"
                  onClick={() => setEdition(ed.id)}
                  className={
                    active
                      ? "rounded-full bg-[#C9734E] px-3.5 py-1 text-xs font-medium text-white transition"
                      : "rounded-full px-3.5 py-1 text-xs font-medium text-[#5C625B] transition hover:text-[#1F2A24]"
                  }
                >
                  {ed.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10">{children}</main>
    </div>
  );
}
