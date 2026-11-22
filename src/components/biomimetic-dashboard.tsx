"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useEdition } from "@/components/edition-provider";

const PARAMS_8 = [
  { label: "Lokalizacja", value: "Borzygniew · 55-081" },
  { label: "Otoczenie", value: "Jezioro Mietkowskie / Masyw Ślęży" },
  { label: "Powierzchnia domu", value: "12 × 12 m · wolnostojący" },
  { label: "Działka", value: "10 arów · zalesiona" },
  { label: "Strefa przyrody", value: "Otulina Parku Krajobrazowego" },
  { label: "Dojazd", value: "Szybki dostęp do Wrocławia i A4" },
  { label: "Ogrzewanie", value: "Podłogowe akumulatorowe" },
  { label: "Potencjał 3D / AI", value: "Gotowy pod .ksplat i Studio 8K" },
];

const ZONES = [
  { id: "ogrod", title: "Ogród i starodrzew", tag: "STREFA 01", note: "Wybierz wizytówkę w Archiwum" },
  { id: "salon", title: "Salon i światło dzienne", tag: "STREFA 02", note: "Kliknij, aby otworzyć Studio AI" },
  { id: "otoczenie", title: "Jezioro i Masyw Ślęży", tag: "STREFA 03", note: "Warstwa satelitarna HD" },
  { id: "poddasze", title: "Poddasze i przestrzeń twórcza", tag: "STREFA 04", note: "Aranżacja promptem 2K/4K/8K" },
];

export function BiomimeticDashboard() {
  const { edition } = useEdition();
  const [deepDescription, setDeepDescription] = useState(
    "Dom w Borzygniewie (55-081) położony w bezpośrednim sąsiedztwie Jeziora Mietkowskiego oraz u podnóża Masywu Ślęży, w otulinie Parku Krajobrazowego Doliny Bystrzycy. Przestrzeń łączy prywatność zalesionej 10-arowej działki z szybkim dojazdem do Wrocławia.\n\nKliknij tutaj, aby edytować, rozszerzać lub kopiować pełny opis wygenerowany po głębokiej analizie zdjęć, wideo i danych satelitarnych."
  );
  const [locationPotential, setLocationPotential] = useState(
    "Analiza potencjału inwestycyjnego i przyrodniczego: mikroklimat jeziora, bezpośredni dostęp do szlaków pieszych i rowerowych Masywu Ślęży, rozwijająca się infrastruktura rekreacyjna oraz ograniczona podaż działek w otulinie parku krajobrazowego.\n\nTo okno służy do pełnej edycji, wycinania i kopiowania raportu lokalizacyjnego."
  );
  const [inquirySent, setInquirySent] = useState(false);

  return (
    <div className="space-y-10">
      {/* NAGLOWEK */}
      <section className="flex flex-col justify-between gap-6 border-b border-[#DDD8CD] pb-8 lg:flex-row lg:items-end">
        <div>
          <div className="font-mono-label text-[11px] text-[#626861]">
            {edition === "buyer" && "WYDANIE PUBLICZNE · DLA KUPUJĄCEGO"}
            {edition === "owner" && "WYDANIE WŁAŚCICIELA · CENTRUM STRUMIENIA DANYCH"}
            {edition === "agency" && "WYDANIE AGENCJI · WHITE-LABEL PORTFOLIO"}
          </div>
          <h1 className="font-editorial mt-2 text-4xl leading-[1.02] text-[#1F2A24] sm:text-5xl md:text-6xl">
            {edition === "buyer" ? (
              <>
                Dom w <span className="italic text-[#C9734E]">Borzygniewie.</span>
              </>
            ) : (
              <>
                Przestrzeń, która <span className="italic text-[#C9734E]">pracuje</span> dla Ciebie.
              </>
            )}
          </h1>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/properties"
            className="rounded-full bg-[#1C2B23] px-5 py-2.5 text-xs font-medium text-[#FAF9F6] transition hover:bg-[#2E4237]"
          >
            {edition === "buyer" ? "Otwórz Galerię i Spacer 3D →" : "Otwórz Archiwum Mediów →"}
          </Link>
          {edition !== "buyer" && (
            <Link
              href="/documents"
              className="rounded-full border border-[#DDD8CD] bg-[#FAF9F6] px-5 py-2.5 text-xs font-medium text-[#1F2A24] transition hover:bg-[#E7E4DC]"
            >
              Audytor Umów (OCR)
            </Link>
          )}
        </div>
      </section>

      {/* KARUZELA WIZYTOWKOWA STREF (POZIOMA) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-mono-label text-[11px] text-[#626861]">
            WIZYTÓWKA STREF · PRZESUWAJ W POZIOMIE
          </span>
          <Link href="/properties" className="text-xs font-medium text-[#C9734E] hover:underline">
            Otwórz Studio Aranżacji 2K/4K/8K →
          </Link>
        </div>
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
          {ZONES.map((z) => (
            <Link
              key={z.id}
              href="/properties"
              className="group min-w-[270px] flex-1 snap-start rounded-2xl border border-[#DDD8CD] bg-gradient-to-br from-[#FAF9F6] to-[#E7E4DC]/60 p-6 transition hover:border-[#C9734E]"
            >
              <div className="font-mono-label text-[10px] text-[#626861]">{z.tag}</div>
              <div className="font-editorial mt-10 text-2xl text-[#1F2A24] group-hover:text-[#C9734E]">
                {z.title}
              </div>
              <div className="mt-2 text-xs text-[#626861]">{z.note}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* 8 PARAMETROW NIERUCHOMOSCI */}
      <section className="rounded-2xl border border-[#DDD8CD] bg-[#FAF9F6] p-6 md:p-8">
        <div className="font-mono-label mb-5 text-[11px] text-[#626861]">
          08 KLUCZOWYCH PARAMETRÓW Z ANALIZY AI
        </div>
        <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          {PARAMS_8.map((p) => (
            <div key={p.label} className="border-t border-[#E7E4DC] pt-3">
              <div className="font-mono-label text-[10px] text-[#626861]">{p.label}</div>
              <div className="mt-1 text-sm font-medium text-[#1F2A24]">{p.value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* DWA DUZE EDYTOWALNE OKNA: OPIS + POTENCJAL LOKALIZACJI */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#DDD8CD] bg-[#FAF9F6] p-6">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono-label text-[11px] text-[#626861]">
              GŁĘBOKI OPIS NIERUCHOMOŚCI (EDYTOWALNY)
            </span>
            <span className="text-[11px] text-[#C9734E]">
              {edition === "buyer" ? "Podgląd oferty" : "Gotowy do edycji i kopii"}
            </span>
          </div>
          <textarea
            value={deepDescription}
            onChange={(e) => setDeepDescription(e.target.value)}
            readOnly={edition === "buyer"}
            rows={8}
            className="w-full rounded-xl border border-[#E7E4DC] bg-white p-4 text-sm leading-relaxed text-[#1F2A24] focus:border-[#C9734E] focus:outline-none"
          />
        </div>

        <div className="rounded-2xl border border-[#DDD8CD] bg-[#FAF9F6] p-6">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono-label text-[11px] text-[#626861]">
              POTENCJAŁ LOKALIZACJI I WALORY INWESTYCYJNE
            </span>
            <span className="text-[11px] text-[#C9734E]">Analiza zewnętrzna + satelita</span>
          </div>
          <textarea
            value={locationPotential}
            onChange={(e) => setLocationPotential(e.target.value)}
            readOnly={edition === "buyer"}
            rows={8}
            className="w-full rounded-xl border border-[#E7E4DC] bg-white p-4 text-sm leading-relaxed text-[#1F2A24] focus:border-[#C9734E] focus:outline-none"
          />
        </div>
      </section>

      {/* WYRAZNY PODZIAL KONCOWY: FORMULARZ (TYLKO KUPUJACY) VS NARZEDZIA SPRZEDAWCY (WLASCICIEL/AGENCJA) */}
      {edition === "buyer" ? (
        <section className="rounded-2xl border border-[#DDD8CD] bg-[#FAF9F6] p-6 md:p-8">
          <div className="font-mono-label text-[11px] text-[#626861]">
            KONTAKT BEZPOŚREDNI Z WŁAŚCICIELEM
          </div>
          <h2 className="font-editorial mt-2 text-3xl text-[#1F2A24]">
            Umów prywatną prezentację lub zadaj pytanie.
          </h2>
          {inquirySent ? (
            <p className="mt-4 text-sm font-medium text-[#1C2B23]">
              Dziękujemy — zapytanie trafiło bezpośrednio do skrzynki Właściciela.
            </p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setInquirySent(true);
              }}
              className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2"
            >
              <input
                required
                placeholder="Twoje imię i nazwisko"
                className="rounded-xl border border-[#DDD8CD] bg-white px-4 py-3 text-sm"
              />
              <input
                required
                type="email"
                placeholder="Adres e-mail lub telefon"
                className="rounded-xl border border-[#DDD8CD] bg-white px-4 py-3 text-sm"
              />
              <textarea
                required
                rows={3}
                placeholder="Wiadomość lub proponowany termin wizyty..."
                className="rounded-xl border border-[#DDD8CD] bg-white px-4 py-3 text-sm md:col-span-2"
              />
              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="rounded-full bg-[#C9734E] px-6 py-3 text-xs font-medium text-white transition hover:bg-[#B5623F]"
                >
                  Wyślij zapytanie do Właściciela →
                </button>
              </div>
            </form>
          )}
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Link
            href="/properties"
            className="rounded-2xl border border-[#DDD8CD] bg-[#FAF9F6] p-6 transition hover:border-[#C9734E]"
          >
            <div className="font-mono-label text-[10px] text-[#626861]">01 · MEDIA & FABRIC.JS</div>
            <div className="font-editorial mt-3 text-2xl text-[#1F2A24]">
              Archiwum i Studio 2K/4K/8K
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[#626861]">
              Import z Google Drive i dysku lokalnego, wyszukiwanie po treści („Jodła”) i szybka aranżacja promptem.
            </p>
          </Link>

          <Link
            href="/documents"
            className="rounded-2xl border border-[#DDD8CD] bg-[#FAF9F6] p-6 transition hover:border-[#C9734E]"
          >
            <div className="font-mono-label text-[10px] text-[#626861]">02 · PRAWO PL / EU</div>
            <div className="font-editorial mt-3 text-2xl text-[#1F2A24]">
              Kreator i Audytor Umów OCR
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[#626861]">
              Wklej treść lub wgraj trudny plik (Tesseract OCR) i sprawdź ryzyka prawne przed podpisaniem.
            </p>
          </Link>

          <Link
            href="/inbox"
            className="rounded-2xl border border-[#DDD8CD] bg-[#FAF9F6] p-6 transition hover:border-[#C9734E]"
          >
            <div className="font-mono-label text-[10px] text-[#626861]">03 · MARKETING & LEADY</div>
            <div className="font-editorial mt-3 text-2xl text-[#1F2A24]">
              Skrzynka i Metadane Ads/SEO
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[#626861]">
              Obsługa zapytań kupujących, gotowe posty FB oraz paczki słów kluczowych pod Google Ads.
            </p>
          </Link>
        </section>
      )}
    </div>
  );
}
