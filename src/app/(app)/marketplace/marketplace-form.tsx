"use client";

import { useActionState } from "react";
import { ArrowUpRight, Handshake, LoaderCircle } from "lucide-react";
import { createMarketplacePinAction, type MarketplaceActionState } from "./actions";

const initialState: MarketplaceActionState = {};
const inputClassName =
  "spatial-input mt-1.5 w-full";

export function MarketplaceForm() {
  const [state, formAction, pending] = useActionState(
    createMarketplacePinAction,
    initialState,
  );

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

      <form action={formAction} className="mt-5 space-y-4">
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
          {pending ? "Zapisywanie…" : "Dodaj pin"}
        </button>
      </form>
    </aside>
  );
}
