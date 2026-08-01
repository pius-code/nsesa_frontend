"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Loader2,
  Clock,
  Plus,
  CreditCard,
  X,
  Check,
  Search,
  Ban,
} from "lucide-react"
import api from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTransactions, Transaction } from "@/components/shared/transactions-list"

interface InventoryItem {
  _id: string
  product_name: string
  product_price: number
  amount_available: number
  is_available: boolean
}

function useInventory() {
  return useQuery<InventoryItem[]>({
    queryKey: ["inventory"],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/inventory/get_my_shop_inventory")
      return data
    },
    staleTime: 5 * 60 * 1000,
  })
}

function errorMessage(err: unknown, fallback: string) {
  return (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? fallback; // noqa
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

type PanelMode = "add" | "pay" | "cancel" | null

function OrderCard({ order }: { order: Transaction }) {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<PanelMode>(null)

  // Add item
  const { data: inventory = [] } = useInventory()
  const [search, setSearch] = useState("")
  const [addQty, setAddQty] = useState(1)
  const [editNote, setEditNote] = useState(order.note ?? "")
  const available = inventory.filter((p) => p.is_available)
  const filtered = search.trim()
    ? available.filter((p) => p.product_name.toLowerCase().includes(search.toLowerCase())) // noqa
    : available
  const selected = available.find((p) => p.product_name === search)

  const addItemMutation = useMutation({
    mutationFn: async () => {
      if (!selected) return
      const { data } = await api.post(`/api/v1/transactions/${order._id}/add-items`, { // noqa
        items: [{
          product_id: selected._id,
          product_name: selected.product_name,
          unit_price: selected.product_price,
          quantity: addQty,
          subtotal: selected.product_price * addQty,
        }],
        note: editNote.trim() || null,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
      queryClient.invalidateQueries({ queryKey: ["inventory"] })
      toast.success("Item added to order")
      setSearch("")
      setAddQty(1)
      setMode(null)
    },
    onError: (err: unknown) => toast.error(errorMessage(err, "Failed to add item")),
  })

  // Complete payment
  const [payMode, setPayMode] = useState<"cash" | "momo" | "card">("cash")
  const [sendSms, setSendSms] = useState(true)

  const payMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/api/v1/transactions/${order._id}/complete-payment`, { // noqa
        payment_mode: payMode,
        send_sms: sendSms,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
      toast.success("Payment recorded")
      setMode(null)
    },
    onError: (err: unknown) => toast.error(errorMessage(err, "Failed to record payment")),
  })

  // Cancel
  const [reason, setReason] = useState("")

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/api/v1/transactions/${order._id}/cancel`, { reason }); // noqa
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
      queryClient.invalidateQueries({ queryKey: ["inventory"] })
      toast.success("Order cancelled")
      setMode(null)
    },
    onError: (err: unknown) => toast.error(errorMessage(err, "Failed to cancel order")),
  })

  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
      <div className="px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-zinc-900 truncate">{order.customer_name}</p>
            <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(order.created_at)} · {order.processed_by}
            </p>
          </div>
          <span className="text-lg font-bold text-amber-600 shrink-0">
            GH₵{order.total_price.toFixed(2)}
          </span>
        </div>

        {order.note && (
          <div className="mt-3 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-sm text-amber-800"> {/* noqa */}
            <span className="font-semibold">Note:</span> {order.note}
          </div>
        )}

        <div className="mt-3 rounded-lg bg-zinc-50 border border-zinc-100 divide-y divide-zinc-100"> {/* noqa */}
          {order.items.map((item) => (
            <div key={item.product_id} className="flex items-center justify-between px-3 py-2 text-sm"> {/* noqa */}
              <span className="text-zinc-700">{item.product_name} × {item.quantity}</span> {/* noqa */}
              <span className="font-medium text-zinc-800">GH₵{item.subtotal.toFixed(2)}</span> {/* noqa */}
            </div>
          ))}
        </div>

        {mode === null && (
          <div className="flex flex-wrap gap-2 mt-3">
            <Button type="button" size="sm" variant="outline" onClick={() => setMode("add")}> {/* noqa */}
              <Plus className="h-3.5 w-3.5" />
              Add Item
            </Button>
            <Button type="button" size="sm" onClick={() => setMode("pay")}>
              <CreditCard className="h-3.5 w-3.5" />
              Complete Payment
            </Button>
            <Button type="button" size="sm" variant="destructive" onClick={() => setMode("cancel")}> {/* noqa */}
              <Ban className="h-3.5 w-3.5" />
              Cancel Order
            </Button>
          </div>
        )}

        {mode === "add" && (
          <div className="mt-3 pt-3 border-t border-zinc-100 space-y-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" /> {/* noqa */}
              <Input
                placeholder="Search products…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                autoFocus
              />
              {search && !selected && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg max-h-40 overflow-y-auto"> {/* noqa */}
                  {filtered.length === 0 ? (
                    <p className="px-3 py-2.5 text-sm text-zinc-400">No products found</p>
                  ) : (
                    filtered.map((p) => (
                      <button
                        key={p._id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setSearch(p.product_name)}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-zinc-50 text-left" // noqa
                      >
                        <span className="text-zinc-800">{p.product_name}</span>
                        <span className="text-zinc-400 text-xs">GH₵{p.product_price.toFixed(2)}</span> {/* noqa */}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <Input
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              placeholder="Note (e.g. no pepper, vegetarian)"
            />
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                value={addQty}
                onChange={(e) => setAddQty(Math.max(1, parseInt(e.target.value) || 1))} // noqa
                className="w-20"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => { setMode(null); setSearch("") }}
                disabled={addItemMutation.isPending}
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => addItemMutation.mutate()}
                disabled={!selected || addItemMutation.isPending}
                className="flex-1"
              >
                {addItemMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} {/* noqa */}
                Add to Order
              </Button>
            </div>
          </div>
        )}

        {mode === "pay" && (
          <div className="mt-3 pt-3 border-t border-zinc-100 space-y-2.5">
            <div className="grid grid-cols-3 gap-2">
              {(["cash", "momo", "card"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPayMode(m)}
                  className={`py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${ // noqa
                    payMode === m
                      ? "bg-green-600 border-green-600 text-white"
                      : "bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300"
                  }`}
                >
                  {m === "momo" ? "MoMo" : m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
            {order.customer_number && (
              <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
                <input
                  type="checkbox"
                  checked={sendSms}
                  onChange={(e) => setSendSms(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 accent-green-600 cursor-pointer" // noqa
                />
                <span className="text-xs text-zinc-600">Send SMS receipt</span>
              </label>
            )}
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setMode(null)} disabled={payMutation.isPending}> {/* noqa */}
                <X className="h-3.5 w-3.5" />
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => payMutation.mutate()}
                disabled={payMutation.isPending}
                className="flex-1"
              >
                {payMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} {/* noqa */}
                Confirm Payment
              </Button>
            </div>
          </div>
        )}

        {mode === "cancel" && (
          <div className="mt-3 pt-3 border-t border-zinc-100 space-y-2.5">
            <div className="space-y-1">
              <Label className="text-xs">Reason</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why is this order being cancelled?"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setMode(null)} disabled={cancelMutation.isPending}> {/* noqa */}
                <X className="h-3.5 w-3.5" />
                Back
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending || reason.trim().length < 3}
                className="flex-1"
              >
                {cancelMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />} {/* noqa */}
                Confirm Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function PendingOrders() {
  const { data: orders = [], isLoading, isError } = useTransactions({ status: "pending" }) // noqa

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Pending Orders</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          {orders.length} open tab{orders.length !== 1 ? "s" : ""} awaiting payment
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-zinc-400 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : isError ? (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-red-600 text-sm">
          Failed to load pending orders. Please refresh.
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white py-20 text-center"> {/* noqa */}
          <Clock className="h-10 w-10 text-zinc-300 mb-3" />
          <p className="text-sm font-medium text-zinc-500">No pending orders</p>
          <p className="text-xs text-zinc-400 mt-1">Tabs saved as &quot;Pay Later&quot; will show up here</p> {/* noqa */}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {orders.map((order) => (
            <OrderCard key={order._id} order={order} />
          ))}
        </div>
      )}
    </div>
  )
}
