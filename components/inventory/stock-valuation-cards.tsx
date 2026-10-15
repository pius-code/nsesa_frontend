"use client";

import { useMemo } from "react";
import {
  Wallet,
  TrendingUp,
  Package,
  Building2,
  ArrowUpRight,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface InventoryItemForValuation {
  _id: string;
  product_name: string;
  product_price: number;
  cost_price?: number | null;
  amount_available: number;
  is_available: boolean;
  branch_name?: string | null;
  category_name?: string | null;
}

export interface BranchOption {
  id: string;
  branch_name: string;
  is_main?: boolean;
}

interface StockValuationCardsProps {
  inventory: InventoryItemForValuation[];
  branches?: BranchOption[];
  selectedBranch?: string;
  className?: string;
}

function formatGHS(val: number): string {
  return "GH₵ " + (val || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCompactGHS(val: number): string {
  if (Math.abs(val) >= 1_000_000) {
    return "GH₵ " + (val / 1_000_000).toFixed(2) + "M";
  }
  if (Math.abs(val) >= 10_000) {
    return "GH₵ " + (val / 1_000).toFixed(1) + "k";
  }
  return formatGHS(val);
}

export function StockValuationCards({
  inventory,
  branches = [],
  selectedBranch = "all",
  className,
}: StockValuationCardsProps) {
  const mainBranchName = useMemo(() => {
    const main = branches.find((b) => b.is_main);
    return main ? main.branch_name : "Main Branch";
  }, [branches]);

  const metrics = useMemo(() => {
    let totalRetail = 0;
    let totalCost = 0;
    let totalUnits = 0;
    let healthyCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    let itemsWithCostCount = 0;
    let retailWithCost = 0;

    const categoryMap = new Map<string, number>();
    const branchMap = new Map<string, number>();

    // Seed branchMap with all registered shop branches so even empty branches appear cleanly
    branches.forEach((b) => {
      branchMap.set(b.branch_name, 0);
    });

    inventory.forEach((item) => {
      const qty = Math.max(0, item.amount_available || 0);
      const retailPrice = item.product_price || 0;
      const hasCost = item.cost_price != null && item.cost_price > 0;
      const costPrice = hasCost ? (item.cost_price as number) : 0;

      const itemRetailVal = qty * retailPrice;
      const itemCostVal = qty * costPrice;

      totalRetail += itemRetailVal;
      totalUnits += qty;

      if (hasCost) {
        totalCost += itemCostVal;
        itemsWithCostCount++;
        retailWithCost += itemRetailVal;
      }

      if (qty === 0) {
        outOfStockCount++;
      } else if (qty <= 5) {
        lowStockCount++;
      } else {
        healthyCount++;
      }

      if (qty > 0) {
        // Category grouping
        const cat = item.category_name || "Uncategorized";
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + itemRetailVal);

        // Branch normalization: map null, empty, "main", "main branch" to the shop's actual main branch
        let br = item.branch_name?.trim();
        if (!br || br.toLowerCase() === "main" || br.toLowerCase() === "main branch") {
          br = mainBranchName;
        }
        branchMap.set(br, (branchMap.get(br) || 0) + itemRetailVal);
      }
    });

    // Honest Margin: Calculated on items that actually have cost prices recorded
    const profitOnTracked = retailWithCost - totalCost;
    const marginPercent = retailWithCost > 0 ? (profitOnTracked / retailWithCost) * 100 : 0;
    const missingCostCount = inventory.length - itemsWithCostCount;

    // Top categories
    const sortedCategories = Array.from(categoryMap.entries())
      .map(([name, val]) => ({
        name,
        value: val,
        share: totalRetail > 0 ? (val / totalRetail) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);

    // Branch allocation
    const sortedBranches = Array.from(branchMap.entries())
      .map(([name, val]) => ({
        name,
        value: val,
        share: totalRetail > 0 ? (val / totalRetail) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);

    return {
      totalRetail,
      totalCost,
      marginPercent,
      itemsWithCostCount,
      missingCostCount,
      profitOnTracked,
      totalUnits,
      healthyCount,
      lowStockCount,
      outOfStockCount,
      topCategories: sortedCategories.slice(0, 3),
      branchAllocation: sortedBranches,
    };
  }, [inventory, branches, mainBranchName]);

  const activeBranchLabel =
    selectedBranch === "all"
      ? "All Branches"
      : selectedBranch;

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", className)} suppressHydrationWarning>
      {/* 1. TOTAL RETAIL WORTH */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Retail Stock Value
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              <ArrowUpRight className="h-3 w-3" /> Realization
            </span>
          </div>

          <div className="mb-1">
            <p className="text-2xl sm:text-3xl font-heading font-extrabold text-zinc-900 tracking-tight tabular-nums" suppressHydrationWarning>
              {formatCompactGHS(metrics.totalRetail)}
            </p>
            <p className="text-[11px] text-zinc-500 font-mono mt-0.5" suppressHydrationWarning>
              Exact: {formatGHS(metrics.totalRetail)}
            </p>
          </div>
        </div>

        {/* Top categories breakdown */}
        <div className="pt-3.5 mt-3.5 border-t border-zinc-100 space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            Top Categories by Value
          </p>
          {metrics.topCategories.length > 0 ? (
            metrics.topCategories.map((c) => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <span className="text-zinc-600 truncate max-w-[120px] font-medium" title={c.name}>
                  {c.name}
                </span>
                <span className="font-semibold text-zinc-900 tabular-nums">
                  {formatCompactGHS(c.value)}{" "}
                  <span className="text-[10px] font-normal text-zinc-400 font-mono">
                    ({c.share.toFixed(0)}%)
                  </span>
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-zinc-400 italic">No products in stock</p>
          )}
        </div>
      </div>

      {/* 2. COST VALUE & CAPITAL INVESTED */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Capital Invested (Cost)
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200">
              <Wallet className="h-3 w-3" /> Wholesale
            </span>
          </div>

          <div className="mb-1">
            <p className="text-2xl sm:text-3xl font-heading font-extrabold text-zinc-900 tracking-tight tabular-nums" suppressHydrationWarning>
              {formatCompactGHS(metrics.totalCost)}
            </p>
            <p className="text-[11px] text-zinc-500 font-mono mt-0.5" suppressHydrationWarning>
              Exact: {formatGHS(metrics.totalCost)}
            </p>
          </div>
        </div>

        {/* Honest Profit & Margin */}
        <div className="pt-3.5 mt-3.5 border-t border-zinc-100 space-y-1.5">
          {metrics.itemsWithCostCount > 0 ? (
            <>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500 font-medium">Recorded Markup:</span>
                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/50 tabular-nums">
                  <TrendingUp className="h-3 w-3" /> {metrics.marginPercent.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-zinc-500">
                <span>Cost Tracked:</span>
                <span className="font-medium text-zinc-700">
                  {metrics.itemsWithCostCount} of {inventory.length} item{inventory.length !== 1 ? "s" : ""}
                </span>
              </div>
              {metrics.missingCostCount > 0 && (
                <p className="text-[10px] text-amber-600 flex items-center gap-1 font-medium pt-0.5">
                  <Info className="h-3 w-3 shrink-0" />
                  {metrics.missingCostCount} product{metrics.missingCostCount !== 1 ? "s" : ""} missing cost price
                </p>
              )}
            </>
          ) : (
            <div className="space-y-1 text-xs">
              <span className="text-zinc-400 italic block">Cost prices not entered</span>
              <p className="text-[10px] text-zinc-400">
                Add cost prices to view margins &amp; net profit
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 3. PHYSICAL VOLUME & INVENTORY HEALTH */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Physical Stock Volume
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
              <Package className="h-3 w-3" /> Items
            </span>
          </div>

          <div className="mb-1">
            <p className="text-2xl sm:text-3xl font-heading font-extrabold text-zinc-900 tracking-tight tabular-nums" suppressHydrationWarning>
              {metrics.totalUnits.toLocaleString("en-US")}{" "}
              <span className="text-sm font-semibold text-zinc-500 uppercase">Units</span>
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Across {inventory.length} distinct product {inventory.length === 1 ? "line" : "lines"}
            </p>
          </div>
        </div>

        {/* Operational Health Status */}
        <div className="pt-3.5 mt-3.5 border-t border-zinc-100 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-zinc-600 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Healthy (&gt;5)
            </span>
            <span className="font-semibold text-zinc-900 tabular-nums">
              {metrics.healthyCount}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-amber-700 font-medium">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              Low Stock (1-5)
            </span>
            <span className="font-bold text-amber-800 tabular-nums">
              {metrics.lowStockCount}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-red-600 font-medium">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Out of Stock
            </span>
            <span className="font-bold text-red-700 tabular-nums">
              {metrics.outOfStockCount}
            </span>
          </div>
        </div>
      </div>

      {/* 4. ALLOCATION: PER-BRANCH OR CATEGORY DIVERSITY */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              {selectedBranch === "all" ? "Branch Allocation" : "Active Branch View"}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200">
              <Building2 className="h-3 w-3" /> {activeBranchLabel}
            </span>
          </div>

          <div className="mb-1">
            <p className="text-2xl sm:text-3xl font-heading font-extrabold text-zinc-900 tracking-tight tabular-nums" suppressHydrationWarning>
              {selectedBranch === "all"
                ? `${metrics.branchAllocation.length} ${metrics.branchAllocation.length === 1 ? "Branch" : "Branches"}`
                : `${inventory.length} ${inventory.length === 1 ? "Product" : "Products"}`}
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {selectedBranch === "all"
                ? "Enterprise distribution across branches"
                : `Dedicated valuation for ${activeBranchLabel}`}
            </p>
          </div>
        </div>

        {/* Branch Allocation with clean wrapping and no clashing */}
        <div className="pt-3.5 mt-3.5 border-t border-zinc-100 space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            {selectedBranch === "all" ? "Valuation by Branch" : "Category Spread"}
          </p>

          {selectedBranch === "all" ? (
            metrics.branchAllocation.length > 0 ? (
              metrics.branchAllocation.map((b) => (
                <div key={b.name} className="flex items-center justify-between text-xs py-0.5">
                  <span className="text-zinc-700 font-medium truncate pr-2 max-w-[130px]" title={b.name}>
                    {b.name}
                  </span>
                  <div className="shrink-0 text-right tabular-nums">
                    <span className="font-semibold text-zinc-900">{formatCompactGHS(b.value)}</span>
                    <span className="text-[10px] text-zinc-400 font-mono ml-1">({b.share.toFixed(0)}%)</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-zinc-400 italic">No branch stock data</p>
            )
          ) : (
            metrics.topCategories.length > 0 ? (
              metrics.topCategories.map((c) => (
                <div key={c.name} className="flex items-center justify-between text-xs py-0.5">
                  <span className="text-zinc-700 font-medium truncate pr-2 max-w-[130px]" title={c.name}>
                    {c.name}
                  </span>
                  <span className="font-semibold text-zinc-900 shrink-0 tabular-nums">
                    {c.share.toFixed(1)}%
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-zinc-400 italic">No categories assigned</p>
            )
          )}
        </div>
      </div>
    </div>
  );
}
