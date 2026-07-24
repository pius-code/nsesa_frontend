"use client";

import { useState } from "react";
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
} from "lucide-react";
import api from "@/lib/axios";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface TransactionItem {
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
}

export interface Transaction {
  _id: string;
  customer_name: string;
  customer_number: string | null;
  customer_email: string | null;
  items: TransactionItem[];
  total_price: number;
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
      const { data } = await api.get("/api/v1/transactions/processed_by_options"); // noqa
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

function errorMessage(err: unknown, fallback: string) {
  return (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? fallback; // noqa
}

interface AuditChange {
  old: unknown;
  new: unknown;
}

interface AuditEntry {
  _id: string;
  action: "deleted" | "refunded" | "edited";
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
    return `Items: ${oldCount} line${oldCount !== 1 ? "s" : ""} → ${newCount} line${newCount !== 1 ? "s" : ""}`; // noqa
  }
  if (field === "total_price") {
    return `Total: GH₵${Number(change.old).toFixed(2)} → GH₵${Number(change.new).toFixed(2)}`; // noqa
  }
  const label = field.replace(/_/g, " ");
  return `${label}: ${change.old ?? "—"} → ${change.new ?? "—"}`;
}

function actionBadgeVariant(action: AuditEntry["action"]) {
  if (action === "deleted") return "destructive" as const;
  if (action === "refunded") return "secondary" as const;
  return "default" as const;
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
              Loading…
            </p>
          ) : entries.length === 0 ? (
            <p className="text-xs text-zinc-400">No changes have been logged for this transaction.</p>
          ) : (
            entries.map((entry) => (
              <div key={entry._id} className="rounded-lg bg-zinc-50 border border-zinc-100 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={actionBadgeVariant(entry.action)} className="capitalize">
                    {entry.action}
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
  return (
    <Badge
      variant={status === "success" ? "default" : "secondary"}
      className="capitalize"
    >
      {status}
    </Badge>
  );
}

function ItemsTable({ items }: { items: TransactionItem[] }) {
  return (
    <div className="mt-3 rounded-lg overflow-hidden border border-zinc-200">
      <table className="w-full text-xs">
        <thead className="bg-zinc-50">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-zinc-500">
              Product
            </th>
            <th className="px-3 py-2 text-right font-medium text-zinc-500">
              Unit Price
            </th>
            <th className="px-3 py-2 text-right font-medium text-zinc-500">
              Qty
            </th>
            <th className="px-3 py-2 text-right font-medium text-zinc-500">
              Subtotal
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 bg-white">
          {items.map((item) => (
            <tr key={item.product_id}>
              <td className="px-3 py-2 text-zinc-700">{item.product_name}</td>
              <td className="px-3 py-2 text-right text-zinc-600">
                GH₵{item.unit_price.toFixed(2)}
              </td>
              <td className="px-3 py-2 text-right text-zinc-600">
                {item.quantity}
              </td>
              <td className="px-3 py-2 text-right font-medium text-zinc-800">
                GH₵{item.subtotal.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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

  const isPending = deleteMutation.isPending || refundMutation.isPending || editMutation.isPending; // noqa

  if (mode === null) {
    return (
      <div
        className="flex flex-wrap items-center gap-2 pt-3 mt-3 border-t border-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        <Button type="button" size="sm" variant="outline" onClick={() => setMode("edit")}>
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
        {tx.status === "success" && (
          <Button type="button" size="sm" variant="outline" onClick={() => setMode("refund")}>
            <RotateCcw className="h-3.5 w-3.5" />
            Refund
          </Button>
        )}
        <Button type="button" size="sm" variant="destructive" onClick={() => setMode("delete")}>
          <Trash2 className="h-3.5 w-3.5" />
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
          <X className="h-3.5 w-3.5" />
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
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
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
              <span className="ml-1.5 text-xs font-normal text-zinc-400">· {tx.customer_number}</span>
            )}
          </p>
        </td>
        <td className="px-4 py-3 text-sm text-zinc-600 text-center">
          {tx.items.length}
        </td>
        <td className="px-4 py-3 text-sm font-semibold text-green-600 whitespace-nowrap">
          GH₵{tx.total_price.toFixed(2)}
        </td>
        <td className="px-4 py-3">
          <StatusBadge status={tx.status} />
        </td>
        <td className="px-4 py-3 text-sm text-zinc-500">{tx.processed_by}</td>
        <td className="px-4 py-3 text-zinc-400">
          {open ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={7} className="px-4 pb-4 pt-0 bg-zinc-50/50">
            <ItemsTable items={tx.items} />
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
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
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
                <span className="ml-1.5 text-xs font-normal text-zinc-400">· {tx.customer_number}</span>
              )}
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">
              {formatDate(tx.created_at)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="text-sm font-bold text-green-600">
              GH₵{tx.total_price.toFixed(2)}
            </span>
            <StatusBadge status={tx.status} />
          </div>
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
          <span>
            {tx.items.length} item{tx.items.length !== 1 ? "s" : ""}
          </span>
          <span>·</span>
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
        <div className="px-4 pb-4 border-t border-zinc-100">
          <ItemsTable items={tx.items} />
          {canManage && <TransactionLogs transactionId={tx._id} />}
          {canManage && <ManagePanel tx={tx} />}
        </div>
      )}
    </div>
  );
}

const SELECT_CLASS =
  "flex h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"; // noqa

export function TransactionsList() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [processedBy, setProcessedBy] = useState("");
  const [status, setStatus] = useState("");

  const filters: TransactionFilters = { startDate, endDate, processedBy, status }; // noqa
  const hasActiveFilters = Boolean(startDate || endDate || processedBy || status); // noqa

  const { data: rawTransactions = [], isLoading, isError } = useTransactions(filters); // noqa
  const { data: peopleOptions = [] } = useProcessedByOptions();
  const transactions = [...rawTransactions].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const { data: session } = useSession();
  const shopName = session?.user?.worker_shop_name;
  const canManage = session?.user?.worker_role === "admin" || session?.user?.worker_role === "super_admin"; // noqa

  function clearFilters() {
    setStartDate("");
    setEndDate("");
    setProcessedBy("");
    setStatus("");
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Transactions</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {shopName ? `${shopName} transactions` : "All shop transactions"}
          </p>
        </div>
        {!isLoading && (
          <span className="text-sm text-zinc-400">
            {transactions.length} total
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-zinc-200 px-4 py-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-10"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-10"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Person</Label>
            <select value={processedBy} onChange={(e) => setProcessedBy(e.target.value)} className={SELECT_CLASS}> {/* noqa */}
              <option value="">Everyone</option>
              {peopleOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={SELECT_CLASS}> {/* noqa */}
              <option value="">All</option>
              <option value="success">Success</option>
              <option value="returned">Returned</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="mt-3 text-xs font-medium text-zinc-500 hover:text-zinc-700 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20 gap-2 text-zinc-400 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading transactions…
        </div>
      )}

      {isError && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-red-600 text-sm">
          Failed to load transactions. Please refresh.
        </div>
      )}

      {!isLoading && !isError && transactions.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white py-20 text-center">
          <ReceiptText className="h-10 w-10 text-zinc-300 mb-3" />
          <p className="text-sm font-medium text-zinc-500">
            {hasActiveFilters ? "No transactions match these filters" : "No transactions yet"} {/* noqa */}
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            {hasActiveFilters ? "Try widening your date range or clearing a filter" : "Completed transactions will appear here"} {/* noqa */}
          </p>
        </div>
      )}

      {transactions.length > 0 && (
        <>
          <div className="hidden md:block bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-zinc-200 bg-zinc-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                    Items
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                    Processed By
                  </th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {transactions.map((tx) => (
                  <TransactionRow key={tx._id} tx={tx} canManage={canManage} />
                ))}
              </tbody>
            </table>
          </div>
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
