"use client"

import { useRef, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  CheckCircle2,
  Loader2,
  Package,
  Plus,
  Pencil,
  Check,
  X,
  Trash2,
  Upload,
  Download,
} from "lucide-react"
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
  sku: string | null
  category_id: string | null
  category_name: string | null
}

interface Category {
  id: string
  name: string
}

interface BulkImportRowResult {
  row: number
  status: "created" | "skipped"
  product_name: string | null
  reason: string | null
}

interface BulkImportResponse {
  total_rows: number
  created: number
  skipped: number
  results: BulkImportRowResult[]
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

function useCategories() {
  return useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/categories")
      return data
    },
    staleTime: 5 * 60 * 1000,
  })
}

const LOW_STOCK_THRESHOLD = 3
const CSV_TEMPLATE = "product_name,product_price,amount_available,sku,category\nCoca Cola 500ml,5.00,50,SKU-001,Beverages\n"

function CategorySelect({
  id,
  value,
  onChange,
  categories,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  categories: Category[]
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
    >
      <option value="">Uncategorized</option>
      {categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  )
}

export default function InventoryPage() {
  const queryClient = useQueryClient()
  const { data: inventory = [], isLoading, isError } = useInventory()
  const { data: categories = [] } = useCategories()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [productName, setProductName] = useState("")
  const [productPrice, setProductPrice] = useState("")
  const [amountAvailable, setAmountAvailable] = useState("")
  const [sku, setSku] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [success, setSuccess] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [bulkResult, setBulkResult] = useState<BulkImportResponse | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editPrice, setEditPrice] = useState("")
  const [editQty, setEditQty] = useState("")
  const [editSku, setEditSku] = useState("")
  const [editCategoryId, setEditCategoryId] = useState("")

  const [deletingId, setDeletingId] = useState<string | null>(null)

  function startEdit(item: InventoryItem) {
    setEditingId(item._id)
    setEditName(item.product_name)
    setEditPrice(String(item.product_price))
    setEditQty(String(item.amount_available))
    setEditSku(item.sku ?? "")
    setEditCategoryId(item.category_id ?? "")
  }

  function cancelEdit() {
    setEditingId(null)
  }

  const addMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/api/v1/add_to_inventory", {
        product_name: productName.trim(),
        product_price: parseFloat(productPrice),
        amount_available: parseInt(amountAvailable),
        sku: sku.trim() || null,
        category_id: categoryId || null,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] })
      setSuccess(true)
      setProductName("")
      setProductPrice("")
      setAmountAvailable("")
      setSku("")
      setCategoryId("")
      setShowForm(false)
      setTimeout(() => setSuccess(false), 4000)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/api/v1/inventory/update_stock/${id}`, {
        product_name: editName.trim(),
        product_price: parseFloat(editPrice),
        amount_available: parseInt(editQty),
        sku: editSku.trim() || null,
        category_id: editCategoryId || null,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] })
      cancelEdit()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/api/v1/inventory/${id}`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] })
      setDeletingId(null)
    },
  })

  const bulkImportMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append("file", file)
      const { data } = await api.post<BulkImportResponse>("/api/v1/inventory/bulk_import", formData, {
        headers: { "Content-Type": undefined },
      })
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] })
      setBulkResult(data)
      if (fileInputRef.current) fileInputRef.current.value = ""
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    addMutation.mutate()
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBulkResult(null)
    bulkImportMutation.mutate(file)
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "inventory-import-template.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const editForm = (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label>Product Name</Label>
        <Input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
      </div>
      <div className="space-y-1.5">
        <Label>SKU / Barcode</Label>
        <Input value={editSku} onChange={(e) => setEditSku(e.target.value)} placeholder="Optional" />
      </div>
      <div className="space-y-1.5">
        <Label>Price (GH₵)</Label>
        <Input type="number" min="0" step="0.01" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Stock Qty</Label>
        <Input type="number" min="0" value={editQty} onChange={(e) => setEditQty(e.target.value)} />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Category</Label>
        <CategorySelect id="edit_category" value={editCategoryId} onChange={setEditCategoryId} categories={categories} />
      </div>
    </div>
  )

  function DeleteConfirm({ item }: { item: InventoryItem }) {
    const isDeleting = deleteMutation.isPending && deleteMutation.variables === item._id
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3.5">
        <p className="text-sm text-red-700">
          Remove <span className="font-semibold">{item.product_name}</span> from inventory? This can&apos;t be undone.
        </p>
        <div className="flex justify-end gap-2 mt-3">
          <Button size="sm" variant="outline" onClick={() => setDeletingId(null)} disabled={isDeleting}>
            <X className="h-3.5 w-3.5" />
            Cancel
          </Button>
          <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(item._id)} disabled={isDeleting}>
            {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Delete
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Inventory</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {inventory.length} product{inventory.length !== 1 ? "s" : ""} in stock
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setShowBulkImport((v) => !v)
              setShowForm(false)
            }}
            variant={showBulkImport ? "outline" : "secondary"}
          >
            <Upload className="h-4 w-4" />
            Bulk Import
          </Button>
          <Button
            onClick={() => {
              setShowForm((v) => !v)
              setShowBulkImport(false)
            }}
            variant={showForm ? "outline" : "default"}
          >
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-700 text-sm font-medium">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Product added to inventory!
        </div>
      )}

      {/* Bulk import panel */}
      {showBulkImport && (
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm px-5 py-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-700">Bulk Import from CSV</p>
            <button
              type="button"
              onClick={downloadTemplate}
              className="flex items-center gap-1.5 text-xs font-medium text-green-700 hover:text-green-800"
            >
              <Download className="h-3.5 w-3.5" />
              Download template
            </button>
          </div>
          <p className="text-xs text-zinc-500">
            Columns: <code className="text-zinc-700">product_name, product_price, amount_available</code> required,{" "}
            <code className="text-zinc-700">sku, category</code> optional.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileSelected}
            disabled={bulkImportMutation.isPending}
            className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-green-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-green-700 file:cursor-pointer"
          />
          {bulkImportMutation.isPending && (
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Importing…
            </div>
          )}
          {bulkImportMutation.isError && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2.5 text-red-600 text-sm">
              Import failed. Check that your CSV has the required columns.
            </div>
          )}
          {bulkResult && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-700 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {bulkResult.created} of {bulkResult.total_rows} product{bulkResult.total_rows !== 1 ? "s" : ""} imported
                {bulkResult.skipped > 0 && `, ${bulkResult.skipped} skipped`}
              </div>
              {bulkResult.skipped > 0 && (
                <div className="rounded-lg border border-zinc-200 divide-y divide-zinc-100 max-h-48 overflow-y-auto">
                  {bulkResult.results
                    .filter((r) => r.status === "skipped")
                    .map((r) => (
                      <div key={r.row} className="px-3 py-2 text-xs text-zinc-600">
                        <span className="font-semibold text-red-600">Row {r.row}</span>
                        {r.product_name && <> — {r.product_name}</>}: {r.reason}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
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
              Failed to add product. It may already exist (duplicate SKU).
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sku">SKU / Barcode</Label>
              <Input
                id="sku"
                placeholder="Optional"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category_id">Category</Label>
              <CategorySelect id="category_id" value={categoryId} onChange={setCategoryId} categories={categories} />
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Category</th>
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
                  const isDeleting = deleteMutation.isPending && deleteMutation.variables === item._id

                  if (deletingId === item._id) {
                    return (
                      <tr key={item._id} className="bg-red-50/40">
                        <td colSpan={6} className="px-4 py-4">
                          <DeleteConfirm item={item} />
                        </td>
                      </tr>
                    )
                  }

                  if (isEditing) {
                    return (
                      <tr key={item._id} className="bg-zinc-50">
                        <td colSpan={6} className="px-4 py-4">
                          <div className="space-y-3">
                            {editForm}
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={cancelEdit} disabled={isSaving}>
                                <X className="h-3.5 w-3.5" />
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => updateMutation.mutate(item._id)}
                                disabled={isSaving || editName.trim() === "" || editPrice === "" || editQty === ""}
                              >
                                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                Save
                              </Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  }

                  return (
                    <tr key={item._id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-zinc-900">
                        {item.product_name}
                        {item.sku && <span className="block text-xs text-zinc-400 font-normal">{item.sku}</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-500">
                        {item.category_name ?? <span className="text-zinc-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-zinc-700 font-semibold">
                        GH₵{item.product_price.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={cn("text-sm font-bold", lowStock ? "text-red-600" : "text-zinc-800")}>
                          {item.amount_available}
                        </span>
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
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => startEdit(item)}
                            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeletingId(item._id)}
                            disabled={isDeleting}
                            className="p-1.5 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
                          >
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </button>
                        </div>
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
              const isDeleting = deleteMutation.isPending && deleteMutation.variables === item._id

              if (deletingId === item._id) {
                return (
                  <div key={item._id}>
                    <DeleteConfirm item={item} />
                  </div>
                )
              }

              if (isEditing) {
                return (
                  <div key={item._id} className="bg-white rounded-xl border border-zinc-200 px-4 py-4 space-y-3">
                    {editForm}
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={cancelEdit} disabled={isSaving} className="flex-1">
                        <X className="h-4 w-4" />
                        Cancel
                      </Button>
                      <Button
                        onClick={() => updateMutation.mutate(item._id)}
                        disabled={isSaving || editName.trim() === "" || editPrice === "" || editQty === ""}
                        className="flex-1"
                      >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        Save
                      </Button>
                    </div>
                  </div>
                )
              }

              return (
                <div key={item._id} className="bg-white rounded-xl border border-zinc-200 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-zinc-900 truncate">{item.product_name}</p>
                      <p className="text-sm text-zinc-500 mt-0.5">
                        GH₵{item.product_price.toFixed(2)}
                        {item.category_name && <span className="text-zinc-300"> · {item.category_name}</span>}
                      </p>
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

                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-100">
                    <button
                      onClick={() => startEdit(item)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-700 transition-colors py-1"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => setDeletingId(item._id)}
                      disabled={isDeleting}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-red-600 transition-colors py-1 disabled:opacity-40"
                    >
                      {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      Remove
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
