"use client";

import { useSession } from "next-auth/react";
import {
  useTransactions,
  Transaction,
} from "@/components/shared/transactions-list";
import { ReceiptText, TrendingUp, ShoppingBag, Loader2 } from "lucide-react";

function isToday(isoString: string) {
  const d = new Date(isoString);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5 flex items-start gap-4">
      <div className={`rounded-lg p-2.5 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
          {label}
        </p>
        <p className="mt-1 text-2xl font-bold text-zinc-900">{value}</p>
        {sub && <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function RecentRow({ tx }: { tx: Transaction }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-100 last:border-0">
      <div>
        <p className="text-sm font-medium text-zinc-800">{tx.customer_name}</p>
        <p className="text-xs text-zinc-400">
          {tx.items.length} item{tx.items.length !== 1 ? "s" : ""} · by{" "}
          {tx.processed_by}
        </p>
      </div>
      <span className="text-sm font-bold text-green-600">
        GH₵{tx.total_price.toFixed(2)}
      </span>
    </div>
  );
}

export default function AdminOverviewPage() {
  const { data: session } = useSession();
  const { data: transactions = [], isLoading } = useTransactions();

  const todayTxns = transactions.filter((tx) => isToday(tx.created_at));
  const todayRevenue = todayTxns.reduce((sum, tx) => sum + tx.total_price, 0);
  const todayItems = todayTxns.reduce(
    (sum, tx) => sum + tx.items.reduce((s, i) => s + i.quantity, 0),
    0,
  );
  const recentFive = [...todayTxns]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 5);

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">
          Welcome back, {session?.user?.worker_name ?? "Admin"}
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">{today}</p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-zinc-400 text-sm py-10 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Revenue today"
              value={`GH₵${todayRevenue.toFixed(2)}`}
              sub={`${todayTxns.length} transaction${todayTxns.length !== 1 ? "s" : ""}`}
              icon={TrendingUp}
              color="bg-green-50 text-green-600"
            />
            <StatCard
              label="Transactions today"
              value={String(todayTxns.length)}
              sub="completed"
              icon={ReceiptText}
              color="bg-blue-50 text-blue-600"
            />
            <StatCard
              label="Items sold today"
              value={String(todayItems)}
              sub="units"
              icon={ShoppingBag}
              color="bg-amber-50 text-amber-600"
            />
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 p-5">
            <h2 className="text-sm font-semibold text-zinc-700 mb-3">
              Today's Transactions
            </h2>
            {recentFive.length === 0 ? (
              <p className="text-sm text-zinc-400 py-6 text-center">
                No transactions recorded today
              </p>
            ) : (
              recentFive.map((tx) => <RecentRow key={tx._id} tx={tx} />)
            )}
          </div>
        </>
      )}
    </div>
  );
}
