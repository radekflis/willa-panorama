"use client";

import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Coins, Sparkles } from "lucide-react";

type Plan = "free" | "start" | "autopilot" | "agency" | "owner";

const plans: {
  id: Plan;
  name: string;
  descriptor: string;
  detail: string;
  accent: string;
}[] = [
  {
    id: "owner",
    name: "Pakiet Właściciel Bezpośredni",
    descriptor: "WŁAŚCICIEL",
    detail: "Bezpośrednie zarządzanie ofertami i kontaktami za 5$ / 20 PLN.",
    accent: "plan-accent-start",
  },
  {
    id: "agency",
    name: "Pakiet Agencja Marka Własna",
    descriptor: "AGENCJA",
    detail: "Marka własna i pełny moduł zarządzania nieruchomościami za 5$ / 20 PLN.",
    accent: "plan-accent-agency",
  },
];

type Transaction = {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  createdAt: string;
};

const dateFormat = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function BillingWorkspace({
  balance,
  currentPlan,
  transactions,
}: {
  balance: number;
  currentPlan: Plan;
  transactions: Transaction[];
}) {
  const [previewPlan, setPreviewPlan] = useState<Plan | null>(null);

  async function openCheckout(packageType: "owner" | "agency") {
    const response = await fetch("/api/checkout/five-dollars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "package", package: packageType }),
    });
    const data = await response.json() as { url?: string; simulated?: boolean; error?: string };
    if (data.url) window.location.href = data.url;
    else if (data.simulated) setPreviewPlan(packageType);
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
        <div className="card-lab flex flex-wrap items-center justify-between gap-5 p-5 sm:p-7">
          <div>
            <span className="eyebrow">AVAILABLE CREDITS</span>
            <p className="mt-2 font-mono text-4xl font-semibold tabular-nums tracking-tight text-white">
              {balance.toLocaleString("pl-PL")}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Saldo dostępne na Twoim portfelu
            </p>
          </div>
          <span className="billing-credit-icon">
            <Coins className="h-6 w-6" aria-hidden="true" />
          </span>
        </div>
        <div className="card-lab flex items-center justify-between gap-4 p-5 sm:p-7">
          <div>
            <span className="eyebrow">CURRENT PLAN</span>
            <p className="mt-2 text-2xl font-semibold text-white">
              {plans.find(({ id }) => id === currentPlan)?.name ?? "Free"}
            </p>
            <p className="mt-1 text-sm text-slate-400">Plan przypisany do konta</p>
          </div>
          <Sparkles className="h-5 w-5 text-indigo-200" aria-hidden="true" />
        </div>
      </section>

      <section>
        <div className="mb-4">
          <span className="eyebrow">01 / MEMBERSHIP</span>
          <h2 className="mt-1 text-lg font-medium text-slate-100">
            Dostępne plany
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {plans.map((plan) => {
            const active = plan.id === currentPlan;
            const selected = plan.id === previewPlan;
            return (
              <button
                key={plan.id}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  void openCheckout(plan.id === "agency" ? "agency" : "owner");
                }}
                className={`billing-plan ${plan.accent} ${active ? "billing-plan-current" : ""} ${selected ? "billing-plan-selected" : ""}`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">
                    {plan.descriptor}
                  </span>
                  {active && (
                    <span className="rounded-full border border-emerald-200/20 bg-emerald-200/10 px-2 py-1 text-[9px] text-emerald-100">
                      TWÓJ PLAN
                    </span>
                  )}
                  {!active && selected && (
                    <span className="rounded-full border border-indigo-200/20 bg-indigo-200/10 px-2 py-1 text-[9px] text-indigo-100">
                      PODGLĄD
                    </span>
                  )}
                </span>
                <span className="mt-6 block text-left text-xl font-medium text-white">
                  {plan.name}
                </span>
                <span className="mt-2 block text-left text-xs leading-relaxed text-slate-400">
                  {plan.detail}
                </span>
              </button>
            );
          })}
        </div>
        {previewPlan && previewPlan !== currentPlan && (
          <p className="mt-3 text-xs text-slate-500" role="status">
            Podgląd planu {plans.find(({ id }) => id === previewPlan)?.name}. Ta
            strona nie zmienia subskrypcji.
          </p>
        )}
      </section>

      <section>
        <div className="mb-4">
          <span className="eyebrow">02 / WALLET LEDGER</span>
          <h2 className="mt-1 text-lg font-medium text-slate-100">
            Historia transakcji
          </h2>
        </div>
        <div className="card-lab overflow-hidden">
          {transactions.length === 0 ? (
            <p className="p-6 text-sm text-slate-400">
              Brak transakcji w historii portfela.
            </p>
          ) : (
            <div className="divide-y divide-white/[0.07]">
              {transactions.map((transaction) => {
                const incoming = transaction.amount > 0;
                return (
                  <article
                    key={transaction.id}
                    className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${
                          incoming
                            ? "border-emerald-200/15 bg-emerald-200/5 text-emerald-200"
                            : "border-amber-200/15 bg-amber-200/5 text-amber-200"
                        }`}
                      >
                        {incoming ? (
                          <ArrowDownLeft className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-200">
                          {transaction.description || transaction.type}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {dateFormat.format(new Date(transaction.createdAt))}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-mono text-sm font-medium tabular-nums ${
                        incoming ? "text-emerald-200" : "text-slate-200"
                      }`}
                    >
                      {incoming ? "+" : ""}
                      {transaction.amount.toLocaleString("pl-PL")} kred.
                    </span>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
