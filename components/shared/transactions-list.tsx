"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { ChevronDown, ChevronUp, Loader2, ReceiptText } from "lucide-react";
import api from "@/lib/axios";
import { Badge } from "@/components/ui/badge";

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

export function useTransactions() {
  return useQuery<Transaction[]>({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/return_my_shop_transactions");
      return data;
    },
    staleTime: 60 * 1000,
  });
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

function TransactionRow({ tx }: { tx: Transaction }) {
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
          </p>
          {tx.customer_number && (
            <p className="text-xs text-zinc-400">{tx.customer_number}</p>
          )}
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
          </td>
        </tr>
      )}
    </>
  );
}

function TransactionCard({ tx }: { tx: Transaction }) {
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
        </div>
      )}
    </div>
  );
}

export function TransactionsList() {
  const { data: rawTransactions = [], isLoading, isError } = useTransactions();
  const transactions = [...rawTransactions].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const { data: session } = useSession();
  const shopName = session?.user?.worker_shop_name;

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
            No transactions yet
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            Completed transactions will appear here
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
                  <TransactionRow key={tx._id} tx={tx} />
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex md:hidden flex-col gap-3">
            {transactions.map((tx) => (
              <TransactionCard key={tx._id} tx={tx} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
