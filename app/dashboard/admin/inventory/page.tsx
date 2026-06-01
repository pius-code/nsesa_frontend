"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { CheckCircle2, Loader2, Package, Plus, Pencil, Check, X } from "lucide-react"
import api from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

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

export default function InventoryPage() {
  const queryClient = useQueryClient()
  const { data: inventory = [], isLoading, isError } = useInventory()

  const [productName, setProductName] = useState("")
  const [productPrice, setProductPrice] = useState("")
  const [amountAvailable, setAmountAvailable] = useState("")
  const [success, setSuccess] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editQty, setEditQty] = useState("")

  function startEdit(item: InventoryItem) {
    setEditingId(item._id)
    setEditQty(String(item.amount_available))
  }

  function cancelEdit() {
    setEditingId(null)
    setEditQty("")
  }

  const addMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/api/v1/add_to_inventory", {
        product_name: productName.trim(),
        product_price: parseFloat(productPrice),
        amount_available: parseInt(amountAvailable),
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] })
      setSuccess(true)
      setProductName("")
      setProductPrice("")
      setAmountAvailable("")
      setShowForm(false)
      setTimeout(() => setSuccess(false), 4000)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/api/v1/inventory/update_stock/${id}`, {
        amount_available: parseInt(editQty),
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] })
      cancelEdit()
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    addMutation.mutate()
  }

  const LOW_STOCK_THRESHOLD = 3

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Inventory</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {inventory.length} product{inventory.length !== 1 ? "s" : ""} in stock
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} variant={showForm ? "outline" : "default"}>
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-700 text-sm font-medium">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Product added to inventory!
        </div>
      )}

      {/* Add product form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-zinc-200 shadow-sm px-5 py-5 space-y-4"
        >
          <p className="text-sm font-semibold text-zinc-700">New Product</p>

          {addMutation.isError && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2.5 text-red-600 text-sm">
              Failed to add product. Please try again.
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="product_name">
              Product Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="product_name"
              placeholder="e.g. Coca Cola 500ml"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="product_price">
                Price (GH₵) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="product_price"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={productPrice}
                onChange={(e) => setProductPrice(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="amount_available">
                Stock Qty <span className="text-red-500">*</span>
              </Label>
              <Input
                id="amount_available"
                type="number"
                min="0"
                placeholder="0"
                value={amountAvailable}
                onChange={(e) => setAmountAvailable(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="submit" disabled={addMutation.isPending} className="flex-1">
              {addMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Add to Inventory"
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Inventory table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-zinc-400 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading inventory…
        </div>
      ) : isError ? (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-red-600 text-sm">
          Failed to load inventory. Please refresh.
        </div>
      ) : inventory.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white py-20 text-center">
          <Package className="h-10 w-10 text-zinc-300 mb-3" />
          <p className="text-sm font-medium text-zinc-500">No products yet</p>
          <p className="text-xs text-zinc-400 mt-1">Add your first product above</p>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-zinc-200 bg-zinc-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Product</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wide">Price</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wide">In Stock</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {inventory.map((item) => {
                  const lowStock = item.amount_available < LOW_STOCK_THRESHOLD
                  const isEditing = editingId === item._id
                  const isSaving = updateMutation.isPending && editingId === item._id
                  return (
                    <tr key={item._id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-zinc-900">{item.product_name}</td>
                      <td className="px-4 py-3 text-sm text-right text-zinc-700 font-semibold">
                        GH₵{item.product_price.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <Input
                            type="number"
                            min="0"
                            value={editQty}
                            onChange={(e) => setEditQty(e.target.value)}
                            className="w-24 h-8 text-center ml-auto"
                            autoFocus
                          />
                        ) : (
                          <span className={cn("text-sm font-bold", lowStock ? "text-red-600" : "text-zinc-800")}>
                            {item.amount_available}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {lowStock ? (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-600">
                            Low stock
                          </span>
                        ) : item.is_available ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                            Available
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-500">
                            Unavailable
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => updateMutation.mutate(item._id)}
                              disabled={isSaving || editQty === ""}
                              className="p-1.5 rounded-md text-green-600 hover:bg-green-50 disabled:opacity-40 transition-colors"
                            >
                              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={cancelEdit}
                              disabled={isSaving}
                              className="p-1.5 rounded-md text-zinc-400 hover:bg-zinc-100 disabled:opacity-40 transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end">
                            <button
                              onClick={() => startEdit(item)}
                              className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="flex md:hidden flex-col gap-3">
            {inventory.map((item) => {
              const lowStock = item.amount_available < LOW_STOCK_THRESHOLD
              const isEditing = editingId === item._id
              const isSaving = updateMutation.isPending && editingId === item._id
              return (
                <div key={item._id} className="bg-white rounded-xl border border-zinc-200 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-zinc-900 truncate">{item.product_name}</p>
                      <p className="text-sm text-zinc-500 mt-0.5">GH₵{item.product_price.toFixed(2)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={cn("text-lg font-bold", lowStock ? "text-red-600" : "text-zinc-800")}>
                        {item.amount_available}
                      </span>
                      {lowStock ? (
                        <span className="text-xs font-semibold text-red-600 bg-red-100 rounded-full px-2 py-0.5">Low stock</span>
                      ) : (
                        <span className="text-xs font-semibold text-green-700 bg-green-100 rounded-full px-2 py-0.5">Available</span>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-100">
                      <Input
                        type="number"
                        min="0"
                        value={editQty}
                        onChange={(e) => setEditQty(e.target.value)}
                        className="h-9 text-center flex-1"
                        autoFocus
                      />
                      <button
                        onClick={() => updateMutation.mutate(item._id)}
                        disabled={isSaving || editQty === ""}
                        className="p-2 rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:opacity-40 transition-colors"
                      >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={cancelEdit}
                        disabled={isSaving}
                        className="p-2 rounded-lg text-zinc-500 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-40 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(item)}
                      className="mt-3 pt-3 border-t border-zinc-100 w-full flex items-center justify-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-700 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Update stock
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
