import Link from "next/link";

export default function Page() {
  return (
    <ModulePage
      title="Nieruchomości"
      description="Zarządzaj ofertami, zdjęciami i publikacją kart nieruchomości."
    />
  );
}

function ModulePage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-4 border-b border-[#EAEAEA] pb-6">
        <Link
          href="/dashboard"
          className="w-fit text-sm font-medium text-[#6B0F1A] hover:underline"
        >
          ← Powrót do pulpitu
        </Link>
        <div className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-[#6B0F1A]">
            Willa Panorama · Moduł
          </span>
          <h1 className="text-3xl font-semibold tracking-[-0.02em] text-[#111111]">
            {title}
          </h1>
          <p className="text-sm text-[#525252]">{description}</p>
        </div>
      </header>
      <section
        aria-label={`Obszar modułu ${title}`}
        className="card-lab min-h-64 p-6"
      >
        <h2 className="text-base font-semibold">Obszar roboczy</h2>
        <p className="mt-2 text-sm text-[#525252]">
          Moduł jest gotowy do dalszej rozbudowy.
        </p>
      </section>
    </main>
  );
}
