"use client";

import { useRef, useState } from "react";
import {
  Check,
  FileImage,
  FileText,
  LoaderCircle,
  ScanText,
  Upload,
} from "lucide-react";

const templates = [
  {
    name: "Umowa przedwstępna",
    category: "TRANSAKCJA · PL / UE",
    description: "Uzgodnienia stron przed zawarciem umowy sprzedaży.",
  },
  {
    name: "Umowa rezerwacyjna",
    category: "REZERWACJA · PL / UE",
    description: "Warunki czasowej rezerwacji nieruchomości.",
  },
  {
    name: "Najem okazjonalny",
    category: "NAJEM · PL",
    description: "Dokumenty do najmu okazjonalnego lokalu.",
  },
  {
    name: "Pośrednictwo 0%",
    category: "POŚREDNICTWO · PL / UE",
    description: "Ustalenia współpracy przy sprzedaży bez prowizji.",
  },
  {
    name: "Protokół zdawczo-odbiorczy",
    category: "PRZEKAZANIE · PL / UE",
    description: "Stan lokalu, wyposażenie i odczyty liczników.",
  },
] as const;

type OcrFile = {
  id: string;
  file: File;
  status: "ready" | "processing" | "done" | "error";
  text?: string;
  error?: string;
};

const maxFileSize = 12 * 1024 * 1024;
const maxPdfPages = 8;

export function DocumentsWorkspace() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [files, setFiles] = useState<OcrFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState("");

  function addFiles(incomingFiles: File[]) {
    setFileError("");
    const accepted: OcrFile[] = [];

    incomingFiles.forEach((file) => {
      if (file.type !== "application/pdf" && !file.type.startsWith("image/")) {
        setFileError("Dodaj plik PDF lub obraz.");
      } else if (file.size > maxFileSize) {
        setFileError("Maksymalny rozmiar pojedynczego pliku to 12 MB.");
      } else {
        accepted.push({
          id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
          file,
          status: "ready",
        });
      }
    });

    if (accepted.length) setFiles((current) => [...current, ...accepted]);
  }

  async function runOcr(id: string) {
    const entry = files.find((item) => item.id === id);
    if (!entry || entry.status === "processing") return;

    setFiles((current) =>
      current.map((item) =>
        item.id === id ? { ...item, status: "processing", error: undefined } : item,
      ),
    );

    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("pol+eng");
      try {
        let text: string;
        if (entry.file.type === "application/pdf") {
          text = await extractPdfText(entry.file, worker);
        } else {
          const result = await worker.recognize(entry.file);
          text = result.data.text.trim();
        }

        setFiles((current) =>
          current.map((item) =>
            item.id === id ? { ...item, status: "done", text } : item,
          ),
        );
      } finally {
        await worker.terminate();
      }
    } catch (error) {
      console.error("Document OCR failed:", error);
      setFiles((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                status: "error",
                error:
                  error instanceof Error
                    ? error.message
                    : "Nie udało się odczytać pliku. Spróbuj ponownie.",
              }
            : item,
        ),
      );
    }
  }

  return (
    <div className="space-y-7">
      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <span className="eyebrow">01 / CONTRACT LIBRARY</span>
            <h2 className="mt-2 text-lg font-medium text-slate-100">
              Wybierz szablon umowy
            </h2>
          </div>
          {selectedTemplate && (
            <span className="hidden items-center gap-1.5 text-xs text-emerald-200 sm:flex">
              <Check className="h-4 w-4" aria-hidden="true" />
              Wybrano: {selectedTemplate}
            </span>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {templates.map((template, index) => {
            const active = selectedTemplate === template.name;
            return (
              <button
                key={template.name}
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedTemplate(template.name)}
                className={`template-card ${active ? "template-card-active" : ""}`}
              >
                <span className="flex items-center justify-between">
                  <span className="template-number">0{index + 1}</span>
                  <FileText className="h-4 w-4 text-indigo-200" aria-hidden="true" />
                </span>
                <span className="mt-5 block text-left text-sm font-medium leading-snug text-slate-100">
                  {template.name}
                </span>
                <span className="mt-2 block text-left font-mono text-[9px] tracking-wide text-slate-500">
                  {template.category}
                </span>
                <span className="mt-3 block text-left text-xs leading-relaxed text-slate-400">
                  {template.description}
                </span>
                {active && (
                  <span className="mt-4 inline-flex items-center gap-1.5 text-xs text-indigo-200">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    Szablon wybrany
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div>
          <span className="eyebrow">02 / DOCUMENT SCANNER</span>
          <h2 className="mt-2 text-lg font-medium text-slate-100">
            Odczyt dokumentu
          </h2>
          <input
            ref={fileInput}
            type="file"
            accept="application/pdf,image/*"
            multiple
            className="sr-only"
            aria-label="Wybierz pliki PDF lub zdjęcia do OCR"
            onChange={(event) => {
              addFiles(Array.from(event.currentTarget.files ?? []));
              event.currentTarget.value = "";
            }}
          />
          <button
            type="button"
            className={`ocr-dropzone mt-4 ${dragging ? "ocr-dropzone-active" : ""}`}
            onClick={() => fileInput.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              addFiles(Array.from(event.dataTransfer.files));
            }}
          >
            <span className="ocr-drop-icon">
              <Upload className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="mt-4 block text-sm font-medium text-slate-100">
              Przeciągnij plik tutaj
            </span>
            <span className="mt-1 block text-xs text-slate-400">
              lub wybierz PDF albo zdjęcie z urządzenia
            </span>
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200">
              <ScanText className="h-3.5 w-3.5" aria-hidden="true" />
              Wybierz dokument
            </span>
            <span className="mt-3 block text-[10px] text-slate-500">
              OCR działa lokalnie w przeglądarce · limit 12 MB na plik
            </span>
          </button>
          {fileError && (
            <p className="mt-3 text-sm text-rose-300" role="alert">
              {fileError}
            </p>
          )}
        </div>

        <div className="card-lab min-h-52 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="eyebrow">OCR QUEUE</span>
              <h3 className="mt-1 text-sm font-medium text-slate-100">
                Pliki do odczytu
              </h3>
            </div>
            <span className="rounded-full border border-white/10 px-2.5 py-1 font-mono text-[10px] text-slate-300">
              {files.length} {files.length === 1 ? "plik" : "plików"}
            </span>
          </div>
          {files.length === 0 ? (
            <p className="mt-8 text-sm text-slate-500">
              Dodane pliki i wyniki OCR pojawią się w tym panelu.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {files.map((entry) => (
                <article
                  key={entry.id}
                  className="rounded-xl border border-white/10 bg-white/[0.025] p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {entry.file.type === "application/pdf" ? (
                        <FileText className="h-4 w-4 shrink-0 text-indigo-200" />
                      ) : (
                        <FileImage className="h-4 w-4 shrink-0 text-cyan-200" />
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-medium text-slate-200">
                          {entry.file.name}
                        </span>
                        <span className="mt-1 block text-[10px] text-slate-500">
                          {(entry.file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </span>
                    </div>
                    {entry.status === "ready" && (
                      <button
                        type="button"
                        className="rounded-lg border border-indigo-200/20 bg-indigo-300/10 px-3 py-1.5 text-xs text-indigo-100 transition hover:bg-indigo-300/20"
                        onClick={() => void runOcr(entry.id)}
                      >
                        Uruchom OCR
                      </button>
                    )}
                    {entry.status === "processing" && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-cyan-200">
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                        Odczyt…
                      </span>
                    )}
                    {entry.status === "done" && (
                      <span className="text-xs text-emerald-200">Odczytano</span>
                    )}
                  </div>
                  {entry.error && (
                    <p className="mt-2 text-xs text-rose-300" role="alert">
                      {entry.error}
                    </p>
                  )}
                  {entry.text !== undefined && (
                    <textarea
                      readOnly
                      aria-label={`Wynik OCR: ${entry.file.name}`}
                      className="spatial-input mt-3 min-h-28 resize-y font-mono text-xs leading-relaxed"
                      value={entry.text || "Nie znaleziono tekstu w pliku."}
                    />
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

async function extractPdfText(file: File, worker: import("tesseract.js").Worker) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  const pdfDocument = await pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
  }).promise;

  try {
    if (pdfDocument.numPages > maxPdfPages) {
      throw new Error(`OCR obsługuje maksymalnie ${maxPdfPages} stron jednego PDF-a.`);
    }

    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
      const page = await pdfDocument.getPage(pageNumber);
      const content = await page.getTextContent();
      const embeddedText = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .trim();

      if (embeddedText.length > 20) {
        pages.push(embeddedText);
        continue;
      }

      const originalViewport = page.getViewport({ scale: 1 });
      const scale = Math.min(1.35, 2200 / Math.max(originalViewport.width, originalViewport.height));
      const viewport = page.getViewport({ scale });
      const canvas = window.document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Nie udało się przygotować obrazu strony PDF.");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvasContext: context, viewport }).promise;
      const { data } = await worker.recognize(canvas);
      pages.push(data.text.trim());
      canvas.width = 0;
      canvas.height = 0;
    }

    return pages
      .map((text, index) => `— Strona ${index + 1} —\n${text}`)
      .join("\n\n");
  } finally {
    await pdfDocument.destroy();
  }
}
