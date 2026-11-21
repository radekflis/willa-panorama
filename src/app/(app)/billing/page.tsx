import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { creditTransactions, creditWallets, users } from "@/db/schema";
import { createClient } from "@/lib/auth/server";
import { BillingWorkspace } from "./billing-workspace";

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error?.name === "AuthSessionMissingError") redirect("/login");
  if (error) throw error;
  if (!user) redirect("/login");

  const [[wallet], [account]] = await Promise.all([
    db
      .select({ id: creditWallets.id, balance: creditWallets.balance })
      .from(creditWallets)
      .where(eq(creditWallets.userId, user.id))
      .limit(1),
    db
      .select({ plan: users.plan })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1),
  ]);
  const transactions = wallet
    ? await db
        .select({
          id: creditTransactions.id,
          amount: creditTransactions.amount,
          type: creditTransactions.type,
          description: creditTransactions.description,
          createdAt: creditTransactions.createdAt,
        })
        .from(creditTransactions)
        .where(eq(creditTransactions.walletId, wallet.id))
        .orderBy(desc(creditTransactions.createdAt))
        .limit(20)
    : [];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-8 px-5 py-10 sm:px-8 sm:py-12 xl:px-12">
      <header className="border-b border-white/10 pb-6">
        <span className="eyebrow">WILLA PANORAMA · ACCOUNT RESOURCES</span>
        <h1 className="mt-3 text-3xl font-medium tracking-tight text-white">
          Plany i Kredyty
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Zarządzaj planem konta, saldem i aktywnością kredytową.
        </p>
      </header>
      <BillingWorkspace
        balance={wallet?.balance ?? 0}
        currentPlan={account?.plan ?? "free"}
        transactions={transactions.map((transaction) => ({
          ...transaction,
          createdAt: transaction.createdAt.toISOString(),
        }))}
      />
    </main>
  );
}
