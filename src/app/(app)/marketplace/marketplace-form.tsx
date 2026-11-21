"use client";

import { useState } from "react";
import { ArrowUpRight, Handshake, LoaderCircle } from "lucide-react";
import type { MarketplaceActionState } from "./actions";
const inputClassName =
  "spatial-input mt-1.5 w-full";

export function MarketplaceForm({
  role = "owner",
}: {
  role?: "buyer" | "owner" | "agency";
}) {
  const [state, setState] = useState<MarketplaceActionState>({});
  const [pending, setPending] = useState(false);

  async function submitPin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setState({});
    const form = new FormData(event.currentTarget);
    const body = {
      action: "add_pin",
      title: String(form.get("title") ?? ""),
      city: String(form.get("city") ?? ""),
      description: String(form.get("description") ?? ""),
      pricePln: Number(form.get("pricePln")),
      areaM2: Number(form.get("areaM2")),
      rooms: Number(form.get("rooms")),
      lat: Number(form.get("lat")),
      lng: Number(form.get("lng")),
      pinType: String(form.get("pinType")),
      transactionType: String(form.get("transactionType")),
      contactPhone: String(form.get("contactPhone") ?? ""),
      contactEmail: String(form.get("contactEmail") ?? ""),
    };
    const response = await fetch("/api/checkout/five-dollars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json() as { simulated?: boolean; url?: string; error?: string };
    if (!response.ok) setState({ error: data.error ?? "Nie udało się uruchomić płatności." });
    else if (data.url) window.location.href = data.url;
    else if (data.simulated) setState({ success: "Tryb testowy 5$: pin został opublikowany na mapie." });
    setPending(false);
  }

  return (
    <aside className="card-lab h-fit p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="eyebrow">MARKETPLACE PIN</span>
          <h2 className="mt-2 text-lg font-medium text-slate-100">
            Dodaj ofertę do giełdy
          </h2>
        </div>
        <span className="dashboard-tile-icon">
          <Handshake className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-400">
        Utwórz pin widoczny na tablicy ofert bezpośrednich.
      </p>

      <form onSubmit={submitPin} className="mt-5 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
          <label className="block text-xs font-medium text-slate-300">
            Typ pinu
            <select
              className={inputClassName}
              name="pinType"
              defaultValue={role === "buyer" ? "buyer_request" : "owner_offer"}
            >
              {role !== "buyer" && <option value="owner_offer">Właściciel: Sprzedam / Wynajmę</option>}
              {role !== "owner" && <option value="buyer_request">Poszukujący: Kupię / Wynajmę</option>}
            </select>
          </label>
          <label className="block text-xs font-medium text-slate-300">
            Transakcja
            <select className={inputClassName} name="transactionType" defaultValue="sale">
              <option value="sale">Sprzedaż</option>
              <option value="rent">Wynajem</option>
            </select>
          </label>
        </div>
        <label className="block text-xs font-medium text-slate-300">
          Opis
          <textarea className={`${inputClassName} min-h-20 resize-y`} name="description" maxLength={2000} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-medium text-slate-300">
            Powierzchnia m²
            <input className={inputClassName} name="areaM2" type="number" min="1" />
          </label>
          <label className="block text-xs font-medium text-slate-300">
            Pokoje
            <input className={inputClassName} name="rooms" type="number" min="1" />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-medium text-slate-300">
            Szerokość geogr.
            <input className={inputClassName} name="lat" type="number" step="0.000001" placeholder="52.229676" />
          </label>
          <label className="block text-xs font-medium text-slate-300">
            Długość geogr.
            <input className={inputClassName} name="lng" type="number" step="0.000001" placeholder="21.012229" />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
          <label className="block text-xs font-medium text-slate-300">
            Telefon kontaktowy
            <input className={inputClassName} name="contactPhone" type="tel" />
          </label>
          <label className="block text-xs font-medium text-slate-300">
            E-mail kontaktowy
            <input className={inputClassName} name="contactEmail" type="email" />
          </label>
        </div>
        <label className="block text-xs font-medium text-slate-300">
          Tytuł oferty
          <input
            className={inputClassName}
            name="title"
            required
            maxLength={160}
            placeholder="np. Mieszkanie z widokiem na park"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
          <label className="block text-xs font-medium text-slate-300">
            Miasto
            <input
              className={inputClassName}
              name="city"
              required
              maxLength={100}
              placeholder="Warszawa"
            />
          </label>
          <label className="block text-xs font-medium text-slate-300">
            Cena (PLN)
            <input
              className={inputClassName}
              name="pricePln"
              required
              type="number"
              min="1"
              max="2147483647"
              step="1"
              placeholder="850000"
            />
          </label>
        </div>
        {state.error && (
          <p className="text-sm text-rose-300" role="alert">
            {state.error}
          </p>
        )}
        {state.success && (
          <p className="text-sm text-emerald-200" role="status">
            {state.success}
          </p>
        )}
        <button
          type="submit"
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-200 px-4 text-sm font-medium text-slate-950 transition hover:bg-indigo-100 disabled:cursor-wait disabled:opacity-60"
          disabled={pending}
        >
          {pending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          )}
          {pending ? "Przetwarzanie 5$…" : "Dodaj Pin za 5$"}
        </button>
      </form>
    </aside>
  );
}
