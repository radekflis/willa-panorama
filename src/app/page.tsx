import Link from "next/link";
import { ArrowRight, Bot, Building2, FileCheck2, Move3d, ShieldCheck } from "lucide-react";

export default function HomePage() {
  return (
    <main className="luxury-shell">
      <nav className="luxury-nav" aria-label="Główna nawigacja">
        <Link href="/" className="luxury-brand" aria-label="Willa Panorama — strona główna">
          <span className="brand-mark">WP</span>
          <span>WILLA PANORAMA</span>
        </Link>
        <div className="luxury-nav-links">
          <Link href="/gielda">Giełda</Link>
          <Link href="/nieruchomosci">Właściciele</Link>
          <Link href="/studio">Studio AI</Link>
        </div>
        <Link href="/dashboard" className="nav-action">Przejdź do platformy <ArrowRight size={16} /></Link>
      </nav>

      <section className="hero-section">
        <div className="hero-orbit hero-orbit-one" />
        <div className="hero-orbit hero-orbit-two" />
        <div className="hero-copy">
          <p className="eyebrow"><span /> NOWA ERA SPRZEDAŻY NIERUCHOMOŚCI</p>
          <h1>Zawsze ktoś może być najlepszy.<br /><em>Dlaczego nie my?</em></h1>
          <p className="hero-lead">
            Sprzedawaj bez pośredników. Prezentuj w 3D, oceniaj mieszkanie z AI
            i prowadź transakcję na własnych zasadach — bez prowizji.
          </p>
          <div className="hero-actions">
            <Link href="/register" className="button-primary">Otwórz konto <ArrowRight size={18} /></Link>
            <Link href="/dashboard" class="button-secondary">Wejdź do studia</Link>
          </div>
          <div className="hero-proof">
            <div><strong>0%</strong><span>prowizji</span></div>
            <div><strong>24/7</strong><span>Studio AI</span></div>
            <div><strong>3D</strong><span>od pierwszego spojrzenia</span></div>
          </div>
        </div>

        <div className="hero-visual" aria-label="Wizualizacja platformy Willa Panorama">
          <div className="visual-frame">
            <div className="visual-glow" />
            <div className="property-card">
              <div className="property-topline"><span>WILLA / PANORAMA</span><span>01 — 03</span></div>
              <div className="property-view">
                <div className="sun-disc" />
                <div className="horizon" />
                <div className="villa">
                  <div className="villa-roof" />
                  <div className="villa-body"><i /><i /><i /></div>
                  <div className="pool" />
                </div>
              </div>
              <div className="property-meta">
                <div><span>REZYDENCJA PREMIUM</span><strong>Panorama 360°</strong></div>
                <div className="live-badge"><span /> LIVE</div>
              </div>
            </div>
          </div>
          <div className="floating-chip chip-ai"><Bot size={17} /><span><b>AI Concierge</b>Gotowy do analizy</span></div>
          <div className="floating-chip chip-secure"><ShieldCheck size={17} /><span><b>Bezpieczna oferta</b>Weryfikacja aktywna</span></div>
        </div>
      </section>

      <section className="capabilities" aria-label="Najważniejsze funkcje">
        <article><Move3d /><span>01</span><h2>Prezentacja 3D</h2><p>Spacer, zdjęcia HDR i angażująca wizualizacja.</p></article>
        <article><Bot /><span>02</span><h2>Asystent AI</h2><p>Wycena, opis oferty i analiza potencjału nieruchomości.</p></article>
        <article><FileCheck2 /><span>03</span><h2>Dokumenty</h2><p>Warunki, umowy i audyt treści bez chaosu.</p></article>
        <article><Building2 /><span>04</span><h2>Giełda 0%</h2><p>Bezpośredni dostęp do kupujących i sprzedających.</p></article>
      </section>
    </main>
  );
}
