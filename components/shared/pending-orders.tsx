"use client";

import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2,
  Clock,
  Plus,
  CreditCard,
  X,
  Check,
  Search,
  Ban,
  User,
  Phone,
  Store,
  ReceiptText,
  Sparkles,
  ArrowUpRight,
  Minus,
  CheckCircle2,
  Wallet,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTransactions, Transaction } from "@/components/shared/transactions-list";
import { cn, getErrorMessage } from "@/lib/utils";
import Link from "next/link";

/**
 * Brand Palette
 * - Dusk Blue:       #26547C
 * - Bubblegum Pink:  #EF476F
 * - Golden Pollen:   #FFD166
 * - Emerald:         #06D6A0 (Primary)
 * - Porcelain:       #FFFCF9 (Surface / Background)
 */

interface InventoryItem {
  _id: string;
  product_name: string;
  product_price: number;
  amount_available: number;
  is_available: boolean;
}

function useInventory() {
  return useQuery<InventoryItem[]>({
    queryKey: ["inventory"],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/inventory/get_my_shop_inventory");
      return data;
    },
    staleTime: 5 * 60 * 1000,
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

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

type PanelMode = "add" | "pay" | "cancel" | null;

function OrderCard({ order }: { order: Transaction }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<PanelMode>(null);

  // Add Item State
  const { data: inventory = [] } = useInventory();
  const [search, setSearch] = useState("");
  const [addQty, setAddQty] = useState(1);
  const [editNote, setEditNote] = useState(order.note ?? "");

  const available = inventory.filter((p) => p.is_available);
  const filtered = search.trim()
    ? available.filter((p) => p.product_name.toLowerCase().includes(search.toLowerCase()))
    : available;
  const selected = available.find((p) => p.product_name === search);

  const addItemMutation = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      const { data } = await api.post(`/api/v1/transactions/${order._id}/add-items`, {
        items: [
          {
            product_id: selected._id,
            product_name: selected.product_name,
            unit_price: selected.product_price,
            quantity: addQty,
            subtotal: selected.product_price * addQty,
          },
        ],
        note: editNote.trim() || null,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success(`Added ${selected?.product_name} to order`);
      setSearch("");
      setAddQty(1);
      setMode(null);
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, "Failed to add item")),
  });

  // Complete Payment State
  const [payMode, setPayMode] = useState<"cash" | "momo" | "card">("cash");
  const [sendSms, setSendSms] = useState(true);

  const payMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/api/v1/transactions/${order._id}/complete-payment`, {
        payment_mode: payMode,
        send_sms: sendSms,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
      toast.success("Payment recorded successfully!");
      setMode(null);
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, "Failed to record payment")),
  });

  // Cancel Order State
  const [reason, setReason] = useState("");

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/api/v1/transactions/${order._id}/cancel`, {
        reason: reason.trim(),
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
      toast.success("Order cancelled and items returned to stock");
      setMode(null);
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, "Failed to cancel order")),
  });

  const initials = (order.customer_name || "Guest")
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="bg-[#FFFCF9] rounded-3xl border border-zinc-200/80 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group">
      <div>
        {/* Card Top: Customer Identity & Total Price */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-zinc-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-[#26547C] to-[#163855] text-white font-black text-sm flex items-center justify-center shrink-0 shadow-2xs">
              {initials}
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-zinc-900 text-base truncate group-hover:text-[#26547C] transition-colors">
                {order.customer_name || "Walk-in Customer"}
              </h3>
              <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-zinc-400">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-[#06D6A0]" />
                  {formatRelativeTime(order.created_at)}
                </span>
                <span>•</span>
                <span>{formatDate(order.created_at)}</span>
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 bg-[#FFD166]/30 px-2 py-0.5 rounded-full border border-[#FFD166]/50 inline-block mb-1">
              Awaiting Payment
            </span>
            <p className="text-xl sm:text-2xl font-black text-[#26547C] tracking-tight">
              GH₵{order.total_price.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Customer Phone & Branch Info Meta Bar */}
        <div className="flex flex-wrap items-center gap-3 py-2.5 px-3 bg-white rounded-xl border border-zinc-100 mt-3 text-xs text-zinc-500">
          {order.customer_number ? (
            <span className="flex items-center gap-1 font-semibold text-zinc-700">
              <Phone className="h-3.5 w-3.5 text-[#06D6A0]" />
              {order.customer_number}
            </span>
          ) : (
            <span className="text-zinc-400 italic">No phone attached</span>
          )}

          {order.branch_name && (
            <span className="flex items-center gap-1 text-zinc-600 font-medium ml-auto">
              <Store className="h-3.5 w-3.5 text-[#26547C]" />
              {order.branch_name}
            </span>
          )}

          <span className="text-zinc-400 ml-auto sm:ml-0">
            Cashier: <strong className="text-zinc-700 font-bold">{order.processed_by}</strong>
          </span>
        </div>

        {/* Note Alert if present */}
        {order.note && (
          <div className="mt-3 p-2.5 rounded-xl bg-[#FFD166]/15 border border-[#FFD166]/40 text-xs text-amber-950 flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
            <p>
              <strong className="font-bold">Tab Note:</strong> {order.note}
            </p>
          </div>
        )}

        {/* Items List */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-[#26547C]/70 pb-1 border-b border-zinc-100">
            <span>Ordered Items ({order.items.length})</span>
            <span>Subtotal</span>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
            {order.items.map((item, idx) => (
              <div
                key={`${item.product_id}-${idx}`}
                className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                <div className="min-w-0 pr-2">
                  <span className="font-bold text-zinc-800 truncate block">
                    {item.product_name}
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    GH₵{item.unit_price.toFixed(2)} × {item.quantity}
                  </span>
                </div>
                <span className="font-extrabold text-[#26547C] shrink-0">
                  GH₵{item.subtotal.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Drawer Panels */}
      <div className="mt-5 pt-4 border-t border-zinc-100">
        {mode === null && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={() => setMode("pay")}
              className="flex-1 h-10 rounded-xl bg-[#06D6A0] hover:bg-[#05b88a] text-zinc-950 font-black shadow-xs gap-1.5 cursor-pointer text-xs"
            >
              <CreditCard className="h-4 w-4" />
              Complete Payment
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setMode("add")}
              className="h-10 rounded-xl border-[#26547C]/30 text-[#26547C] hover:bg-white hover:border-[#26547C] font-extrabold gap-1 cursor-pointer text-xs"
            >
              <Plus className="h-4 w-4 text-[#06D6A0]" />
              Add Item
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setMode("cancel")}
              className="h-10 rounded-xl border-[#EF476F]/30 bg-[#EF476F]/10 hover:bg-[#EF476F]/20 text-[#EF476F] font-extrabold gap-1 cursor-pointer text-xs"
            >
              <Ban className="h-3.5 w-3.5" />
              Cancel
            </Button>
          </div>
        )}

        {/* Panel Mode: Add Item to Order */}
        {mode === "add" && (
          <div className="bg-white rounded-2xl p-4 border border-zinc-200/90 shadow-2xs space-y-3 animate-in fade-in-50 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <span className="text-xs font-black text-[#26547C] uppercase tracking-wide flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5 text-[#06D6A0]" />
                Add Item to Tab
              </span>
              <button
                type="button"
                onClick={() => {
                  setMode(null);
                  setSearch("");
                }}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
              <Input
                placeholder="Search products in shop..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 rounded-xl"
                autoFocus
              />
              {search && !selected && (
                <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-xl max-h-44 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <p className="px-3 py-3 text-xs text-zinc-400 text-center">No matching products</p>
                  ) : (
                    filtered.map((p) => (
                      <button
                        key={p._id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setSearch(p.product_name)}
                        className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs hover:bg-[#FFFCF9] text-left border-b border-zinc-50 last:border-0"
                      >
                        <span className="font-bold text-zinc-800">{p.product_name}</span>
                        <span className="font-extrabold text-[#26547C]">GH₵{p.product_price.toFixed(2)}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {selected && (
              <div className="flex items-center justify-between p-2.5 bg-[#06D6A0]/10 border border-[#06D6A0]/30 rounded-xl text-xs">
                <span className="font-bold text-zinc-800">{selected.product_name}</span>
                <span className="font-black text-[#048866]">GH₵{(selected.product_price * addQty).toFixed(2)}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="flex items-center border border-zinc-200 rounded-xl bg-zinc-50 px-2 h-10">
                <span className="text-[11px] font-bold text-zinc-400 mr-2 uppercase">Qty</span>
                <button
                  type="button"
                  onClick={() => setAddQty((q) => Math.max(1, q - 1))}
                  className="h-6 w-6 rounded-md bg-white border border-zinc-200 flex items-center justify-center text-zinc-600 hover:bg-zinc-100"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-8 text-center font-black text-sm text-zinc-900">{addQty}</span>
                <button
                  type="button"
                  onClick={() => setAddQty((q) => q + 1)}
                  className="h-6 w-6 rounded-md bg-white border border-zinc-200 flex items-center justify-center text-zinc-600 hover:bg-zinc-100"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              <Input
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="Optional item note"
                className="h-10 rounded-xl flex-1 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setMode(null);
                  setSearch("");
                }}
                disabled={addItemMutation.isPending}
                className="h-9 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => addItemMutation.mutate()}
                disabled={!selected || addItemMutation.isPending}
                className="h-9 rounded-xl bg-[#06D6A0] hover:bg-[#05b88a] text-zinc-950 font-black"
              >
                {addItemMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <Check className="h-3.5 w-3.5 mr-1" />
                )}
                Confirm Add
              </Button>
            </div>
          </div>
        )}

        {/* Panel Mode: Complete Payment */}
        {mode === "pay" && (
          <div className="bg-white rounded-2xl p-4 border border-zinc-200/90 shadow-2xs space-y-3 animate-in fade-in-50 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <span className="text-xs font-black text-[#26547C] uppercase tracking-wide flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-[#06D6A0]" />
                Select Payment Method
              </span>
              <button type="button" onClick={() => setMode(null)} className="text-zinc-400 hover:text-zinc-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPayMode("cash")}
                className={cn(
                  "py-2.5 px-3 rounded-xl text-xs font-black border transition-all cursor-pointer text-center",
                  payMode === "cash"
                    ? "bg-[#06D6A0] border-[#06D6A0] text-zinc-950 shadow-xs"
                    : "bg-[#FFFCF9] border-zinc-200 text-zinc-700 hover:border-[#06D6A0]"
                )}
              >
                💵 Cash
              </button>
              <button
                type="button"
                onClick={() => setPayMode("momo")}
                className={cn(
                  "py-2.5 px-3 rounded-xl text-xs font-black border transition-all cursor-pointer text-center",
                  payMode === "momo"
                    ? "bg-[#EF476F] border-[#EF476F] text-white shadow-xs"
                    : "bg-[#FFFCF9] border-zinc-200 text-zinc-700 hover:border-[#EF476F]"
                )}
              >
                📱 MoMo
              </button>
              <button
                type="button"
                onClick={() => setPayMode("card")}
                className={cn(
                  "py-2.5 px-3 rounded-xl text-xs font-black border transition-all cursor-pointer text-center",
                  payMode === "card"
                    ? "bg-[#26547C] border-[#26547C] text-white shadow-xs"
                    : "bg-[#FFFCF9] border-zinc-200 text-zinc-700 hover:border-[#26547C]"
                )}
              >
                💳 Card / POS
              </button>
            </div>

            {order.customer_number && (
              <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={sendSms}
                  onChange={(e) => setSendSms(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 accent-[#06D6A0] cursor-pointer"
                />
                <span className="text-xs font-medium text-zinc-600">
                  Send instant SMS receipt to <strong className="text-zinc-800">{order.customer_number}</strong>
                </span>
              </label>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMode(null)}
                disabled={payMutation.isPending}
                className="h-9 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => payMutation.mutate()}
                disabled={payMutation.isPending}
                className="h-9 rounded-xl bg-[#06D6A0] hover:bg-[#05b88a] text-zinc-950 font-black"
              >
                {payMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <Check className="h-3.5 w-3.5 mr-1" />
                )}
                Confirm GH₵{order.total_price.toFixed(2)} Paid
              </Button>
            </div>
          </div>
        )}

        {/* Panel Mode: Cancel Order */}
        {mode === "cancel" && (
          <div className="bg-white rounded-2xl p-4 border border-rose-200 shadow-2xs space-y-3 animate-in fade-in-50 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <span className="text-xs font-black text-[#EF476F] uppercase tracking-wide flex items-center gap-1.5">
                <Ban className="h-3.5 w-3.5 text-[#EF476F]" />
                Cancel Pending Order
              </span>
              <button type="button" onClick={() => setMode(null)} className="text-zinc-400 hover:text-zinc-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-zinc-700">Reason for Cancellation *</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Customer walked away, changed mind, order duplicate"
                className="h-10 rounded-xl text-xs"
                autoFocus
              />
              <p className="text-[11px] text-zinc-400">
                Items will automatically be returned to stock inventory.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMode(null)}
                disabled={cancelMutation.isPending}
                className="h-9 rounded-xl"
              >
                Back
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending || reason.trim().length < 3}
                className="h-9 rounded-xl bg-[#EF476F] hover:bg-[#c7264e] text-white font-black"
              >
                {cancelMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <Ban className="h-3.5 w-3.5 mr-1" />
                )}
                Confirm Cancellation
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function PendingOrders() {
  const { data: orders = [], isLoading, isError } = useTransactions({ status: "pending" });
  const [searchTerm, setSearchTerm] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");

  // Summary Metrics
  const summary = useMemo(() => {
    const totalPendingVal = orders.reduce((acc, o) => acc + o.total_price, 0);
    const totalItems = orders.reduce((acc, o) => acc + o.items.reduce((s, i) => s + i.quantity, 0), 0);
    const branchesSet = new Set(orders.map((o) => o.branch_name).filter(Boolean));

    return {
      totalPendingVal,
      totalCount: orders.length,
      totalItems,
      branchesCount: branchesSet.size,
    };
  }, [orders]);

  // Distinct branches for filtering
  const distinctBranches = useMemo(() => {
    return Array.from(new Set(orders.map((o) => o.branch_name).filter(Boolean))) as string[];
  }, [orders]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch =
        !searchTerm.trim() ||
        (o.customer_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.customer_number || "").includes(searchTerm) ||
        o.items.some((i) => i.product_name.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesBranch =
        branchFilter === "all" ||
        (o.branch_name || "").toLowerCase() === branchFilter.toLowerCase();

      return matchesSearch && matchesBranch;
    });
  }, [orders, searchTerm, branchFilter]);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      {/* Top Header & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFD166]/25 border border-[#FFD166]/50 text-amber-950 text-xs font-black mb-1 shadow-2xs">
            <Clock className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
            Active Customer Tabs
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#26547C] tracking-tight">
            Pending Orders & Tabs
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
            Manage open store tabs, append ordered items, or finalize customer checkout
          </p>
        </div>

        <Link
          href="/dashboard/admin/transactions"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-200 text-[#26547C] text-xs font-extrabold shadow-xs transition-all hover:border-[#26547C]/40 cursor-pointer self-start sm:self-auto"
        >
          <ReceiptText className="h-3.5 w-3.5 text-[#06D6A0]" />
          View Completed Ledger
        </Link>
      </div>

      {/* 3 Executive Summary KPI Cards using the 5-Color Palette */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total Pending Revenue (Golden Pollen #FFD166) */}
        <div className="rounded-3xl bg-gradient-to-br from-[#FFD166] via-[#f7c54a] to-[#e0ab2d] p-5 text-zinc-950 shadow-lg shadow-[#FFD166]/25 flex items-start justify-between">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-900/80">Uncollected Balance</span>
            <h3 className="text-2xl sm:text-3xl font-black mt-1 tracking-tight">
              GH₵{summary.totalPendingVal.toFixed(2)}
            </h3>
            <p className="text-xs font-bold text-amber-950/70 mt-1">
              Across {summary.totalCount} open order{summary.totalCount !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-zinc-950/10 backdrop-blur-xs text-zinc-950">
            <Wallet className="h-6 w-6" />
          </div>
        </div>

        {/* Card 2: Open Tabs Count (Dusk Blue #26547C) */}
        <div className="rounded-3xl bg-gradient-to-br from-[#26547C] via-[#1f476b] to-[#163855] p-5 text-white shadow-lg shadow-[#26547C]/25 flex items-start justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200">Open Tabs Awaiting</span>
            <h3 className="text-2xl sm:text-3xl font-black mt-1 tracking-tight">
              {summary.totalCount} Tab{summary.totalCount !== 1 ? "s" : ""}
            </h3>
            <p className="text-xs font-medium text-blue-200/80 mt-1">
              Total of {summary.totalItems} product item{summary.totalItems !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs text-[#06D6A0]">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        {/* Card 3: Store Status / Branches (Emerald #06D6A0) */}
        <div className="rounded-3xl bg-gradient-to-br from-[#06D6A0] via-[#05b88a] to-[#038562] p-5 text-white shadow-lg shadow-[#06D6A0]/25 flex items-start justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-100">Live Status</span>
            <h3 className="text-2xl sm:text-3xl font-black mt-1 tracking-tight">
              {summary.totalCount > 0 ? "Tabs Active" : "All Clear"}
            </h3>
            <p className="text-xs font-medium text-emerald-100/90 mt-1">
              {summary.totalCount > 0
                ? "Immediate checkout required"
                : "No outstanding balances pending"}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-xs text-white">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#FFFCF9] p-3 rounded-2xl border border-zinc-200/80 shadow-2xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by customer name, phone number, or item..."
            className="pl-10 h-10 rounded-xl border-zinc-200 bg-white text-xs"
          />
        </div>

        {distinctBranches.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setBranchFilter("all")}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border whitespace-nowrap",
                branchFilter === "all"
                  ? "bg-[#26547C] text-white border-transparent"
                  : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
              )}
            >
              All Branches
            </button>
            {distinctBranches.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBranchFilter(b)}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border whitespace-nowrap",
                  branchFilter.toLowerCase() === b.toLowerCase()
                    ? "bg-[#26547C] text-white border-transparent"
                    : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
                )}
              >
                {b}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-zinc-400">
          <Loader2 className="h-7 w-7 animate-spin text-[#06D6A0]" />
          <p className="text-xs font-bold text-zinc-500">Retrieving open tabs...</p>
        </div>
      ) : isError ? (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-6 text-center text-rose-700 text-sm">
          Failed to load pending orders. Please refresh the page.
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-300 bg-[#FFFCF9] py-20 px-4 text-center shadow-2xs">
          <div className="h-16 w-16 rounded-full bg-[#06D6A0]/15 border border-[#06D6A0]/30 flex items-center justify-center text-[#048866] mb-3">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <p className="text-base font-extrabold text-[#26547C]">
            {searchTerm ? "No matching tabs found" : "All customer tabs settled!"}
          </p>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm">
            {searchTerm
              ? "Try adjusting your search query or clear the filter to view all orders."
              : "Great job! There are no unpaid customer tabs or pending orders in your store right now."}
          </p>
          {searchTerm && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setBranchFilter("all");
              }}
              className="mt-4 rounded-xl text-xs"
            >
              Clear Search Filter
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOrders.map((order) => (
            <OrderCard key={order._id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
