import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="bg-grid-lab flex min-h-screen flex-col items-center justify-center px-6 py-24 text-center">
      <div className="card-lab flex max-w-2xl flex-col items-center gap-6 p-10 sm:p-14">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#EAEAEA] bg-white px-4 py-1.5 font-mono text-xs uppercase tracking-wider text-[#111111]">
          <span className="h-2 w-2 rounded-full bg-[#6B0F1A]" />
          Willa Panorama · 0% Prowizji
        </span>
        <h1 className="text-4xl font-semibold tracking-[-0.02em] text-[#111111] sm:text-5xl">
          Sprzedaj nieruchomość bezpośrednio z AI i 3D
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-[#525252]">
          Kompresja zdjęć HDR, spacer 3D Gaussian Splatting, analiza lokalizacji
          PostGIS, darmowy OCR umów i Giełda Bezpośrednia 0%.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link href="/register">
            <Button variant="primary" size="lg">
              Załóż konto (5 kredytów gratis)
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="secondary" size="lg">
              Przejdź do pulpitu
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
