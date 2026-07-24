"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  useTransactions,
  Transaction,
} from "@/components/shared/transactions-list";
import {
  ReceiptText,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Loader2,
  Wallet,
  RotateCcw,
  AlertTriangle,
  Award,
} from "lucide-react";
import api from "@/lib/axios";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface PaymentBreakdownEntry {
  payment_mode: string;
  total: number;
  count: number;
}

interface TopProductEntry {
  product_id: string;
  product_name: string;
  quantity_sold: number;
  revenue: number;
}

interface LowStockEntry {
  id: string;
  product_name: string;
  amount_available: number;
}

interface DashboardOverview {
  today_revenue: number;
  today_transaction_count: number;
  today_avg_transaction: number;
  yesterday_revenue: number;
  week_revenue: number;
  week_transaction_count: number;
  previous_week_revenue: number;
  today_refund_count: number;
  today_refund_value: number;
  payment_breakdown_today: PaymentBreakdownEntry[];
  top_products_week: TopProductEntry[];
  low_stock_items: LowStockEntry[];
}

function useDashboardOverview() {
  return useQuery<DashboardOverview>({
    queryKey: ["dashboard-overview"],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/dashboard/overview");
      return data;
    },
    staleTime: 60 * 1000,
  });
}

function isToday(isoString: string) {
  const d = new Date(isoString);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function paymentModeLabel(mode: string) {
  if (mode === "momo") return "MoMo";
  if (mode === "cash") return "Cash";
  if (mode === "card") return "Card";
  return "Unspecified";
}

function TrendBadge({ current, previous }: { current: number; previous: number }) { // noqa
  if (previous === 0) {
    if (current === 0) return null;
    return <span className="text-xs font-medium text-zinc-400">New</span>;
  }
  const pct = ((current - previous) / previous) * 100;
  const isUp = pct >= 0;
  const Icon = isUp ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold",
        isUp ? "text-green-600" : "text-red-600",
      )}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(pct).toFixed(0)}% vs prior period
    </span>
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
  sub?: React.ReactNode;
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
  const { data: transactions = [], isLoading: txLoading } = useTransactions();
  const { data: overview, isLoading: overviewLoading } = useDashboardOverview();

  const isLoading = txLoading || overviewLoading;

  const todayTxns = transactions.filter((tx) => isToday(tx.created_at));
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

  const maxPayment = overview
    ? Math.max(1, ...overview.payment_breakdown_today.map((p) => p.total))
    : 1;

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Revenue today"
              value={`GH₵${(overview?.today_revenue ?? 0).toFixed(2)}`}
              sub={
                overview && (
                  <TrendBadge current={overview.today_revenue} previous={overview.yesterday_revenue} /> // noqa
                )
              }
              icon={TrendingUp}
              color="bg-green-50 text-green-600"
            />
            <StatCard
              label="Revenue this week"
              value={`GH₵${(overview?.week_revenue ?? 0).toFixed(2)}`}
              sub={
                overview && (
                  <TrendBadge current={overview.week_revenue} previous={overview.previous_week_revenue} /> // noqa
                )
              }
              icon={TrendingUp}
              color="bg-emerald-50 text-emerald-600"
            />
            <StatCard
              label="Transactions today"
              value={String(overview?.today_transaction_count ?? 0)}
              sub={`avg GH₵${(overview?.today_avg_transaction ?? 0).toFixed(2)} / sale`} // noqa
              icon={ReceiptText}
              color="bg-blue-50 text-blue-600"
            />
            <StatCard
              label="Refunds today"
              value={String(overview?.today_refund_count ?? 0)}
              sub={
                overview && overview.today_refund_count > 0
                  ? `GH₵${overview.today_refund_value.toFixed(2)} returned`
                  : "none"
              }
              icon={RotateCcw}
              color={
                overview && overview.today_refund_count > 0
                  ? "bg-red-50 text-red-600"
                  : "bg-zinc-100 text-zinc-500"
              }
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Payment mix — helps end-of-day cash reconciliation */}
            <div className="bg-white rounded-xl border border-zinc-200 p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-700 mb-4"> {/* noqa */}
                <Wallet className="h-4 w-4 text-zinc-400" />
                Today&apos;s payment mix
              </h2>
              {!overview || overview.payment_breakdown_today.length === 0 ? (
                <p className="text-sm text-zinc-400 py-6 text-center">
                  No sales recorded today
                </p>
              ) : (
                <div className="space-y-3">
                  {overview.payment_breakdown_today.map((p) => (
                    <div key={p.payment_mode}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium text-zinc-700">
                          {paymentModeLabel(p.payment_mode)}
                          <span className="text-zinc-400 font-normal"> · {p.count} sale{p.count !== 1 ? "s" : ""}</span> {/* noqa */}
                        </span>
                        <span className="font-semibold text-zinc-900">GH₵{p.total.toFixed(2)}</span> {/* noqa */}
                      </div>
                      <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${(p.total / maxPayment) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top products this week */}
            <div className="bg-white rounded-xl border border-zinc-200 p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-700 mb-4"> {/* noqa */}
                <Award className="h-4 w-4 text-zinc-400" />
                Top sellers this week
              </h2>
              {!overview || overview.top_products_week.length === 0 ? (
                <p className="text-sm text-zinc-400 py-6 text-center">
                  No sales in the last 7 days
                </p>
              ) : (
                <div className="space-y-2.5">
                  {overview.top_products_week.map((p, i) => (
                    <div key={p.product_id} className="flex items-center justify-between text-sm"> {/* noqa */}
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-zinc-100 text-zinc-500 text-xs font-semibold flex items-center justify-center"> {/* noqa */}
                          {i + 1}
                        </span>
                        <span className="text-zinc-700 truncate">{p.product_name}</span> {/* noqa */}
                        <span className="text-zinc-400 text-xs shrink-0">× {p.quantity_sold}</span> {/* noqa */}
                      </span>
                      <span className="font-semibold text-zinc-900 shrink-0 ml-2">
                        GH₵{p.revenue.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {overview && overview.low_stock_items.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-800 mb-3"> {/* noqa */}
                <AlertTriangle className="h-4 w-4" />
                Restock soon
              </h2>
              <div className="flex flex-wrap gap-2">
                {overview.low_stock_items.map((item) => (
                  <Link
                    key={item.id}
                    href="/dashboard/admin/inventory"
                    className="inline-flex items-center gap-1.5 rounded-full bg-white border border-amber-200 px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100 transition-colors" // noqa
                  >
                    {item.product_name}
                    <span className="text-amber-500">· {item.amount_available} left</span> {/* noqa */}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-zinc-200 p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-700 mb-3"> {/* noqa */}
              <ShoppingBag className="h-4 w-4 text-zinc-400" />
              Today&apos;s Transactions
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
