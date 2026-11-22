"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clipboard, Scissors, Save, Sparkles } from "lucide-react";
import type { PropertyParameter } from "@/db/schema";

const parameterNames = [
  "Powierzchnia domu",
  "Powierzchnia ogrodu",
  "Ekspozycja",
  "Stan techniczny",
  "Standard wykończenia",
  "Prywatność",
  "Zieleń i drzewa",
  "Otoczenie i widoki",
];

function initialParameters(parameters: PropertyParameter[]) {
  return parameterNames.map((name, index) => parameters[index] ?? {
    name,
    value: "Nie ustalono",
    description: "Uruchom analizę lub uzupełnij ręcznie.",
  });
}

export function PropertyAnalysisPanel({
  propertyId,
  richHighlights: initialHighlights,
  locationPotential: initialLocationPotential,
  parametersJson: initialParameterData,
}: {
  propertyId: string;
  richHighlights: string | null;
  locationPotential: string | null;
  parametersJson: PropertyParameter[];
}) {
  const router = useRouter();
  const [richHighlights, setRichHighlights] = useState(initialHighlights ?? "");
  const [locationPotential, setLocationPotential] = useState(initialLocationPotential ?? "");
  const [parameters, setParameters] = useState(initialParameters(initialParameterData));
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    setRichHighlights(initialHighlights ?? "");
    setLocationPotential(initialLocationPotential ?? "");
    setParameters(initialParameters(initialParameterData));
  }, [initialHighlights, initialLocationPotential, initialParameterData]);

  async function save() {
    setPending(true);
    setMessage("");
    setError(false);
    try {
      const response = await fetch(`/api/properties/${propertyId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation: "save",
          richHighlights,
          locationPotential,
          parametersJson: parameters,
        }),
        signal: AbortSignal.timeout(15_000),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Nie udało się zapisać analizy.");
      setMessage("Analiza została zapisana.");
    } catch (reason) {
      setError(true);
      setMessage(reason instanceof Error ? reason.message : "Nie udało się zapisać analizy.");
    } finally {
      setPending(false);
    }
  }

  async function analyze() {
    setPending(true);
    setMessage("Analizuję materiały i przygotowuję opisy…");
    setError(false);
    try {
      const response = await fetch(`/api/properties/${propertyId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation: "analyze" }),
        signal: AbortSignal.timeout(45_000),
      });
      const result = await response.json() as {
        richHighlights?: string;
        locationPotential?: string;
        parametersJson?: PropertyParameter[];
        error?: string;
      };
      if (!response.ok) throw new Error(result.error ?? "Analiza nie powiodła się.");
      setRichHighlights(result.richHighlights ?? "");
      setLocationPotential(result.locationPotential ?? "");
      setParameters(initialParameters(result.parametersJson ?? []));
      setMessage("Analiza gotowa. Sprawdź treści i zapisz zmiany.");
      router.refresh();
    } catch (reason) {
      setError(true);
      setMessage(reason instanceof Error ? reason.message : "Analiza nie powiodła się.");
    } finally {
      setPending(false);
    }
  }

  async function copyText(value: string, cut?: () => void) {
    try {
      await navigator.clipboard.writeText(value);
      cut?.();
      setMessage(cut ? "Tekst skopiowano i wycięto z pola." : "Tekst skopiowano.");
      setError(false);
    } catch {
      setMessage("Schowek jest niedostępny w tej przeglądarce.");
      setError(true);
    }
  }

  function updateParameter(index: number, patch: Partial<PropertyParameter>) {
    setParameters((current) => current.map((item, currentIndex) =>
      currentIndex === index ? { ...item, ...patch } : item));
  }

  return (
    <section className="space-y-5" aria-label="Głęboka analiza nieruchomości">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="eyebrow">GŁĘBOKA ANALIZA AI</span>
          <h3 className="mt-1 text-lg font-medium text-white">Atuty i potencjał nieruchomości</h3>
        </div>
        <button type="button" onClick={() => void analyze()} disabled={pending}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-cyan-200/20 bg-cyan-200/10 px-4 text-sm text-cyan-100 hover:bg-cyan-200/15 disabled:opacity-50">
          <Sparkles className="h-4 w-4" /> {pending ? "Pracuję…" : "Analizuj media"}
        </button>
      </header>

      <div className="grid gap-4 xl:grid-cols-2">
        <EditorPanel label="Najważniejsze atuty nieruchomości" value={richHighlights}
          onChange={setRichHighlights} onCopy={() => void copyText(richHighlights)}
          onCut={() => void copyText(richHighlights, () => setRichHighlights(""))} />
        <EditorPanel label="Potencjał lokalizacji" value={locationPotential}
          onChange={setLocationPotential} onCopy={() => void copyText(locationPotential)}
          onCut={() => void copyText(locationPotential, () => setLocationPotential(""))} />
      </div>

      <div className="rounded-2xl border border-[#DDD8CD] bg-[#05070B]/70 p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <span className="eyebrow">PARAMETRY Z ANALIZY</span>
            <h4 className="mt-1 font-medium text-white">8 parametrów domu, ogrodu i otoczenia</h4>
          </div>
          <span className="font-mono text-xs text-cyan-200">08 / 08</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {parameters.map((parameter, index) => (
            <label key={parameterNames[index]} className="rounded-xl border border-[#DDD8CD] bg-[#FAF9F6] border border-[#DDD8CD] shadow-[0_8px_30px_rgba(28,43,35,0.04)] p-3">
              <span className="text-xs text-slate-400">{parameterNames[index]}</span>
              <input value={parameter.value} onChange={(event) => updateParameter(index, { value: event.target.value })}
                className="mt-2 w-full border-b border-[#DDD8CD] bg-transparent pb-1 text-sm font-medium text-white outline-none focus:border-cyan-200/50" />
              <textarea value={parameter.description} onChange={(event) => updateParameter(index, { description: event.target.value })}
                rows={2} className="mt-2 w-full resize-y bg-transparent text-xs leading-relaxed text-slate-400 outline-none focus:text-slate-200" />
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role={error ? "alert" : "status"} className={`text-xs ${error ? "text-rose-300" : "text-slate-400"}`}>{message}</p>
        <button type="button" onClick={() => void save()} disabled={pending}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-200 px-4 text-sm font-semibold text-slate-950 hover:bg-indigo-100 disabled:opacity-50">
          <Save className="h-4 w-4" /> Zapisz analizę
        </button>
      </div>
    </section>
  );
}

function EditorPanel({
  label,
  value,
  onChange,
  onCopy,
  onCut,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onCopy: () => void;
  onCut: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#DDD8CD] bg-[#05070B]/70">
      <div className="flex items-center justify-between gap-2 border-b border-[#DDD8CD] px-4 py-3">
        <h4 className="text-sm font-medium text-slate-100">{label}</h4>
        <div className="flex gap-1">
          <button type="button" onClick={onCopy} aria-label={`Kopiuj: ${label}`}
            className="rounded-lg p-2 text-slate-400 hover:bg-[#FAF9F6] border border-[#DDD8CD] shadow-[0_8px_30px_rgba(28,43,35,0.04)] hover:text-white"><Clipboard className="h-4 w-4" /></button>
          <button type="button" onClick={onCut} aria-label={`Wytnij: ${label}`}
            className="rounded-lg p-2 text-slate-400 hover:bg-[#FAF9F6] border border-[#DDD8CD] shadow-[0_8px_30px_rgba(28,43,35,0.04)] hover:text-white"><Scissors className="h-4 w-4" /></button>
        </div>
      </div>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} maxLength={30_000}
        aria-label={label} placeholder="Uruchom analizę AI albo wpisz własny tekst…"
        className="min-h-72 w-full resize-y bg-transparent p-4 text-sm leading-7 text-slate-200 outline-none placeholder:text-slate-600 focus:bg-[#FAF9F6] border border-[#DDD8CD] shadow-[0_8px_30px_rgba(28,43,35,0.04)]" />
    </div>
  );
}
