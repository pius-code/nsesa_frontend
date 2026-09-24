"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import {
  Package,
  Plus,
  Pencil,
  Check,
  X,
  Loader2,
  Store,
  AlertTriangle,
  Search,
  CheckCircle2,
} from "lucide-react"
import api from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

interface InventoryItem {
  _id: string
  product_name: string
  product_price: number
  amount_available: number
  is_available: boolean
  sku: string | null
  branch_name?: string | null
  category_id: string | null
  category_name: string | null
}

interface Category {
  id: string
  name: string
}

const LOW_STOCK_THRESHOLD = 3

function errorMessage(err: unknown, fallback: string) {
  return (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? fallback
}

export default function WorkerInventoryPage() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const branchName = session?.user?.worker_branch_name || "Main Branch"
  const shopName = session?.user?.worker_shop_name || ""

  const [search, setSearch] = useState("")
  const [showAddForm, setShowAddForm] = useState(false)

  // Add Product Form State
  const [productName, setProductName] = useState("")
  const [productPrice, setProductPrice] = useState("")
  const [amountAvailable, setAmountAvailable] = useState("")
  const [sku, setSku] = useState("")
  const [categoryId, setCategoryId] = useState("")

  // Edit / Restock State
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editQty, setEditQty] = useState("")

  // Fetch Inventory (backend automatically scopes non-admin workers to their branch)
  const { data: inventory = [], isLoading, isError } = useQuery<InventoryItem[]>({
    queryKey: ["worker_inventory", branchName],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/inventory/get_my_shop_inventory")
      return data
    },
    staleTime: 60 * 1000,
  })

  // Fetch Categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/categories")
      return data
    },
    staleTime: 5 * 60 * 1000,
  })

  // Add Product Mutation
  const addMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/api/v1/add_to_inventory", {
        product_name: productName.trim(),
        product_price: parseFloat(productPrice),
        amount_available: parseInt(amountAvailable),
        sku: sku.trim() || null,
        category_id: categoryId || null,
        branch_name: branchName,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worker_inventory"] })
      toast.success("Product added to branch inventory!")
      setProductName("")
      setProductPrice("")
      setAmountAvailable("")
      setSku("")
      setCategoryId("")
      setShowAddForm(false)
    },
    onError: (err) => {
      toast.error(errorMessage(err, "Failed to add product"))
    },
  })

  // Restock / Update Quantity Mutation
  const restockMutation = useMutation({
    mutationFn: async ({ id, qty }: { id: string; qty: number }) => {
      const { data } = await api.patch(`/api/v1/inventory/update_stock/${id}`, {
        amount_available: qty,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worker_inventory"] })
      toast.success("Stock updated successfully!")
      setEditingId(null)
    },
    onError: (err) => {
      toast.error(errorMessage(err, "Failed to update stock"))
    },
  })

  const filteredItems = inventory.filter((item) =>
    item.product_name.toLowerCase().includes(search.toLowerCase()) ||
    (item.sku && item.sku.toLowerCase().includes(search.toLowerCase())) ||
    (item.category_name && item.category_name.toLowerCase().includes(search.toLowerCase()))
  )

  const totalStockUnits = inventory.reduce((acc, item) => acc + (item.amount_available || 0), 0)
  const lowStockCount = inventory.filter((item) => item.amount_available < LOW_STOCK_THRESHOLD).length

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-zinc-900">Branch Inventory</h1>
            <Badge variant="secondary" className="gap-1 font-semibold text-zinc-700">
              <Store className="h-3 w-3 text-green-600" />
              {branchName}
            </Badge>
          </div>
          <p className="text-sm text-zinc-500 mt-0.5">
            View stock, receive shipments, and restock items for {shopName}
          </p>
        </div>
        <Button onClick={() => setShowAddForm((v) => !v)} className="shrink-0">
          <Plus className="h-4 w-4 mr-1.5" />
          {showAddForm ? "Close Form" : "Add Product"}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Product Lines</span>
          <p className="mt-2 text-2xl font-bold text-zinc-900">{inventory.length}</p>
          <p className="text-xs text-zinc-400 mt-1">Available at this branch</p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Units in Stock</span>
          <p className="mt-2 text-2xl font-bold text-zinc-900">{totalStockUnits}</p>
          <p className="text-xs text-zinc-400 mt-1">Physical stock count</p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Low Stock Items</span>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-2xl font-bold text-amber-600">{lowStockCount}</p>
            {lowStockCount > 0 && <AlertTriangle className="h-5 w-5 text-amber-500" />}
          </div>
          <p className="text-xs text-zinc-400 mt-1">Items below {LOW_STOCK_THRESHOLD} units</p>
        </div>
      </div>

      {/* Add Product Form */}
      {showAddForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            addMutation.mutate()
          }}
          className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div>
              <p className="text-sm font-bold text-zinc-900">Add Product to Branch</p>
              <p className="text-xs text-zinc-400">Stock will be assigned directly to {branchName}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-zinc-400 hover:text-zinc-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="p_name">Product Name <span className="text-red-500">*</span></Label>
              <Input
                id="p_name"
                placeholder="e.g. Milo 400g Refill"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p_price">Selling Price (GHS) <span className="text-red-500">*</span></Label>
              <Input
                id="p_price"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 25.00"
                value={productPrice}
                onChange={(e) => setProductPrice(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p_qty">Quantity Received <span className="text-red-500">*</span></Label>
              <Input
                id="p_qty"
                type="number"
                min="1"
                placeholder="e.g. 50"
                value={amountAvailable}
                onChange={(e) => setAmountAvailable(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p_sku">SKU / Barcode</Label>
              <Input
                id="p_sku"
                placeholder="e.g. MILO-400"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="p_cat">Category</Label>
              <select
                id="p_cat"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
              >
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={addMutation.isPending} className="flex-1">
              {addMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  Saving...
                </>
              ) : (
                "Save Product to Inventory"
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <Input
          placeholder="Search by product name, SKU, or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-white"
        />
      </div>

      {/* Inventory List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-zinc-400 text-sm">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading branch inventory...
        </div>
      ) : isError ? (
        <div className="rounded-xl bg-red-50 border border-red-100 p-4 text-red-600 text-sm">
          Failed to load branch inventory. Please refresh.
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white py-16 text-center">
          <Package className="h-10 w-10 text-zinc-300 mb-3" />
          <p className="text-base font-semibold text-zinc-700">No products found</p>
          <p className="text-xs text-zinc-400 mt-1 mb-4">
            {search ? "No products match your search." : "No stock has been added to this branch yet."}
          </p>
          {!search && (
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add First Product
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-xs">
          <table className="w-full">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Product</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Category</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wide">Price</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Stock Count</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredItems.map((item) => {
                const isEditing = editingId === item._id
                const isLow = item.amount_available < LOW_STOCK_THRESHOLD
                const isOut = item.amount_available <= 0

                return (
                  <tr key={item._id} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-semibold text-zinc-900 text-sm">{item.product_name}</p>
                        {item.sku && <p className="text-xs text-zinc-400 font-mono mt-0.5">SKU: {item.sku}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500">
                      {item.category_name ?? <span className="text-zinc-300 italic">None</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-zinc-900">
                      GHS {item.product_price.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <div className="inline-flex items-center gap-1.5">
                          <Input
                            type="number"
                            min="0"
                            value={editQty}
                            onChange={(e) => setEditQty(e.target.value)}
                            className="h-8 w-20 text-xs text-center"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            className="h-8 px-2"
                            disabled={restockMutation.isPending || !editQty}
                            onClick={() => {
                              const qty = parseInt(editQty)
                              if (!isNaN(qty)) {
                                restockMutation.mutate({ id: item._id, qty })
                              }
                            }}
                          >
                            {restockMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2"
                            onClick={() => setEditingId(null)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            isOut
                              ? "bg-red-100 text-red-700"
                              : isLow
                              ? "bg-amber-100 text-amber-800"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {item.amount_available} in stock
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!isEditing && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingId(item._id)
                            setEditQty(String(item.amount_available))
                          }}
                          className="h-8 text-xs"
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1 text-zinc-400" />
                          Restock
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
