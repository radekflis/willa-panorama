"use client";

import React, { useRef, useState } from "react";
import { BiomimeticPropertyMap } from "./biomimetic-property-map";
import type { PropertyDetailData } from "./biomimetic-property-detail";
import { predictSuffix } from "./crystal-prediction";

export interface WorkspaceProperty extends PropertyDetailData {
  priceNumeric: number;
  priceShort: string;
  imageUrl: string;
  lat: number;
  lng: number;
}

const TYPES = ["dom", "mieszkanie", "działkę", "apartament"];
const LOCATIONS = ["w województwie pomorskim", "w dolnośląskim", "w mazowieckim", "nad jeziorem", "w górach"];

type Intent = "sell" | "buy" | "area" | "unknown";

function localIntent(text: string): Intent {
  const value = text.toLocaleLowerCase("pl");
  if (/sprzeda|sprzedaj|sprzedam/.test(value)) return "sell";
  if (/kup|szukam/.test(value)) return "buy";
  if (/okolic|otoczeni/.test(value)) return "area";
  return "unknown";
}

export function PropTechWorkspace(_props: { properties: WorkspaceProperty[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const restoreRef = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState("");
  const [scrollLeft, setScrollLeft] = useState(0);
  const [caretAtEnd, setCaretAtEnd] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [busy, setBusy] = useState(false);

  const ghost = caretAtEnd ? predictSuffix(query) : "";
  const typeMatch = query.match(/^(Sprzedaję|Kupuję)\s+(dom|mieszkanie|działkę|apartament)(?:\s|$)/i);
  const suggestions = typeMatch
    ? LOCATIONS
    : /^(Sprzedaję|Kupuję)\s/i.test(query)
      ? TYPES
      : ["Sprzedaję", "Kupuję", "Sprawdź okolicę"];

  function setText(value: string) {
    setQuery(value);
    setCaretAtEnd(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(value.length, value.length);
      setScrollLeft(inputRef.current?.scrollLeft ?? 0);
    });
  }

  function chooseSuggestion(value: string) {
    if (typeMatch) setText(`${typeMatch[1]} ${typeMatch[2]} ${value} `);
    else if (/^(Sprzedaję|Kupuję)\s/i.test(query)) setText(`${query.match(/^(Sprzedaję|Kupuję)/i)?.[0]} ${value} `);
    else setText(`${value} `);
  }

  async function submitQuery(event: React.FormEvent) {
    event.preventDefault();
    if (!query.trim() || busy) return;
    setMessage(null);
    let intent = localIntent(query);
    if (intent === "unknown") {
      setBusy(true);
      try {
        const response = await fetch("/api/ai/intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: query }),
          signal: AbortSignal.timeout(1500),
        });
        if (!response.ok) throw new Error(`Intent API: ${response.status}`);
        const result: { intent?: Intent } = await response.json();
        if (result.intent) intent = result.intent;
      } catch (error) {
        console.warn("Interpretacja AI niedostępna, użyto lokalnej:", error);
      } finally {
        setBusy(false);
      }
    }
    setMessage(intent === "unknown"
      ? "Nie rozpoznano intencji. Napisz, czy chcesz sprzedać, kupić lub sprawdzić okolicę."
      : "Obsługa tego zapytania zostanie podłączona w kolejnym etapie.");
  }

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-neutral-900">
      <BiomimeticPropertyMap onMapError={setMapError} />

      {minimized ? (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-20 -translate-x-1/2">
          <button ref={restoreRef} type="button" onClick={() => {
            setMinimized(false);
            requestAnimationFrame(() => inputRef.current?.focus());
          }} className="crystal-chip pointer-events-auto px-4 py-2 text-sm font-semibold" aria-label="Przywróć okno AI">AI +</button>
        </div>
      ) : (
        <div className="pointer-events-none fixed left-1/2 top-1/2 z-20 w-[86vw] max-w-[345px] -translate-x-1/2 -translate-y-1/2">
          <div className="pointer-events-none absolute bottom-full left-0 mb-3 flex max-h-[25dvh] w-full flex-wrap justify-center gap-2 overflow-y-auto">
            {suggestions.map((suggestion) => <button key={suggestion} type="button" className="crystal-chip pointer-events-auto px-2.5 py-1 text-[11px] font-medium" onClick={() => chooseSuggestion(suggestion)}>{suggestion}</button>)}
            {ghost && <button type="button" className="crystal-chip pointer-events-auto px-2.5 py-1 text-[11px]" onClick={() => setText(`${query}${ghost} `)} aria-label={`Uzupełnij: ${ghost}`}>↹ {ghost}</button>}
          </div>
          <div className="crystal-dialog pointer-events-auto relative flex min-h-[90px] max-h-[60dvh] flex-col gap-2 p-3.5">
            <button type="button" onClick={() => {
              setScrollLeft(0);
              setMinimized(true);
              requestAnimationFrame(() => restoreRef.current?.focus());
            }} aria-label="Minimalizuj okno AI" className="crystal-chip absolute right-3 top-3 z-10 px-2 py-1 text-sm leading-none">−</button>
            {(mapError || message) && <div className="min-h-0 overflow-y-auto pr-8 text-sm">
              {mapError && <p role="alert" className="mb-3">{mapError} <button type="button" className="underline" onClick={() => setMapError(null)}>Zamknij</button></p>}
              {message && <p role="status" className="mb-3">{message} <button type="button" className="underline" onClick={() => setMessage(null)}>Zamknij</button></p>}
            </div>}
            <form onSubmit={submitQuery} className="flex min-h-[80px] flex-col justify-between gap-2 pt-2">
              <div className="relative min-w-0 flex-1 overflow-hidden">
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre px-2 py-2 pr-8 text-xs" style={{ textShadow: "none" }}>
                  <div style={{ transform: `translateX(-${scrollLeft}px)` }}><span className="text-transparent">{query}</span><span className="text-white/55">{ghost}</span></div>
                </div>
                <input ref={inputRef} aria-label="Zapytaj AI o nieruchomość" autoComplete="off" maxLength={1000} value={query} onChange={(event) => { setQuery(event.target.value); setCaretAtEnd(event.target.selectionStart === event.target.value.length); }} onSelect={(event) => setCaretAtEnd(event.currentTarget.selectionStart === event.currentTarget.value.length && event.currentTarget.selectionEnd === event.currentTarget.value.length)} onScroll={(event) => setScrollLeft(event.currentTarget.scrollLeft)} onKeyDown={(event) => {
                  if (ghost && (event.key === "Tab" || event.key === "ArrowRight")) {
                    event.preventDefault();
                    setText(`${query}${ghost} `);
                  }
                }} placeholder="Jak możemy Ci pomóc?" className="relative w-full bg-transparent px-2 py-2 pr-8 text-xs text-white outline-none placeholder:text-white/80" />
              </div>
              <button type="submit" disabled={busy || !query.trim()} className="crystal-chip self-end px-3 py-1.5 text-xs font-semibold disabled:opacity-50">{busy ? "…" : "Go"}</button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
