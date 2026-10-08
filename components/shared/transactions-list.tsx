"use client";
import { getErrorMessage } from "@/lib/utils";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  ReceiptText,
  Pencil,
  RotateCcw,
  Trash2,
  Check,
  X,
  History,
  ExternalLink,
  Send,
  Smartphone,
  Banknote,
  Building2,
  CreditCard,
  Calendar,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import api from "@/lib/axios";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface TransactionItem {
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
}

export interface Transaction {
  _id: string;
  receipt_id: string | null;
  customer_name: string;
  customer_number: string | null;
  customer_email: string | null;
  note: string | null;
  items: TransactionItem[];
  total_price: number;
  payment_mode: string | null;
  processed_by: string;
  status: string;
  created_at: string;
  at_shop: string;
}

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  processedBy?: string;
  status?: string;
}

export function useTransactions(filters: TransactionFilters = {}) {
  const { startDate, endDate, processedBy, status } = filters;
  return useQuery<Transaction[]>({
    queryKey: ["transactions", startDate, endDate, processedBy, status],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/return_my_shop_transactions", {
        params: {
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          processed_by: processedBy || undefined,
          status: status || undefined,
        },
      });
      return data;
    },
    staleTime: 60 * 1000,
  });
}

function useProcessedByOptions() {
  return useQuery<string[]>({
    queryKey: ["transactions-processed-by-options"],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/transactions/processed_by_options");
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

function errorMessage(err: unknown, fallback: string): string {
  return getErrorMessage(err, fallback);
}

interface AuditChange {
  old: unknown;
  new: unknown;
}

interface AuditEntry {
  _id: string;
  action: "deleted" | "refunded" | "edited" | "receipt_resent" | "payment_completed" | "cancelled";
  performed_by_name: string;
  reason: string;
  changes: Record<string, AuditChange> | null;
  created_at: string;
}

function useTransactionAudit(transactionId: string, enabled: boolean) {
  return useQuery<AuditEntry[]>({
    queryKey: ["transaction-audit", transactionId],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/transactions/${transactionId}/audit`);
      return data;
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

function formatChangeEntry(field: string, change: AuditChange) {
  if (field === "items") {
    const oldCount = Array.isArray(change.old) ? change.old.length : 0;
    const newCount = Array.isArray(change.new) ? change.new.length : 0;
    return `Items: ${oldCount} line${oldCount !== 1 ? "s" : ""} → ${newCount} line${newCount !== 1 ? "s" : ""}`;
  }
  if (field === "total_price") {
    return `Total: GH₵${Number(change.old).toFixed(2)} → GH₵${Number(change.new).toFixed(2)}`;
  }
  const label = field.replace(/_/g, " ");
  return `${label}: ${change.old ?? "—"} → ${change.new ?? "—"}`;
}

function actionBadgeVariant(action: AuditEntry["action"]) {
  if (action === "deleted" || action === "cancelled") return "destructive" as const;
  if (action === "refunded" || action === "receipt_resent") return "secondary" as const;
  if (action === "payment_completed") return "default" as const;
  return "default" as const;
}

function actionLabel(action: AuditEntry["action"]) {
  return action.replace(/_/g, " ");
}

function TransactionLogs({ transactionId }: { transactionId: string }) {
  const [open, setOpen] = useState(false);
  const { data: entries = [], isLoading } = useTransactionAudit(transactionId, open);

  return (
    <div className="pt-3 mt-3 border-t border-zinc-100" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-700 transition-colors"
      >
        <History className="h-3.5 w-3.5" />
        Logs
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {isLoading ? (
            <p className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading logs...
            </p>
          ) : entries.length === 0 ? (
            <p className="text-xs text-zinc-400">No changes have been logged for this transaction.</p>
          ) : (
            entries.map((entry) => (
              <div key={entry._id} className="rounded-lg bg-zinc-50 border border-zinc-100 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={actionBadgeVariant(entry.action)} className="capitalize text-[10px]">
                    {actionLabel(entry.action)}
                  </Badge>
                  <span className="text-xs text-zinc-400">{formatDate(entry.created_at)}</span>
                </div>
                <p className="mt-1.5 text-xs text-zinc-700">
                  <span className="font-medium">{entry.performed_by_name}</span>: {entry.reason}
                </p>
                {entry.changes && (
                  <ul className="mt-1.5 space-y-0.5 text-xs text-zinc-500">
                    {Object.entries(entry.changes).map(([field, change]) => (
                      <li key={field}>{formatChangeEntry(field, change)}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === "success" ? "default" : status === "pending" ? "warning" : "secondary";
  return (
    <Badge variant={variant} className="capitalize text-xs">
      {status}
    </Badge>
  );
}

function PaymentModeBadge({ mode }: { mode: string | null | undefined }) {
  if (!mode) {
    return <span className="text-[11px] text-zinc-400 italic">Unspecified</span>;
  }
  const cleanMode = mode.toLowerCase();
  if (cleanMode.includes("momo") || cleanMode.includes("mobile")) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
        <Smartphone className="h-3 w-3 text-amber-600" />
        MoMo
      </span>
    );
  }
  if (cleanMode.includes("cash")) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
        <Banknote className="h-3 w-3 text-emerald-600" />
        Cash
      </span>
    );
  }
  if (cleanMode.includes("bank") || cleanMode.includes("transfer")) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
        <Building2 className="h-3 w-3 text-blue-600" />
        Bank
      </span>
    );
  }
  if (cleanMode.includes("card") || cleanMode.includes("pos")) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-800 border border-purple-200">
        <CreditCard className="h-3 w-3 text-purple-600" />
        Card
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-700">
      {mode}
    </span>
  );
}

function ItemsTable({ items }: { items: TransactionItem[] }) {
  return (
    <div className="mt-3 rounded-lg overflow-hidden border border-zinc-200">
      <table className="w-full text-xs">
        <thead className="bg-zinc-50">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-zinc-500">Product</th>
            <th className="px-3 py-2 text-right font-medium text-zinc-500">Unit Price</th>
            <th className="px-3 py-2 text-right font-medium text-zinc-500">Qty</th>
            <th className="px-3 py-2 text-right font-medium text-zinc-500">Subtotal</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 bg-white">
          {items.map((item) => (
            <tr key={item.product_id}>
              <td className="px-3 py-2 text-zinc-700">{item.product_name}</td>
              <td className="px-3 py-2 text-right text-zinc-600">GH₵{item.unit_price.toFixed(2)}</td>
              <td className="px-3 py-2 text-right text-zinc-600">{item.quantity}</td>
              <td className="px-3 py-2 text-right font-medium text-zinc-800">GH₵{item.subtotal.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TransactionNote({ note }: { note: string | null }) {
  if (!note) return null;
  return (
    <div className="mt-3 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-sm text-amber-800">
      <span className="font-semibold">Note:</span> {note}
    </div>
  );
}

function ReceiptActions({ tx }: { tx: Transaction }) {
  const queryClient = useQueryClient();
  const [resendOpen, setResendOpen] = useState(false);
  const [number, setNumber] = useState(tx.customer_number ?? "");

  const resendMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/api/v1/transactions/${tx._id}/resend-receipt`, {
        customer_number: number.trim(),
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Receipt resent");
      setResendOpen(false);
    },
    onError: (err: unknown) => toast.error(errorMessage(err, "Failed to resend receipt")),
  });

  if (!tx.receipt_id) return null;

  return (
    <div className="pt-3 mt-3 border-t border-zinc-100" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/receipts/${tx.receipt_id}`} target="_blank" rel="noopener noreferrer">
          <Button type="button" size="sm" variant="outline">
            <ExternalLink className="h-3.5 w-3.5 mr-1" />
            View Receipt
          </Button>
        </Link>
        {!resendOpen && (
          <Button type="button" size="sm" variant="outline" onClick={() => setResendOpen(true)}>
            <Send className="h-3.5 w-3.5 mr-1" />
            Resend Receipt
          </Button>
        )}
      </div>

      {resendOpen && (
        <div className="flex flex-col sm:flex-row gap-2 mt-2.5">
          <Input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="Customer phone number"
            className="sm:max-w-xs"
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setResendOpen(false)}
              disabled={resendMutation.isPending}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => resendMutation.mutate()}
              disabled={resendMutation.isPending || number.trim().length < 6}
            >
              {resendMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Send className="h-3.5 w-3.5 mr-1" />}
              Send
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

type ActionMode = "delete" | "refund" | "edit" | null;

function ManagePanel({ tx }: { tx: Transaction }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<ActionMode>(null);
  const [reason, setReason] = useState("");
  const [editName, setEditName] = useState(tx.customer_name);
  const [editNumber, setEditNumber] = useState(tx.customer_number ?? "");
  const [editEmail, setEditEmail] = useState(tx.customer_email ?? "");
  const [editNote, setEditNote] = useState(tx.note ?? "");

  function reset() {
    setMode(null);
    setReason("");
  }

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/api/v1/transactions/${tx._id}/delete`, { reason });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Transaction deleted");
      reset();
    },
    onError: (err: unknown) => toast.error(errorMessage(err, "Failed to delete transaction")),
  });

  const refundMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/api/v1/transactions/${tx._id}/refund`, { reason });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Transaction refunded");
      reset();
    },
    onError: (err: unknown) => toast.error(errorMessage(err, "Failed to refund transaction")),
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.patch(`/api/v1/transactions/${tx._id}`, {
        reason,
        customer_name: editName.trim() || null,
        customer_number: editNumber.trim() || null,
        customer_email: editEmail.trim() || null,
        note: editNote.trim() || null,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Transaction updated");
      reset();
    },
    onError: (err: unknown) => toast.error(errorMessage(err, "Failed to update transaction")),
  });

  const isPending = deleteMutation.isPending || refundMutation.isPending || editMutation.isPending;

  if (mode === null) {
    return (
      <div
        className="flex flex-wrap items-center gap-2 pt-3 mt-3 border-t border-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        <Button type="button" size="sm" variant="outline" onClick={() => setMode("edit")}>
          <Pencil className="h-3.5 w-3.5 mr-1" />
          Edit
        </Button>
        {tx.status === "success" && (
          <Button type="button" size="sm" variant="outline" onClick={() => setMode("refund")}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Refund
          </Button>
        )}
        <Button type="button" size="sm" variant="destructive" onClick={() => setMode("delete")}>
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          Delete
        </Button>
      </div>
    );
  }

  return (
    <div className="pt-3 mt-3 border-t border-zinc-100 space-y-2.5" onClick={(e) => e.stopPropagation()}>
      {mode === "edit" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Customer name" />
          <Input value={editNumber} onChange={(e) => setEditNumber(e.target.value)} placeholder="Phone" />
          <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Email" />
          <Input value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="Note (e.g. no pepper)" className="sm:col-span-3" />
        </div>
      )}
      <div className="space-y-1">
        <Label className="text-xs">
          Reason <span className="text-red-500">*</span>
        </Label>
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why are you making this change?"
          autoFocus
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="outline" onClick={reset} disabled={isPending}>
          <X className="h-3.5 w-3.5 mr-1" />
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "delete" ? "destructive" : "default"}
          disabled={isPending || reason.trim().length < 3}
          onClick={() => {
            if (mode === "delete") deleteMutation.mutate();
            else if (mode === "refund") refundMutation.mutate();
            else editMutation.mutate();
          }}
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
          Confirm {mode}
        </Button>
      </div>
    </div>
  );
}

function TransactionRow({ tx, canManage }: { tx: Transaction; canManage: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr
        className="cursor-pointer hover:bg-zinc-50 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <td className="px-4 py-3 text-sm text-zinc-600 whitespace-nowrap">
          {formatDate(tx.created_at)}
        </td>
        <td className="px-4 py-3">
          <p className="text-sm font-medium text-zinc-900">
            {tx.customer_name}
            {tx.customer_number && (
              <span className="ml-1.5 text-xs font-normal text-zinc-400">• {tx.customer_number}</span>
            )}
          </p>
        </td>
        <td className="px-4 py-3">
          <PaymentModeBadge mode={tx.payment_mode} />
        </td>
        <td className="px-4 py-3 text-sm text-zinc-600 text-center">
          {tx.items.length}
        </td>
        <td className="px-4 py-3 text-sm font-semibold text-emerald-600 whitespace-nowrap">
          GH₵{tx.total_price.toFixed(2)}
        </td>
        <td className="px-4 py-3">
          <StatusBadge status={tx.status} />
        </td>
        <td className="px-4 py-3 text-sm text-zinc-500">{tx.processed_by}</td>
        <td className="px-4 py-3 text-zinc-400 text-right">
          {open ? (
            <ChevronUp className="h-4 w-4 inline" />
          ) : (
            <ChevronDown className="h-4 w-4 inline" />
          )}
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={8} className="px-4 pb-4 pt-0 bg-zinc-50/50">
            <ItemsTable items={tx.items} />
            <TransactionNote note={tx.note} />
            <ReceiptActions tx={tx} />
            {canManage && <TransactionLogs transactionId={tx._id} />}
            {canManage && <ManagePanel tx={tx} />}
          </td>
        </tr>
      )}
    </>
  );
}

function TransactionCard({ tx, canManage }: { tx: Transaction; canManage: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-2xs">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left px-4 py-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-zinc-900 truncate">
              {tx.customer_name}
              {tx.customer_number && (
                <span className="ml-1.5 text-xs font-normal text-zinc-400">• {tx.customer_number}</span>
              )}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-zinc-400">
                {formatDate(tx.created_at)}
              </span>
              <PaymentModeBadge mode={tx.payment_mode} />
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="text-sm font-bold text-emerald-600">
              GH₵{tx.total_price.toFixed(2)}
            </span>
            <StatusBadge status={tx.status} />
          </div>
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
          <span>
            {tx.items.length} item{tx.items.length !== 1 ? "s" : ""}
          </span>
          <span>•</span>
          <span>by {tx.processed_by}</span>
          <span className="ml-auto text-zinc-400">
            {open ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </span>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-zinc-100 bg-zinc-50/50">
          <ItemsTable items={tx.items} />
          <TransactionNote note={tx.note} />
          <ReceiptActions tx={tx} />
          {canManage && <TransactionLogs transactionId={tx._id} />}
          {canManage && <ManagePanel tx={tx} />}
        </div>
      )}
    </div>
  );
}

const SELECT_CLASS =
  "flex h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600";

export function TransactionsList() {
  const { data: session } = useSession();
  const isWorker = session?.user?.worker_role === "worker";
  const shopName = session?.user?.worker_shop_name;
  const canManage = session?.user?.worker_role === "admin" || session?.user?.worker_role === "super_admin";

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Default to Today for immediate daily brief insight
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [processedBy, setProcessedBy] = useState("");
  const [status, setStatus] = useState("");

  const filters: TransactionFilters = { startDate, endDate, processedBy, status };
  const hasActiveFilters = Boolean(
    (startDate && startDate !== todayStr) ||
    (endDate && endDate !== todayStr) ||
    processedBy ||
    status
  );

  const { data: rawTransactions = [], isLoading, isError } = useTransactions(filters);
  const { data: peopleOptions = [] } = useProcessedByOptions();
  
  const transactions = useMemo(() => {
    return [...rawTransactions].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [rawTransactions]);

  // Compute Daily Brief & Payment Breakdown
  const summary = useMemo(() => {
    let totalGross = 0;
    let successfulCount = 0;
    let momoTotal = 0;
    let momoCount = 0;
    let cashTotal = 0;
    let cashCount = 0;
    let bankTotal = 0;
    let bankCount = 0;
    let cardTotal = 0;
    let cardCount = 0;
    let otherTotal = 0;
    let otherCount = 0;

    for (const tx of transactions) {
      if (tx.status === "success") {
        totalGross += tx.total_price;
        successfulCount += 1;

        const mode = (tx.payment_mode || "").toLowerCase();
        if (mode.includes("momo") || mode.includes("mobile")) {
          momoTotal += tx.total_price;
          momoCount += 1;
        } else if (mode.includes("cash")) {
          cashTotal += tx.total_price;
          cashCount += 1;
        } else if (mode.includes("bank") || mode.includes("transfer")) {
          bankTotal += tx.total_price;
          bankCount += 1;
        } else if (mode.includes("card") || mode.includes("pos")) {
          cardTotal += tx.total_price;
          cardCount += 1;
        } else {
          otherTotal += tx.total_price;
          otherCount += 1;
        }
      }
    }

    return {
      totalGross,
      successfulCount,
      momoTotal,
      momoCount,
      cashTotal,
      cashCount,
      bankTotal,
      bankCount,
      cardTotal,
      cardCount,
      otherTotal,
      otherCount,
    };
  }, [transactions]);

  function setDatePreset(preset: "today" | "yesterday" | "this_week" | "this_month" | "all") {
    const now = new Date();
    if (preset === "today") {
      const d = now.toISOString().split("T")[0];
      setStartDate(d);
      setEndDate(d);
    } else if (preset === "yesterday") {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      const d = y.toISOString().split("T")[0];
      setStartDate(d);
      setEndDate(d);
    } else if (preset === "this_week") {
      const firstDay = new Date(now);
      firstDay.setDate(now.getDate() - now.getDay());
      setStartDate(firstDay.toISOString().split("T")[0]);
      setEndDate(now.toISOString().split("T")[0]);
    } else if (preset === "this_month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().split("T")[0]);
      setEndDate(now.toISOString().split("T")[0]);
    } else if (preset === "all") {
      setStartDate("");
      setEndDate("");
    }
  }

  const isTodayActive = startDate === todayStr && endDate === todayStr;

  function clearFilters() {
    setStartDate("");
    setEndDate("");
    setProcessedBy("");
    setStatus("");
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header & Quick Date Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">
            {isWorker ? "My Transactions & Daily Brief" : "Transactions"}
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {isWorker
              ? "Your processed transactions and payment breakdowns"
              : shopName
              ? `${shopName} transactions & performance`
              : "All shop transactions"}
          </p>
        </div>

        {/* Date Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            variant={isTodayActive ? "default" : "outline"}
            onClick={() => setDatePreset("today")}
            className="h-8 text-xs font-medium"
          >
            Today
          </Button>
          <Button
            size="sm"
            variant={!isTodayActive && startDate && startDate === endDate ? "default" : "outline"}
            onClick={() => setDatePreset("yesterday")}
            className="h-8 text-xs font-medium"
          >
            Yesterday
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDatePreset("this_week")}
            className="h-8 text-xs font-medium"
          >
            This Week
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDatePreset("this_month")}
            className="h-8 text-xs font-medium"
          >
            This Month
          </Button>
          <Button
            size="sm"
            variant={!startDate && !endDate ? "default" : "outline"}
            onClick={() => setDatePreset("all")}
            className="h-8 text-xs font-medium"
          >
            All Time
          </Button>
        </div>
      </div>

      {/* DAILY BRIEF WIDGET */}
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 text-white rounded-2xl p-5 sm:p-6 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-44 h-44 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-700/80 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                {isTodayActive ? "Today's Brief" : startDate && endDate ? `${startDate} to ${endDate}` : "Sales Summary"}
              </p>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                GH₵{summary.totalGross.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-zinc-300">
            <span className="bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-700">
              <strong className="text-white font-bold">{summary.successfulCount}</strong> completed sale{summary.successfulCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Payment Breakdown Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
          {/* MoMo */}
          <div className="bg-zinc-800/80 border border-zinc-700/80 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-amber-400 font-medium mb-1">
              <span className="flex items-center gap-1">
                <Smartphone className="h-3.5 w-3.5" />
                Mobile Money
              </span>
              <span className="text-[10px] bg-amber-400/10 text-amber-300 px-1.5 py-0.5 rounded">
                {summary.momoCount}
              </span>
            </div>
            <p className="text-base font-bold text-white">
              GH₵{summary.momoTotal.toFixed(2)}
            </p>
          </div>

          {/* Cash */}
          <div className="bg-zinc-800/80 border border-zinc-700/80 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-emerald-400 font-medium mb-1">
              <span className="flex items-center gap-1">
                <Banknote className="h-3.5 w-3.5" />
                Cash
              </span>
              <span className="text-[10px] bg-emerald-400/10 text-emerald-300 px-1.5 py-0.5 rounded">
                {summary.cashCount}
              </span>
            </div>
            <p className="text-base font-bold text-white">
              GH₵{summary.cashTotal.toFixed(2)}
            </p>
          </div>

          {/* Bank / Transfer */}
          <div className="bg-zinc-800/80 border border-zinc-700/80 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-blue-400 font-medium mb-1">
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                Bank Transfer
              </span>
              <span className="text-[10px] bg-blue-400/10 text-blue-300 px-1.5 py-0.5 rounded">
                {summary.bankCount}
              </span>
            </div>
            <p className="text-base font-bold text-white">
              GH₵{summary.bankTotal.toFixed(2)}
            </p>
          </div>

          {/* Card / POS */}
          <div className="bg-zinc-800/80 border border-zinc-700/80 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-purple-400 font-medium mb-1">
              <span className="flex items-center gap-1">
                <CreditCard className="h-3.5 w-3.5" />
                Card / POS
              </span>
              <span className="text-[10px] bg-purple-400/10 text-purple-300 px-1.5 py-0.5 rounded">
                {summary.cardCount}
              </span>
            </div>
            <p className="text-base font-bold text-white">
              GH₵{summary.cardTotal.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="bg-white rounded-xl border border-zinc-200 px-4 py-4 shadow-2xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">From Date</Label>
            <Input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-10"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To Date</Label>
            <Input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-10"
            />
          </div>

          {!isWorker && (
            <div className="space-y-1">
              <Label className="text-xs">Processed By</Label>
              <select value={processedBy} onChange={(e) => setProcessedBy(e.target.value)} className={SELECT_CLASS}>
                <option value="">Everyone</option>
                {peopleOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={SELECT_CLASS}>
              <option value="">All Statuses</option>
              <option value="success">Success</option>
              <option value="returned">Returned</option>
              <option value="rejected">Rejected</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="mt-3 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            Clear date & status filters
          </button>
        )}
      </div>

      {/* Content List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-zinc-400 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading transactions...
        </div>
      ) : isError ? (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-red-600 text-sm">
          Failed to load transactions. Please refresh.
        </div>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white py-20 text-center">
          <ReceiptText className="h-10 w-10 text-zinc-300 mb-3" />
          <p className="text-sm font-medium text-zinc-500">
            {hasActiveFilters ? "No transactions match these filters" : "No transactions found"}
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            {hasActiveFilters ? "Try widening your date range or clearing a filter" : "Completed transactions will appear here"}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-2xs">
            <table className="w-full">
              <thead className="border-b border-zinc-200 bg-zinc-50/80">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Date & Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Payment</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Items</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Staff</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wide"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {transactions.map((tx) => (
                  <TransactionRow key={tx._id} tx={tx} canManage={canManage} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="flex md:hidden flex-col gap-3">
            {transactions.map((tx) => (
              <TransactionCard key={tx._id} tx={tx} canManage={canManage} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
