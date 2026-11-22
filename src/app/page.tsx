import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#F3F1EC] text-[#1F2A24] selection:bg-[#9E7458]/20">
      <div className="mx-auto max-w-6xl px-6 py-12 md:px-12 md:py-16">
        {/* HERO */}
        <section className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <div className="font-mono-label mb-8 flex items-center gap-3 text-[11px] text-[#7A7E76]">
              <span className="inline-block h-px w-6 bg-[#B9B3A5]" />
              <span>BORZYGNIEW · 55-081</span>
            </div>

            <h1 className="font-editorial text-6xl leading-[0.96] tracking-tight text-[#1F2A24] sm:text-7xl md:text-[84px]">
              Najpierw
              <br />
              zobacz{" "}
              <span className="italic text-[#9E7458] font-normal">dom.</span>
            </h1>

            <p className="mt-8 max-w-md text-[15px] leading-relaxed text-[#5C625B]">
              Dwie drogi do materiałów pilotażowych: obejrzyj krótki spacer po
              wybranych kadrach albo przejdź do prywatnej przestrzeni właściciela
              i agencji.
            </p>

            <div className="mt-8 flex items-center gap-2.5 text-xs text-[#7A7E76]">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className="shrink-0"
              >
                <rect x="4" y="11" width="16" height="9" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
              <span>Prywatne materiały nie są częścią publicznego podglądu.</span>
            </div>
          </div>

          {/* KARTA ARCHITEKTONICZNA */}
          <div className="lg:col-span-6">
            <div className="relative flex min-h-[340px] flex-col justify-between bg-[#E7E4DC] p-7 md:min-h-[380px] md:p-9">
              <div className="font-mono-label text-[10px] leading-relaxed text-[#7A7E76]">
                <div>ARCHIWUM</div>
                <div>01 / 02</div>
              </div>

              <div className="my-4 flex items-center justify-center">
                <svg
                  viewBox="0 0 360 210"
                  fill="none"
                  className="w-full max-w-[340px] text-[#3E4C42]"
                >
                  <circle cx="290" cy="56" r="34" stroke="#C8C2B4" strokeWidth="1.2" />
                  <path d="M126 116 L186 64 L246 116" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M186 64 L186 44 M176 44 L196 44" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M138 106 L138 172 M234 106 L234 172" stroke="currentColor" strokeWidth="1.3" />
                  <rect x="155" y="130" width="22" height="32" stroke="currentColor" strokeWidth="1.1" />
                  <path d="M160 140 H172 M160 148 H172 M160 156 H172" stroke="currentColor" strokeWidth="1" />
                  <rect x="197" y="130" width="24" height="22" stroke="currentColor" strokeWidth="1.1" />
                  <path d="M112 172 C112 142, 130 142, 130 172" stroke="currentColor" strokeWidth="1.1" />
                  <path d="M242 172 C242 138, 266 138, 266 172" stroke="currentColor" strokeWidth="1.1" />
                  <path d="M84 180 Q180 156 276 178" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M96 188 Q186 172 268 184" stroke="#9B968A" strokeWidth="1" />
                </svg>
              </div>

              <div className="font-mono-label flex items-center justify-between text-[10px] text-[#7A7E76]">
                <span>DOM I JEGO OTOCZENIE</span>
                <span>55-081</span>
              </div>
            </div>
          </div>
        </section>

        {/* DWIE KARTY NA DOLE */}
        <section className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* 01 */}
          <Link
            href="/marketplace"
            className="group flex min-h-[290px] flex-col justify-between bg-[#E7E4DC] p-8 transition-colors hover:bg-[#DFDBD1] md:p-10"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono-label text-[11px] text-[#7A7E76]">01</span>
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#C9C3B6] text-[#1F2A24] transition-transform group-hover:scale-105">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <polygon points="6 4 20 12 6 20 6 4" />
                  </svg>
                </span>
              </div>

              <div className="font-mono-label mt-8 flex items-center gap-3 text-[10px] text-[#7A7E76]">
                <span className="inline-block h-px w-5 bg-[#B9B3A5]" />
                <span>DLA KUPUJĄCYCH · PODGLĄD</span>
              </div>

              <h2 className="font-editorial mt-4 text-4xl leading-[1.04] text-[#1F2A24] sm:text-[42px]">
                Zobacz spacer
                <br />
                <span className="italic text-[#9E7458] font-normal">foto-wideo.</span>
              </h2>

              <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#5C625B]">
                Odkryj wybrane kadry, globalną mapę ofert oraz prezentację
                nieruchomości i jej otoczenia.
              </p>
            </div>

            <div className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-[#1F2A24]">
              <span>Otwórz prezentację</span>
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </div>
          </Link>

          {/* 02 */}
          <Link
            href="/properties"
            className="group flex min-h-[290px] flex-col justify-between border border-[#DDD8CD] bg-[#F7F5F0] p-8 transition-colors hover:bg-[#EFECE4] md:p-10"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono-label text-[11px] text-[#7A7E76]">02</span>
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D4CFC3] text-[#1F2A24] transition-transform group-hover:scale-105">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
                  </svg>
                </span>
              </div>

              <div className="font-mono-label mt-8 flex items-center gap-3 text-[10px] text-[#7A7E76]">
                <span className="inline-block h-px w-5 bg-[#B9B3A5]" />
                <span>DLA WŁAŚCICIELI I AGENCJI</span>
              </div>

              <h2 className="font-editorial mt-4 text-4xl leading-[1.04] text-[#1F2A24] sm:text-[42px]">
                Wejdź do
                <br />
                <span className="italic text-[#9E7458] font-normal">
                  prywatnego archiwum.
                </span>
              </h2>

              <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#5C625B]">
                Zaloguj się, aby otworzyć biblioteki mediów, dodawać materiały,
                uruchamiać analizę AI i Studio Aranżacji.
              </p>
            </div>

            <div className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-[#1F2A24]">
              <span>Zaloguj się</span>
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </div>
          </Link>
        </section>
      </div>
    </main>
  );
}
