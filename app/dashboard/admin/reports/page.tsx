"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Download,
  Loader2,
  TrendingUp,
  DollarSign,
  Package,
  PiggyBank,
  Percent,
  Calendar,
  CreditCard,
  Smartphone,
  Banknote,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ReportPeriod = "weekly" | "monthly" | "custom";

interface TopProduct {
  product_id?: string;
  product_name: string;
  units_sold: number;
  revenue: number;
  cost?: number;
  profit?: number;
  profit_margin_pct?: number;
}

interface DailyTrend {
  date: string;
  revenue: number;
  cogs?: number;
  gross_profit?: number;
}

interface PaymentBreakdownItem {
  method: string;
  amount: number;
  count?: number;
  percentage?: number;
}

interface FinancialReportResponse {
  revenue: number;
  cogs: number;
  gross_profit: number;
  profit_margin_pct: number;
  top_profitable_products?: TopProduct[];
  payment_breakdown?: PaymentBreakdownItem[] | Record<string, number>;
  daily_trends?: DailyTrend[];
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>("monthly");

  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const [startDate, setStartDate] = useState<string>(formatDate(thirtyDaysAgo));
  const [endDate, setEndDate] = useState<string>(formatDate(today));
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const queryParams: Record<string, string> = { period };
  if (period === "custom") {
    if (startDate) queryParams.start_date = startDate;
    if (endDate) queryParams.end_date = endDate;
  }

  const {
    data: report,
    isLoading,
    isError,
    refetch,
  } = useQuery<FinancialReportResponse>({
    queryKey: ["reports", period, startDate, endDate],
    queryFn: async () => {
      const { data } = await api.get<FinancialReportResponse>(
        "/api/v1/reports/summary",
        { params: queryParams }
      );
      return data;
    },
    staleTime: 2 * 60 * 1000,
  });

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      const res = await api.get("/api/v1/reports/pdf", {
        params: queryParams,
        responseType: "blob",
      });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Financial_Report_${period}_${formatDate(new Date())}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("PDF report downloaded successfully!");
    } catch (err: unknown) {
      console.error("Failed to download PDF report:", err);
      toast.error("Failed to download PDF report. Please try again.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Normalize payment breakdown
  const parsedPaymentBreakdown: PaymentBreakdownItem[] = (() => {
    if (!report?.payment_breakdown) return [];

    const totalRev = report.revenue || 1;

    if (Array.isArray(report.payment_breakdown)) {
      return report.payment_breakdown.map((item: any) => {
        const rawMethod =
          item?.method ||
          item?.payment_method ||
          item?.mode ||
          item?.type ||
          "Other";
        const amt = Number(item?.amount || item?.total || 0);
        return {
          method: String(rawMethod),
          amount: amt,
          count: item?.count ? Number(item.count) : undefined,
          percentage: item?.percentage ?? Math.round((amt / totalRev) * 100),
        };
      });
    }

    return Object.entries(report.payment_breakdown).map(([method, amount]) => {
      const amt = Number(amount || 0);
      return {
        method: method || "Other",
        amount: amt,
        percentage: Math.round((amt / totalRev) * 100),
      };
    });
  })();

  const getMethodIcon = (method?: string | null) => {
    if (!method) return DollarSign;
    const m = String(method).toLowerCase();
    if (m.includes("momo") || m.includes("mobile")) return Smartphone;
    if (m.includes("card") || m.includes("paystack")) return CreditCard;
    if (m.includes("cash")) return Banknote;
    return DollarSign;
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      {/* Top Header & Period Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-green-600" />
            Financial Reports & Profit Analytics
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Track revenue, COGS, gross profit margins, and download export reports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Period selector */}
          <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200">
            {(["weekly", "monthly", "custom"] as ReportPeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-3.5 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors",
                  period === p
                    ? "bg-white text-green-800 shadow-xs font-bold"
                    : "text-zinc-600 hover:text-zinc-900"
                )}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Custom Date Inputs */}
          {period === "custom" && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white border border-zinc-300 rounded-lg px-2 py-1">
                <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-7 text-xs border-0 p-0 shadow-none focus-visible:ring-0 w-28"
                />
              </div>
              <span className="text-xs text-zinc-400">to</span>
              <div className="flex items-center gap-1 bg-white border border-zinc-300 rounded-lg px-2 py-1">
                <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-7 text-xs border-0 p-0 shadow-none focus-visible:ring-0 w-28"
                />
              </div>
            </div>
          )}

          {/* Export PDF Button */}
          <Button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf || isLoading}
            className="bg-green-700 hover:bg-green-800 text-white gap-2 shadow-xs"
          >
            {downloadingPdf ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating PDF…
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download PDF Report
              </>
            )}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-400">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          <p className="text-sm font-medium">Calculating financial metrics…</p>
        </div>
      ) : isError ? (
        <div className="flex items-center gap-3 rounded-2xl bg-red-50 border border-red-200 p-5 text-red-700 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Unable to load financial reports</p>
            <p className="text-xs text-red-600 mt-0.5">
              Please verify your server connection and try again.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            className="ml-auto bg-white border-red-200 text-red-700 hover:bg-red-100"
          >
            Retry
          </Button>
        </div>
      ) : (
        <>
          {/* KPI Header Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Revenue */}
            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                  Total Revenue
                </span>
                <div className="p-2 rounded-xl bg-green-50 text-green-700">
                  <DollarSign className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold text-zinc-900">
                  GH₵{(report?.revenue ?? 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  Gross income from completed transactions
                </p>
              </div>
            </div>

            {/* COGS */}
            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                  Cost of Goods Sold (COGS)
                </span>
                <div className="p-2 rounded-xl bg-orange-50 text-orange-600">
                  <Package className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold text-zinc-900">
                  GH₵{(report?.cogs ?? 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  Total purchase & unit cost of sold inventory
                </p>
              </div>
            </div>

            {/* Gross Profit */}
            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                  Gross Profit
                </span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                  <PiggyBank className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3">
                <p
                  className={cn(
                    "text-2xl font-bold",
                    (report?.gross_profit ?? 0) >= 0
                      ? "text-emerald-600"
                      : "text-red-600"
                  )}
                >
                  GH₵{(report?.gross_profit ?? 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  Net earnings after inventory unit costs
                </p>
              </div>
            </div>

            {/* Profit Margin % */}
            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                  Profit Margin
                </span>
                <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                  <Percent className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-zinc-900">
                    {(report?.profit_margin_pct ?? 0).toFixed(1)}%
                  </p>
                  <span
                    className={cn(
                      "text-xs font-semibold px-2 py-0.5 rounded-full",
                      (report?.profit_margin_pct ?? 0) >= 20
                        ? "bg-green-100 text-green-800"
                        : (report?.profit_margin_pct ?? 0) > 0
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    )}
                  >
                    {(report?.profit_margin_pct ?? 0) >= 20
                      ? "Healthy"
                      : "Moderate"}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Profit percentage relative to revenue
                </p>
              </div>
            </div>
          </div>

          {/* Daily Trends & Payment Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Daily Trends Chart */}
            <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading font-semibold text-zinc-900 text-base">
                    Daily Financial Breakdown
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Daily revenue vs COGS & Gross Profit
                  </p>
                </div>
              </div>

              {report?.daily_trends && report.daily_trends.length > 0 ? (
                <div className="space-y-3 mt-2">
                  {report.daily_trends.map((item, idx) => {
                    const maxVal = Math.max(
                      ...report.daily_trends!.map((t) => t.revenue || 1),
                      1
                    );
                    const revPct = Math.min(
                      100,
                      Math.max(4, Math.round((item.revenue / maxVal) * 100))
                    );
                    const profitVal = item.gross_profit ?? item.revenue;
                    const profitPct = Math.min(
                      100,
                      Math.max(2, Math.round((profitVal / maxVal) * 100))
                    );

                    return (
                      <div key={idx} className="space-y-1 text-xs">
                        <div className="flex justify-between font-medium text-zinc-600">
                          <span>{item.date}</span>
                          <span>
                            GH₵{item.revenue.toFixed(2)}{" "}
                            <span className="text-emerald-600 font-semibold ml-1">
                              (Profit: GH₵{(item.gross_profit ?? 0).toFixed(2)})
                            </span>
                          </span>
                        </div>
                        <div className="h-4 w-full bg-zinc-100 rounded-full overflow-hidden flex relative">
                          <div
                            style={{ width: `${revPct}%` }}
                            className="h-full bg-green-500/30 rounded-full"
                          />
                          <div
                            style={{ width: `${profitPct}%` }}
                            className="h-full bg-emerald-600 rounded-full absolute top-0 left-0"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-400">
                  <FileSpreadsheet className="h-8 w-8 mb-2 text-zinc-300" />
                  <p className="text-sm font-medium">No daily trends recorded</p>
                  <p className="text-xs text-zinc-400">
                    No transactions found for the selected period.
                  </p>
                </div>
              )}
            </div>

            {/* Payment Method Breakdown */}
            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col gap-4">
              <div>
                <h3 className="font-heading font-semibold text-zinc-900 text-base">
                  Payment Channels
                </h3>
                <p className="text-xs text-zinc-500">
                  Distribution of received payments
                </p>
              </div>

              {parsedPaymentBreakdown.length > 0 ? (
                <div className="space-y-3 divide-y divide-zinc-100">
                  {parsedPaymentBreakdown.map((item, idx) => {
                    const Icon = getMethodIcon(item.method);
                    const totalRev = report?.revenue || 1;
                    const pct =
                      item.percentage ??
                      Math.round((item.amount / totalRev) * 100);

                    return (
                      <div key={idx} className="pt-3 first:pt-0 space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-zinc-100 text-zinc-700">
                              <Icon className="h-4 w-4" />
                            </div>
                            <span className="font-medium text-zinc-800 capitalize">
                              {(item.method || "Other").replace(/_/g, " ")}
                            </span>
                          </div>
                          <span className="font-bold text-zinc-900">
                            GH₵{item.amount.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
                              className="h-full bg-green-600 rounded-full"
                            />
                          </div>
                          <span className="text-xs text-zinc-400 font-semibold w-8 text-right">
                            {pct}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-400">
                  <CreditCard className="h-8 w-8 mb-2 text-zinc-300" />
                  <p className="text-sm font-medium">No payment data</p>
                  <p className="text-xs text-zinc-400">
                    Payment distribution will appear here.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Top Profitable Products */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden p-5 space-y-4">
            <div>
              <h3 className="font-heading font-semibold text-zinc-900 text-base">
                Top Profitable Products
              </h3>
              <p className="text-xs text-zinc-500">
                Products generating the highest profit margins & revenue
              </p>
            </div>

            {report?.top_profitable_products &&
            report.top_profitable_products.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b border-zinc-200 bg-zinc-50/70 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3 text-right">Units Sold</th>
                      <th className="px-4 py-3 text-right">Total Revenue</th>
                      <th className="px-4 py-3 text-right">COGS</th>
                      <th className="px-4 py-3 text-right">Gross Profit</th>
                      <th className="px-4 py-3 text-right">Margin %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-sm">
                    {report.top_profitable_products.map((prod, idx) => {
                      const cost = prod.cost ?? 0;
                      const profit = prod.profit ?? prod.revenue - cost;
                      const margin =
                        prod.profit_margin_pct ??
                        (prod.revenue > 0
                          ? (profit / prod.revenue) * 100
                          : 0);

                      return (
                        <tr
                          key={idx}
                          className="hover:bg-zinc-50 transition-colors"
                        >
                          <td className="px-4 py-3 font-semibold text-zinc-900">
                            {prod.product_name}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-zinc-700">
                            {prod.units_sold}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-zinc-900">
                            GH₵{prod.revenue.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right text-zinc-500">
                            GH₵{cost.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-600">
                            GH₵{profit.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span
                              className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold",
                                margin >= 25
                                  ? "bg-green-100 text-green-800"
                                  : margin >= 10
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-zinc-100 text-zinc-700"
                              )}
                            >
                              {margin.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center text-zinc-400 border border-dashed border-zinc-200 rounded-xl">
                <Package className="h-8 w-8 mb-2 text-zinc-300" />
                <p className="text-sm font-medium">No sales data for products</p>
                <p className="text-xs text-zinc-400">
                  Top performing items will be listed here after transactions.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
