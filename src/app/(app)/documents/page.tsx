import { DocumentsWorkspace } from "./documents-workspace";

export default function DocumentsPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-5 py-10 sm:px-8 sm:py-12">
      <header className="border-b border-white/10 pb-6">
        <span className="eyebrow">WILLA PANORAMA · DOCUMENT SYSTEMS</span>
        <h1 className="mt-3 text-3xl font-medium tracking-tight text-white">
          Dokumenty i OCR
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Wybierz szablon albo odczytaj treść pliku w lokalnym procesie OCR.
        </p>
      </header>
      <DocumentsWorkspace />
    </main>
  );
}
