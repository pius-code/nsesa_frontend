"use client"

import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Plus, Trash2, CheckCircle2, Loader2, ShoppingCart } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import api from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

interface InventoryItem {
  _id: string
  product_name: string
  product_price: number
  amount_available: number
  is_available: boolean
}

interface CartItem {
  product_id: string
  product_name: string
  unit_price: number
  quantity: number
  subtotal: number
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

export function TransactionForm({ workerName }: { workerName: string }) {
  const queryClient = useQueryClient()
  const { data: inventory = [], isLoading: inventoryLoading } = useInventory()

  const [selectedProductId, setSelectedProductId] = useState("")
  const [qty, setQty] = useState(1)
  const [cart, setCart] = useState<CartItem[]>([])

  const [customerName, setCustomerName] = useState("")
  const [customerNumber, setCustomerNumber] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")

  const [success, setSuccess] = useState(false)

  const availableProducts = inventory.filter((p) => p.is_available)
  const selectedProduct = availableProducts.find((p) => p._id === selectedProductId)

  function addItem() {
    if (!selectedProduct || qty < 1) return
    const inCart = cart.find(c => c.product_id === selectedProduct._id)?.quantity ?? 0
    if (inCart + qty > selectedProduct.amount_available) return
    setCart((prev) => {
      const existing = prev.find((c) => c.product_id === selectedProduct._id)
      if (existing) {
        const newQty = existing.quantity + qty
        return prev.map((c) =>
          c.product_id === selectedProduct._id
            ? { ...c, quantity: newQty, subtotal: newQty * c.unit_price }
            : c
        )
      }
      return [
        ...prev,
        {
          product_id: selectedProduct._id,
          product_name: selectedProduct.product_name,
          unit_price: selectedProduct.product_price,
          quantity: qty,
          subtotal: qty * selectedProduct.product_price,
        },
      ]
    })
    setSelectedProductId("")
    setQty(1)
  }

  function removeItem(productId: string) {
    setCart((prev) => prev.filter((c) => c.product_id !== productId))
  }

  const total = cart.reduce((sum, c) => sum + c.subtotal, 0)

  const mutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/api/v1/create-transaction", {
        customer_name: customerName.trim(),
        customer_number: customerNumber.trim() || null,
        customer_email: customerEmail.trim() || null,
        items: cart,
        total_price: total,
        processed_by: workerName,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] })
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
      setSuccess(true)
      setCart([])
      setCustomerName("")
      setCustomerNumber("")
      setCustomerEmail("")
      setSelectedProductId("")
      setQty(1)
      setTimeout(() => setSuccess(false), 4000)
    },
  })

  const canSubmit = cart.length > 0 && customerName.trim().length > 0 && !mutation.isPending

  return (
    <div className="mx-auto max-w-xl w-full">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-900">New Transaction</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Fill in customer details and add products</p>
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-700 text-sm font-medium mb-5">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Transaction recorded successfully!
        </div>
      )}

      {mutation.isError && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-red-600 text-sm mb-5">
          Failed to submit. Please try again.
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (canSubmit) mutation.mutate()
        }}
        className="bg-white rounded-2xl border border-zinc-200 shadow-sm divide-y divide-zinc-100"
      >
        {/* Customer details */}
        <div className="px-5 py-5 space-y-4">
          <p className="text-sm font-semibold text-zinc-700">Customer Details</p>

          <div className="space-y-1.5">
            <Label htmlFor="customer_name">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="customer_name"
              placeholder="Customer name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="customer_number">Phone</Label>
              <Input
                id="customer_number"
                placeholder="0XX XXX XXXX"
                value={customerNumber}
                onChange={(e) => setCustomerNumber(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer_email">Email</Label>
              <Input
                id="customer_email"
                type="email"
                placeholder="optional"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Product picker */}
        <div className="px-5 py-5 space-y-3">
          <p className="text-sm font-semibold text-zinc-700">Add Products</p>

          <div className="flex gap-2">
            <div className="flex-1 min-w-0">
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                disabled={inventoryLoading}
                className="w-full h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-600/10 disabled:opacity-50"
              >
                <option value="">
                  {inventoryLoading ? "Loading products…" : "Select a product"}
                </option>
                {availableProducts.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.product_name} — GH₵{p.product_price.toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            <Input
              type="number"
              min={1}
              value={qty}
              max={selectedProduct ? selectedProduct.amount_available - (cart.find(c => c.product_id === selectedProduct._id)?.quantity ?? 0) : undefined}
              onChange={(e) => {
                const max = selectedProduct
                  ? selectedProduct.amount_available - (cart.find(c => c.product_id === selectedProduct._id)?.quantity ?? 0)
                  : Infinity
                setQty(Math.min(Math.max(1, parseInt(e.target.value) || 1), max))
              }}
              className="w-20 shrink-0 text-center"
              placeholder="Qty"
            />

            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={addItem}
              disabled={!selectedProductId}
              className="shrink-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {selectedProduct && (() => {
            const inCart = cart.find(c => c.product_id === selectedProduct._id)?.quantity ?? 0
            const remaining = selectedProduct.amount_available - inCart
            const overLimit = qty > remaining
            return (
              <p className={`text-xs ${overLimit ? "text-red-500 font-medium" : "text-zinc-500"}`}>
                {overLimit
                  ? `Only ${remaining} available (${inCart} already in cart)`
                  : `${selectedProduct.amount_available} in stock · subtotal: `}
                {!overLimit && (
                  <span className="font-semibold text-green-600">
                    GH₵{(selectedProduct.product_price * qty).toFixed(2)}
                  </span>
                )}
              </p>
            )
          })()}
        </div>

        {/* Cart */}
        {cart.length > 0 && (
          <div className="px-5 py-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-700 flex items-center gap-1.5">
                <ShoppingCart className="h-4 w-4" />
                Order Items
              </p>
              <span className="text-xs text-zinc-400">{cart.length} line(s)</span>
            </div>

            <div className="space-y-2">
              {cart.map((item) => (
                <div
                  key={item.product_id}
                  className="flex items-center gap-3 rounded-lg bg-zinc-50 px-3 py-2.5"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800 truncate">
                      {item.product_name}
                    </p>
                    <p className="text-xs text-zinc-500">
                      GH₵{item.unit_price.toFixed(2)} × {item.quantity}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-zinc-800 shrink-0">
                    GH₵{item.subtotal.toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(item.product_id)}
                    className="text-zinc-400 hover:text-red-500 transition-colors shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-semibold text-zinc-700">Total</span>
              <span className="text-xl font-bold text-green-600">
                GH₵{total.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="px-5 py-4">
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={!canSubmit}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing…
              </>
            ) : (
              `Record Transaction${cart.length > 0 ? ` · GH₵${total.toFixed(2)}` : ""}`
            )}
          </Button>
          {cart.length === 0 && (
            <p className="text-xs text-center text-zinc-400 mt-2">Add at least one product to continue</p>
          )}
        </div>
      </form>
    </div>
  )
}
