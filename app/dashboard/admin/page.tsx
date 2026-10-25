"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  useTransactions,
  Transaction,
} from "@/components/shared/transactions-list";
import {
  ReceiptText,
  TrendingUp,
  ShoppingBag,
  Loader2,
  Wallet,
  RotateCcw,
  AlertTriangle,
  Store,
  Clock,
  Users2,
  CheckCircle2,
  ArrowUpRight,
  Activity,
  Sparkles,
  Calendar,
  Package,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import api from "@/lib/axios";
import { cn } from "@/lib/utils";
import Link from "next/link";

/**
 * Brand Palette
 * - Dusk Blue:       #26547C
 * - Bubblegum Pink:  #EF476F
 * - Golden Pollen:   #FFD166
 * - Emerald:         #06D6A0 (Primary)
 * - Porcelain:       #FFFCF9 (Surface / Background)
 */

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
  branch_name?: string | null;
  total_shop_quantity?: number | null;
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
  pending_order_count: number;
  pending_order_value: number;
  total_unique_customers: number;
  month_completed_transaction_count: number;
  payment_breakdown_today: PaymentBreakdownEntry[];
  top_products_week: TopProductEntry[];
  low_stock_items: LowStockEntry[];
}

interface BranchOption {
  id: string;
  branch_name: string;
  is_main: boolean;
}

function useBranches() {
  return useQuery<BranchOption[]>({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/branches");
      return data;
    },
    staleTime: 60 * 1000,
  });
}

function useDashboardOverview(branchName?: string) {
  return useQuery<DashboardOverview>({
    queryKey: ["dashboard-overview", branchName],
    queryFn: async () => {
      const params = branchName && branchName !== "all" ? { branch_name: branchName } : {};
      const { data } = await api.get("/api/v1/dashboard/overview", { params });
      return data;
    },
    staleTime: 60 * 1000,
  });
}

function formatRelativeTime(isoString: string): string {
  try {
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return "Recent";
  }
}

// Sparklines for feature cards
function SparklineBar({ heights, color = "bg-white/70" }: { heights: number[]; color?: string }) {
  return (
    <div className="flex items-end gap-1 h-7">
      {heights.map((h, i) => (
        <div
          key={i}
          className={cn("w-1.5 rounded-t transition-all duration-300 hover:opacity-100", color)}
          style={{ height: `${Math.max(15, Math.min(100, h))}%` }}
        />
      ))}
    </div>
  );
}

function SparklineWave({ stroke = "rgba(255,255,255,0.85)", dotColor = "#ffffff" }: { stroke?: string; dotColor?: string }) {
  return (
    <svg className="w-16 h-7 overflow-visible" viewBox="0 0 64 28" fill="none">
      <path
        d="M2 22C12 22 16 6 26 12C36 18 42 4 52 10C56 12 60 8 62 6"
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="52" cy="10" r="3" fill={dotColor} />
    </svg>
  );
}

// Payment Mix Donut Chart strictly using User's Palette
function PaymentDonutChart({ breakdown }: { breakdown: PaymentBreakdownEntry[] }) {
  const total = breakdown.reduce((acc, b) => acc + b.total, 0);

  const colors = [
    { stroke: "#06D6A0", fill: "bg-[#06D6A0]", label: "Cash" },
    { stroke: "#EF476F", fill: "bg-[#EF476F]", label: "MoMo" },
    { stroke: "#26547C", fill: "bg-[#26547C]", label: "Card / POS" },
    { stroke: "#FFD166", fill: "bg-[#FFD166]", label: "Other" },
  ];

  if (total === 0 || breakdown.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-zinc-400">
        <Wallet className="h-8 w-8 text-[#06D6A0]/40 mb-2" />
        <p className="text-xs font-medium">No sales recorded yet today</p>
      </div>
    );
  }

  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  const slices = breakdown.map((item, idx) => {
    const percent = item.total / total;
    const strokeDasharray = `${percent * circumference} ${circumference}`;
    const strokeDashoffset = -(accumulatedPercent * circumference);
    accumulatedPercent += percent;
    return {
      ...item,
      color: colors[idx % colors.length],
      percent: Math.round(percent * 100),
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36 flex items-center justify-center my-1">
        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="#f1f5f9"
            strokeWidth="12"
          />
          {slices.map((slice, i) => (
            <circle
              key={i}
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke={slice.color.stroke}
              strokeWidth="12"
              strokeDasharray={slice.strokeDasharray}
              strokeDashoffset={slice.strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-500 hover:opacity-85"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#26547C]">Total</span>
          <span className="text-sm font-black text-zinc-900 leading-tight">
            GH₵{total >= 1000 ? `${(total / 1000).toFixed(1)}k` : total.toFixed(0)}
          </span>
        </div>
      </div>

      {/* Legend chips */}
      <div className="flex flex-wrap items-center justify-center gap-x-3.5 gap-y-2 mt-3 pt-3 border-t border-zinc-100 w-full text-xs">
        {slices.map((slice, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", slice.color.fill)} />
            <span className="text-zinc-600 font-medium capitalize">{slice.payment_mode || "Other"}:</span>
            <span className="font-bold text-zinc-900">{slice.percent}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Sales Performance Area Wave Chart using Emerald (#06D6A0) and Bubblegum Pink (#EF476F)
function SalesWaveChart({
  transactions,
  period,
}: {
  transactions: Transaction[];
  period: "daily" | "weekly" | "monthly";
}) {
  const points = useMemo(() => {
    const map: Record<string, { label: string; revenue: number; count: number }> = {};
    const now = new Date();

    if (period === "daily") {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const key = d.toISOString().split("T")[0];
        const label = d.toLocaleDateString("en-US", { weekday: "short" });
        map[key] = { label, revenue: 0, count: 0 };
      }
    } else if (period === "weekly") {
      for (let i = 3; i >= 0; i--) {
        const key = `w-${i}`;
        const label = i === 0 ? "This Week" : `${i}w ago`;
        map[key] = { label, revenue: 0, count: 0 };
      }
    } else {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = d.toLocaleDateString("en-US", { month: "short" });
        map[key] = { label, revenue: 0, count: 0 };
      }
    }

    transactions.forEach((tx) => {
      if (tx.status !== "success") return;
      const txDate = new Date(tx.created_at);
      if (period === "daily") {
        const key = tx.created_at.split("T")[0];
        if (map[key]) {
          map[key].revenue += tx.total_price;
          map[key].count += 1;
        }
      } else if (period === "weekly") {
        const diffDays = Math.floor((now.getTime() - txDate.getTime()) / (1000 * 3600 * 24));
        const weekIdx = Math.floor(diffDays / 7);
        if (weekIdx >= 0 && weekIdx < 4) {
          const key = `w-${weekIdx}`;
          if (map[key]) {
            map[key].revenue += tx.total_price;
            map[key].count += 1;
          }
        }
      } else {
        const key = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, "0")}`;
        if (map[key]) {
          map[key].revenue += tx.total_price;
          map[key].count += 1;
        }
      }
    });

    return Object.values(map);
  }, [transactions, period]);

  const maxRev = Math.max(10, ...points.map((p) => p.revenue));
  const maxCount = Math.max(1, ...points.map((p) => p.count));

  const width = 500;
  const height = 150;
  const paddingX = 30;
  const paddingY = 20;

  const revCoords = points.map((p, idx) => {
    const x = paddingX + (idx / Math.max(1, points.length - 1)) * (width - 2 * paddingX);
    const y = height - paddingY - (p.revenue / maxRev) * (height - 2 * paddingY);
    return { x, y, ...p };
  });

  const countCoords = points.map((p, idx) => {
    const x = paddingX + (idx / Math.max(1, points.length - 1)) * (width - 2 * paddingX);
    const y = height - paddingY - (p.count / maxCount) * (height - 2 * paddingY * 0.7);
    return { x, y, ...p };
  });

  function makeCurvedPath(coords: { x: number; y: number }[]) {
    if (coords.length === 0) return "";
    let d = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i];
      const p1 = coords[i + 1];
      const cpX = (p0.x + p1.x) / 2;
      d += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  }

  const revLinePath = makeCurvedPath(revCoords);
  const revAreaPath = `${revLinePath} L ${revCoords[revCoords.length - 1]?.x ?? width} ${height} L ${revCoords[0]?.x ?? 0} ${height} Z`;

  const countLinePath = makeCurvedPath(countCoords);

  return (
    <div className="w-full relative mt-2">
      <svg
        className="w-full h-44 overflow-visible"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="waveGradientPaletteEmerald" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06D6A0" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#06D6A0" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="waveGradientPalettePink" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#EF476F" />
            <stop offset="100%" stopColor="#FFD166" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((ratio) => (
          <line
            key={ratio}
            x1="20"
            y1={height * ratio}
            x2={width - 20}
            y2={height * ratio}
            stroke="#f4f4f5"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        ))}

        {/* Revenue Area Fill (Emerald #06D6A0) */}
        <path d={revAreaPath} fill="url(#waveGradientPaletteEmerald)" />

        {/* Count Line (Bubblegum Pink #EF476F) */}
        <path
          d={countLinePath}
          fill="none"
          stroke="url(#waveGradientPalettePink)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Revenue Line (Primary Emerald #06D6A0) */}
        <path
          d={revLinePath}
          fill="none"
          stroke="#06D6A0"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Data points */}
        {revCoords.map((pt, i) => (
          <g key={`rev-${i}`} className="group cursor-pointer">
            <circle
              cx={pt.x}
              cy={pt.y}
              r="4.5"
              fill="#ffffff"
              stroke="#06D6A0"
              strokeWidth="3"
              className="transition-all duration-200 group-hover:r-6"
            />
          </g>
        ))}

        {countCoords.map((pt, i) => (
          <g key={`count-${i}`} className="group cursor-pointer">
            <circle
              cx={pt.x}
              cy={pt.y}
              r="3.5"
              fill="#ffffff"
              stroke="#EF476F"
              strokeWidth="2.5"
            />
          </g>
        ))}
      </svg>

      {/* X-axis labels */}
      <div className="flex justify-between px-6 pt-1 text-[11px] font-semibold text-[#26547C]/70">
        {points.map((p, i) => (
          <span key={i}>{p.label}</span>
        ))}
      </div>
    </div>
  );
}

export default function AdminOverviewPage() {
  const { data: session } = useSession();
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [chartPeriod, setChartPeriod] = useState<"daily" | "weekly" | "monthly">("daily");

  const { data: branches = [] } = useBranches();
  const { data: transactions = [], isLoading: txLoading } = useTransactions({
    branchName: selectedBranch !== "all" ? selectedBranch : undefined,
  });
  const { data: overview, isLoading: overviewLoading } = useDashboardOverview(selectedBranch);

  const isLoading = txLoading || overviewLoading;

  const recentTxns = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6);
  }, [transactions]);

  const todayFormatted = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const revDiff =
    overview && overview.yesterday_revenue > 0
      ? ((overview.today_revenue - overview.yesterday_revenue) / overview.yesterday_revenue) * 100
      : null;

  const weekDiff =
    overview && overview.previous_week_revenue > 0
      ? ((overview.week_revenue - overview.previous_week_revenue) / overview.previous_week_revenue) * 100
      : null;

  const lowStockItems = overview?.low_stock_items ?? [];

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-10">
      {/* Top Welcome & Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#06D6A0]/15 border border-[#06D6A0]/30 text-[#048866] text-xs font-bold mb-1 shadow-2xs">
            <Sparkles className="h-3.5 w-3.5 text-[#06D6A0] animate-pulse" />
            Executive Store Insights
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#26547C] tracking-tight">
            Welcome back, {session?.user?.worker_name ?? "Admin"} 👋
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5 flex items-center gap-1.5 font-medium">
            <Calendar className="h-3.5 w-3.5 text-[#06D6A0]" />
            {todayFormatted}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/admin/transactions"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#06D6A0] hover:bg-[#05b88a] text-zinc-950 text-xs font-extrabold shadow-sm transition-all hover:shadow-md cursor-pointer"
          >
            <ReceiptText className="h-3.5 w-3.5 text-zinc-900" />
            New Transaction
          </Link>
          <Link
            href="/dashboard/admin/reports"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#FFFCF9] hover:bg-zinc-50 border border-zinc-200 text-[#26547C] text-xs font-bold shadow-xs transition-all hover:border-[#26547C]/40 cursor-pointer"
          >
            <TrendingUp className="h-3.5 w-3.5 text-[#EF476F]" />
            Financial Reports
          </Link>
        </div>
      </div>

      {/* Multi-Branch Filter Pills (Palette Themed) */}
      {branches.length > 1 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              type="button"
              onClick={() => setSelectedBranch("all")}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-extrabold transition-all shrink-0 cursor-pointer border shadow-2xs",
                selectedBranch === "all"
                  ? "bg-[#26547C] text-white border-transparent shadow-[#26547C]/30"
                  : "bg-[#FFFCF9] text-zinc-600 border-zinc-200 hover:border-[#26547C]/40 hover:bg-zinc-50"
              )}
            >
              <Store className="h-3.5 w-3.5" />
              All Branches (Consolidated)
            </button>
            {branches.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedBranch(b.branch_name)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-extrabold transition-all shrink-0 cursor-pointer border shadow-2xs",
                  selectedBranch === b.branch_name
                    ? "bg-[#26547C] text-white border-transparent shadow-[#26547C]/30"
                    : "bg-[#FFFCF9] text-zinc-600 border-zinc-200 hover:border-[#26547C]/40 hover:bg-zinc-50"
                )}
              >
                <Store className="h-3.5 w-3.5" />
                {b.branch_name} {b.is_main && "(HQ)"}
              </button>
            ))}
          </div>

          {selectedBranch !== "all" && (
            <div className="flex items-center justify-between bg-[#26547C]/10 border border-[#26547C]/20 rounded-xl px-4 py-2 text-xs">
              <span className="text-[#26547C] font-semibold flex items-center gap-1.5">
                <Store className="h-4 w-4 text-[#26547C]" />
                Filtered to Branch: <strong className="font-extrabold text-[#26547C]">{selectedBranch}</strong>
              </span>
              <button
                type="button"
                onClick={() => setSelectedBranch("all")}
                className="text-[#26547C] hover:underline font-bold cursor-pointer"
              >
                Reset to All
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4 Feature Cards using the User's Palette */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Revenue (Emerald #06D6A0) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#06D6A0] via-[#05b88a] to-[#038562] p-5 text-white shadow-lg shadow-[#06D6A0]/25 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-100">Today&apos;s Revenue</span>
              <h3 className="text-2xl font-black mt-1 tracking-tight">
                GH₵{(overview?.today_revenue ?? 0).toFixed(2)}
              </h3>
            </div>
            <SparklineBar heights={[30, 50, 40, 75, 60, 95, 80]} color="bg-white/80" />
          </div>
          <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs text-emerald-100">
            <span>
              {revDiff !== null ? (
                <strong className="text-white font-bold">
                  {revDiff >= 0 ? `+${revDiff.toFixed(0)}%` : `${revDiff.toFixed(0)}%`}
                </strong>
              ) : (
                <strong className="text-white font-bold">Live</strong>
              )}{" "}
              vs yesterday
            </span>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-semibold">Today</span>
          </div>
        </div>

        {/* Card 2: 7-Day Sales (Dusk Blue #26547C) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#26547C] via-[#1f476b] to-[#163855] p-5 text-white shadow-lg shadow-[#26547C]/25 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200">7-Day Gross Sales</span>
              <h3 className="text-2xl font-black mt-1 tracking-tight">
                GH₵{(overview?.week_revenue ?? 0).toFixed(2)}
              </h3>
            </div>
            <SparklineWave stroke="rgba(255,255,255,0.85)" dotColor="#06D6A0" />
          </div>
          <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs text-blue-200">
            <span>
              {weekDiff !== null ? (
                <strong className="text-white font-bold">
                  {weekDiff >= 0 ? `+${weekDiff.toFixed(0)}%` : `${weekDiff.toFixed(0)}%`}
                </strong>
              ) : (
                <strong className="text-white font-bold">Current</strong>
              )}{" "}
              vs prior 7 days
            </span>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-semibold">7 Days</span>
          </div>
        </div>

        {/* Card 3: Completed Sales (Bubblegum Pink #EF476F) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#EF476F] via-[#e63c65] to-[#c7264e] p-5 text-white shadow-lg shadow-[#EF476F]/25 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-pink-100">Completed Sales</span>
              <h3 className="text-2xl font-black mt-1 tracking-tight">
                {overview?.today_transaction_count ?? 0}
              </h3>
            </div>
            <SparklineBar heights={[40, 60, 85, 45, 90, 70, 100]} color="bg-white/80" />
          </div>
          <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs text-pink-100">
            <span>
              Avg ticket: <strong className="text-white font-bold">GH₵{(overview?.today_avg_transaction ?? 0).toFixed(2)}</strong>
            </span>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-semibold">Receipts</span>
          </div>
        </div>

        {/* Card 4: Open Tabs / Pending (Golden Pollen #FFD166) */}
        <Link
          href="/dashboard/admin/pending"
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#FFD166] via-[#f7c54a] to-[#e0ab2d] p-5 text-zinc-950 shadow-lg shadow-[#FFD166]/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer block"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-900/80">Open Tabs / Pending</span>
              <h3 className="text-2xl font-black mt-1 tracking-tight text-zinc-950">
                GH₵{(overview?.pending_order_value ?? 0).toFixed(2)}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-950/10 backdrop-blur-xs">
              <Clock className="h-5 w-5 text-zinc-950" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-950/15 flex items-center justify-between text-xs text-zinc-900 font-semibold">
            <span>
              <strong className="font-black">{overview?.pending_order_count ?? 0}</strong> awaiting payment
            </span>
            <span className="text-[10px] bg-zinc-950 text-white px-2.5 py-0.5 rounded-full font-bold flex items-center gap-0.5">
              Review <ArrowUpRight className="h-3 w-3" />
            </span>
          </div>
        </Link>
      </div>

      {/* Main Dual-Column Section: Hero Chart & Payment Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Sales Performance Area Wave Chart */}
        <div className="lg:col-span-2 bg-[#FFFCF9] rounded-3xl border border-zinc-200/80 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100">
              <div>
                <h2 className="text-base font-black text-[#26547C] flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[#06D6A0]" />
                  Sales Performance Trend
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5 font-medium">
                  Continuous revenue trajectory and volume flow
                </p>
              </div>

              {/* Period Tabs: Daily / Weekly / Monthly */}
              <div className="inline-flex rounded-xl bg-zinc-100 p-1 border border-zinc-200/60 self-start sm:self-auto">
                {(["daily", "weekly", "monthly"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setChartPeriod(tab)}
                    className={cn(
                      "px-3.5 py-1 rounded-lg text-xs font-black capitalize transition-all cursor-pointer",
                      chartPeriod === tab
                        ? "bg-[#26547C] text-white shadow-xs"
                        : "text-zinc-500 hover:text-zinc-900"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Performance Summary Pill */}
            <div className="flex flex-wrap items-baseline gap-4 mt-5">
              <div>
                <span className="text-xs font-semibold text-zinc-400">Total Analyzed</span>
                <p className="text-3xl font-black text-[#26547C] tracking-tight">
                  GH₵{((overview?.today_revenue ?? 0) + (overview?.week_revenue ?? 0)).toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold bg-[#06D6A0]/15 text-[#048866] border border-[#06D6A0]/30">
                  <span className="h-2 w-2 rounded-full bg-[#06D6A0]" /> Revenue Curve
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold bg-[#EF476F]/15 text-[#c7264e] border border-[#EF476F]/30">
                  <span className="h-2 w-2 rounded-full bg-[#EF476F]" /> Volume Trajectory
                </span>
              </div>
            </div>

            {/* Smooth SVG Area Chart */}
            {isLoading ? (
              <div className="h-48 flex items-center justify-center text-zinc-400 text-xs">
                <Loader2 className="h-5 w-5 animate-spin mr-2 text-[#06D6A0]" /> Loading sales trend...
              </div>
            ) : (
              <SalesWaveChart transactions={transactions} period={chartPeriod} />
            )}
          </div>

          {/* Quick Stats Pill Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 mt-4 border-t border-zinc-100">
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-zinc-100 shadow-2xs">
              <div className="p-2 rounded-lg bg-[#06D6A0]/20 text-[#048866]">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase text-zinc-400 truncate">Month Txns</p>
                <p className="text-sm font-black text-zinc-900 truncate">
                  {overview?.month_completed_transaction_count ?? 0}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-zinc-100 shadow-2xs">
              <div className="p-2 rounded-lg bg-[#26547C]/15 text-[#26547C]">
                <Users2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase text-zinc-400 truncate">Clients</p>
                <p className="text-sm font-black text-zinc-900 truncate">
                  {overview?.total_unique_customers ?? 0}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-zinc-100 shadow-2xs">
              <div className="p-2 rounded-lg bg-[#FFD166]/30 text-amber-900">
                <ShoppingBag className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase text-zinc-400 truncate">Week Items</p>
                <p className="text-sm font-black text-zinc-900 truncate">
                  {overview?.week_transaction_count ?? 0} sales
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-zinc-100 shadow-2xs">
              <div className="p-2 rounded-lg bg-[#EF476F]/15 text-[#EF476F]">
                <RotateCcw className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase text-zinc-400 truncate">Refunds</p>
                <p className="text-sm font-black text-zinc-900 truncate">
                  {overview?.today_refund_count ?? 0} today
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Payment Breakdown Donut */}
        <div className="bg-[#FFFCF9] rounded-3xl border border-zinc-200/80 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h2 className="text-base font-black text-[#26547C] flex items-center gap-2">
                <Wallet className="h-4 w-4 text-[#06D6A0]" />
                Payment Channels
              </h2>
              <span className="text-[10px] bg-[#06D6A0]/15 text-[#048866] font-extrabold px-2 py-0.5 rounded-full border border-[#06D6A0]/20">
                Today
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1 mb-4 font-medium">
              Real-time payment method distribution for daily cashier audit
            </p>

            <PaymentDonutChart breakdown={overview?.payment_breakdown_today ?? []} />
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-100">
            <Link
              href="/dashboard/admin/transactions"
              className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-200 text-[#26547C] text-xs font-bold transition-colors cursor-pointer shadow-2xs"
            >
              Audit Cash & MoMo Drawer
              <ChevronRight className="h-3.5 w-3.5 text-[#06D6A0]" />
            </Link>
          </div>
        </div>
      </div>

      {/* Prominent Inventory Watchlist Section (Items Running Out) */}
      <div className="bg-[#FFFCF9] rounded-3xl border border-zinc-200/80 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-[#FFD166]/25 border border-[#FFD166]/50 text-amber-900">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-[#26547C]">
                  Inventory Watchlist: Items Running Out
                </h2>
                {lowStockItems.length > 0 ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-[#EF476F] text-white animate-pulse shadow-xs">
                    {lowStockItems.length} Low Stock
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-[#06D6A0]/20 text-[#048866] border border-[#06D6A0]/30 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> Fully Stocked
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Items critically low (under 5 units remaining) requiring restocking
              </p>
            </div>
          </div>

          <Link
            href="/dashboard/admin/inventory"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#06D6A0] hover:bg-[#05b88a] text-zinc-950 text-xs font-extrabold transition-colors self-start sm:self-auto cursor-pointer shadow-xs"
          >
            <Package className="h-3.5 w-3.5" />
            Manage & Restock Stock
          </Link>
        </div>

        {lowStockItems.length === 0 ? (
          <div className="py-10 text-center flex flex-col items-center justify-center">
            <div className="h-12 w-12 rounded-full bg-[#06D6A0]/20 border border-[#06D6A0]/30 flex items-center justify-center text-[#048866] mb-2">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-zinc-800">All inventory items are well-stocked</p>
            <p className="text-xs text-zinc-400 mt-0.5">No products currently below the safety threshold</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-5">
            {lowStockItems.slice(0, 6).map((item) => {
              const isOut = item.amount_available <= 0;
              const pct = Math.max(0, Math.min(100, (item.amount_available / 5) * 100));

              return (
                <Link
                  key={item.id}
                  href="/dashboard/admin/inventory"
                  className={cn(
                    "group flex flex-col justify-between p-4 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer bg-white",
                    isOut
                      ? "border-[#EF476F]/30 hover:border-[#EF476F]"
                      : "border-zinc-200/80 hover:border-[#06D6A0]"
                  )}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-zinc-900 text-sm group-hover:text-[#26547C] transition-colors truncate">
                        {item.product_name}
                      </span>
                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-[11px] font-black shrink-0",
                          isOut
                            ? "bg-[#EF476F] text-white"
                            : "bg-[#FFD166] text-zinc-950 font-bold"
                        )}
                      >
                        {isOut ? "Out of Stock" : `${item.amount_available} left`}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1 font-medium">
                      <Store className="h-3 w-3 text-[#26547C]" />
                      {item.branch_name || "Main Branch"}
                    </p>
                  </div>

                  {/* Stock level bar */}
                  <div className="mt-4 pt-3 border-t border-zinc-100">
                    <div className="flex items-center justify-between text-[11px] font-medium text-zinc-500 mb-1.5">
                      <span>Stock Threshold</span>
                      <span className="font-bold text-zinc-700">{item.amount_available} / 5 units</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          isOut ? "bg-[#EF476F]" : "bg-[#FFD166]"
                        )}
                        style={{ width: `${Math.max(8, pct)}%` }}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Row: Recent Activities Timeline & Order Status Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Recent Activities Timeline */}
        <div className="bg-[#FFFCF9] rounded-3xl border border-zinc-200/80 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <h2 className="text-base font-black text-[#26547C] flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#06D6A0]" />
              Recent Activities
            </h2>
            <span className="text-[10px] bg-[#06D6A0]/15 text-[#048866] font-bold px-2 py-0.5 rounded-full border border-[#06D6A0]/20">
              Live Feed
            </span>
          </div>

          <div className="mt-4 relative space-y-4 before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#26547C]/15">
            {recentTxns.length === 0 ? (
              <p className="text-xs text-zinc-400 py-6 text-center">No recent shop events recorded</p>
            ) : (
              recentTxns.map((tx, idx) => {
                const nodeColors = [
                  { bg: "bg-[#06D6A0]", text: "text-[#06D6A0]" },
                  { bg: "bg-[#26547C]", text: "text-[#26547C]" },
                  { bg: "bg-[#EF476F]", text: "text-[#EF476F]" },
                  { bg: "bg-[#FFD166]", text: "text-[#FFD166]" },
                ];
                const c = nodeColors[idx % nodeColors.length];

                return (
                  <div key={tx._id} className="relative flex items-start gap-3 pl-1 group">
                    <div
                      className={cn(
                        "h-6 w-6 rounded-full flex items-center justify-center shrink-0 z-10 text-white shadow-2xs",
                        c.bg
                      )}
                    >
                      <ReceiptText className={cn("h-3 w-3", c.bg === "bg-[#FFD166]" ? "text-zinc-950" : "text-white")} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-zinc-900 truncate">
                          {tx.customer_name || "Walk-in Customer"}
                        </p>
                        <span className="text-[10px] text-zinc-400 font-medium shrink-0">
                          {formatRelativeTime(tx.created_at)}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        Sold {tx.items.length} item{tx.items.length !== 1 ? "s" : ""} • GH₵
                        {tx.total_price.toFixed(2)} ({tx.payment_mode || "Cash"})
                      </p>
                      <span className="text-[10px] text-[#26547C]/70 block font-medium">by {tx.processed_by}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right 2 Columns: Order Status Table */}
        <div className="lg:col-span-2 bg-[#FFFCF9] rounded-3xl border border-zinc-200/80 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h2 className="text-base font-black text-[#26547C] flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-[#EF476F]" />
                Latest Transaction Orders
              </h2>
              <Link
                href="/dashboard/admin/transactions"
                className="text-xs font-bold text-[#26547C] hover:text-[#06D6A0] flex items-center gap-0.5 cursor-pointer transition-colors"
              >
                View Ledger <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Styled Table with Palette Header */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-200 text-[11px] font-extrabold uppercase tracking-wider text-[#26547C]/80">
                    <th className="pb-3 font-bold">Customer</th>
                    <th className="pb-3 font-bold">Payment</th>
                    <th className="pb-3 font-bold">Items</th>
                    <th className="pb-3 font-bold">Total Price</th>
                    <th className="pb-3 font-bold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs">
                  {recentTxns.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-zinc-400 text-xs">
                        No transactions found
                      </td>
                    </tr>
                  ) : (
                    recentTxns.map((tx) => (
                      <tr key={tx._id} className="hover:bg-[#FFFCF9]/80 transition-colors">
                        <td className="py-3 pr-2">
                          <p className="font-bold text-zinc-900 truncate max-w-[140px]">
                            {tx.customer_name || "Walk-in Customer"}
                          </p>
                          <span className="text-[10px] text-zinc-400">
                            {formatRelativeTime(tx.created_at)}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className="inline-flex items-center gap-1 font-semibold text-zinc-700 capitalize">
                            {tx.payment_mode || "Cash"}
                          </span>
                        </td>
                        <td className="py-3 text-zinc-600 font-medium">
                          {tx.items.length} item{tx.items.length !== 1 ? "s" : ""}
                        </td>
                        <td className="py-3 font-bold text-zinc-900 whitespace-nowrap">
                          GH₵{tx.total_price.toFixed(2)}
                        </td>
                        <td className="py-3 text-right">
                          <span
                            className={cn(
                              "inline-block px-3 py-1 rounded-full text-[10px] font-black tracking-wide uppercase shadow-2xs",
                              tx.status === "success"
                                ? "bg-[#06D6A0] text-zinc-950 font-black"
                                : tx.status === "pending"
                                ? "bg-[#FFD166] text-zinc-950 font-black"
                                : "bg-[#EF476F] text-white font-black"
                            )}
                          >
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick link bar at bottom */}
          <div className="pt-4 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
            <span>Showing top recent orders</span>
            <Link
              href="/dashboard/admin/transactions"
              className="text-xs font-bold text-[#26547C] hover:text-[#06D6A0] underline underline-offset-2 cursor-pointer transition-colors"
            >
              Full Order Ledger →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
