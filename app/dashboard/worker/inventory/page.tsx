"use client"
import { getErrorMessage } from "@/lib/utils";

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
  ShieldAlert,
  Upload,
  Download,
} from "lucide-react"
import { useRef } from "react"
import api from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { StockValuationCards } from "@/components/inventory/stock-valuation-cards"
import { parseCSVPreview, CSVPreviewResult } from "@/lib/csv-preview"
import { CSVImportPreview } from "@/components/inventory/csv-import-preview"

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

interface BulkImportRowResult {
  row: number
  product_name: string
  status: "created" | "skipped" | "error"
  error?: string
}

interface BulkImportResponse {
  total_rows: number
  created: number
  skipped: number
  failed: number
  results: BulkImportRowResult[]
}

const LOW_STOCK_THRESHOLD = 3
const CSV_TEMPLATE = "product_name,product_price,amount_available,sku,category\nCoca Cola 500ml,5.00,50,SKU-001,Beverages\n" 

function errorMessage(err: unknown, fallback: string): string {
  return getErrorMessage(err, fallback);
}

export default function WorkerInventoryPage() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const perms = (session?.user?.permissions || {}) as unknown as Record<string, boolean>
  const canAddInventory = !!perms.can_add_inventory
  const canUpdateStock = !!perms.can_update_stock

  const branchName = session?.user?.worker_branch_name || "Main Branch"
  const shopName = session?.user?.worker_shop_name || ""

  const [search, setSearch] = useState("")
  const [showAddForm, setShowAddForm] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [bulkResult, setBulkResult] = useState<BulkImportResponse | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [csvPreview, setCsvPreview] = useState<CSVPreviewResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    enabled: canAddInventory || canUpdateStock,
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

  // Bulk Import Mutation
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
      queryClient.invalidateQueries({ queryKey: ["worker_inventory"] })
      toast.success(`Bulk import completed: ${data.created} imported!`)
      setBulkResult(data)
      setPendingFile(null)
      setCsvPreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
    },
    onError: (err) => {
      toast.error(errorMessage(err, "Bulk import failed. Please verify CSV columns."))
    },
  })

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBulkResult(null)

    try {
      const text = await file.text()
      const preview = parseCSVPreview(text)
      if (preview.missingRequired && preview.missingRequired.length > 0) {
        toast.error(`Missing required columns: ${preview.missingRequired.join(", ")}`)
        if (fileInputRef.current) fileInputRef.current.value = ""
        return
      }
      setPendingFile(file)
      setCsvPreview(preview)
    } catch {
      toast.error("Failed to read CSV file. Please make sure it is valid.")
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  function handleCancelPreview() {
    setPendingFile(null)
    setCsvPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function handleConfirmImport() {
    if (!pendingFile) return
    bulkImportMutation.mutate(pendingFile)
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

  function exportStockToCSV() {
    if (!inventory || inventory.length === 0) return

    const headers = [
      "Product Name",
      "SKU",
      "Category",
      "Branch",
      "Quantity in Stock",
      "Retail Price (GHS)",
    ]

    const escapeCSV = (val: string | number | null | undefined) => {
      if (val === null || val === undefined) return '""'
      const str = String(val).replace(/"/g, '""')
      return `"${str}"`
    }

    const rows = inventory.map((it) => {
      return [
        escapeCSV(it.product_name),
        escapeCSV(it.sku ?? ""),
        escapeCSV(it.category_name ?? ""),
        escapeCSV(branchName),
        escapeCSV(it.amount_available || 0),
        escapeCSV((it.product_price || 0).toFixed(2)),
      ].join(",")
    })

    const csvContent = [headers.join(","), ...rows].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `inventory-${branchName.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

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

  if (!canAddInventory && !canUpdateStock) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white py-16 text-center">
        <ShieldAlert className="h-10 w-10 text-amber-500 mb-3" />
        <p className="text-base font-semibold text-zinc-800">Access Restricted</p>
        <p className="text-xs text-zinc-500 mt-1 max-w-sm">
          You don&apos;t have permission to manage or restock inventory. Please contact your store administrator.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 pb-12 sm:pb-16">
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
        {canAddInventory && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              onClick={exportStockToCSV}
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
              disabled={inventory.length === 0}
              title="Export branch stock to CSV"
            >
              <Download className="h-4 w-4" />
              Export Stock
            </Button>
            <Button
              onClick={() => {
                setShowBulkImport((v) => !v)
                setShowAddForm(false)
              }}
              variant={showBulkImport ? "outline" : "secondary"}
              size="sm"
              className="h-9 gap-1.5"
            >
              <Upload className="h-4 w-4" />
              Bulk Import
            </Button>
            <Button
              onClick={() => {
                setShowAddForm((v) => !v)
                setShowBulkImport(false)
              }}
              size="sm"
              className="h-9 gap-1.5"
            >
              <Plus className="h-4 w-4" />
              {showAddForm ? "Close Form" : "Add Product"}
            </Button>
          </div>
        )}
      </div>

      {/* Executive Stock Valuation Dashboard */}
      <StockValuationCards
        inventory={inventory}
        selectedBranch={branchName}
      />

      {/* Bulk import panel */}
      {showBulkImport && (
        <div className="space-y-4">
          {pendingFile && csvPreview ? (
            <CSVImportPreview
              fileName={pendingFile.name}
              preview={csvPreview}
              isPending={bulkImportMutation.isPending}
              onConfirm={handleConfirmImport}
              onCancel={handleCancelPreview}
            />
          ) : (
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm px-5 py-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-zinc-800">Bulk Import from CSV</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Upload a CSV file to preview and confirm before importing</p>
                </div>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="flex items-center gap-1.5 text-xs font-semibold text-green-700 hover:text-green-800 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download template
                </button>
              </div>
              <p className="text-xs text-zinc-500">
                Supports exported files directly, or template columns:{" "}
                <code className="text-zinc-700 font-mono">product_name, product_price, amount_available</code> required,{" "}
                <code className="text-zinc-700 font-mono">sku, category</code> optional.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileSelected}
                disabled={bulkImportMutation.isPending}
                className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-green-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-green-700 file:cursor-pointer"
              />
              {bulkResult && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-700 text-sm font-medium">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {bulkResult.created} of {bulkResult.total_rows} product{bulkResult.total_rows !== 1 ? "s" : ""} imported
                    {bulkResult.skipped > 0 && `, ${bulkResult.skipped} skipped`}
                    {bulkResult.failed > 0 && `, ${bulkResult.failed} failed`}
                  </div>
                  {bulkResult.results && bulkResult.results.some((r) => r.status === "error") && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-1 text-xs text-red-700">
                      <p className="font-semibold">Row Errors:</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        {bulkResult.results
                          .filter((r) => r.status === "error")
                          .slice(0, 5)
                          .map((r, idx) => (
                            <li key={idx}>
                              Row {r.row} ({r.product_name}): {r.error}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
