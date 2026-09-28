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
  Store,
  Boxes,
  History,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  RotateCcw,
} from "lucide-react"
import api from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DateStripPicker } from "@/components/ui/date-strip-picker"
import { cn } from "@/lib/utils"

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
  cost_price?: number | null
  supplier_name?: string | null
  supplier_contact?: string | null
}

interface StockLog {
  _id: string
  movement_type: "RESTOCK" | "SALE" | "REFUND" | "TRANSFER_IN" | "TRANSFER_OUT" | "ADJUSTMENT" | "DAMAGE" | "AUDIT"
  quantity_change: number
  previous_quantity: number
  new_quantity: number
  performed_by_name: string
  reason: string
  created_at: string
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

interface BranchOption {
  id: string
  branch_name: string
  is_main: boolean
}

function useBranches() {
  return useQuery<BranchOption[]>({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/branches")
      return data
    },
    staleTime: 60 * 1000,
  })
}

function useInventory(branchName?: string) {
  return useQuery<InventoryItem[]>({
    queryKey: ["inventory", branchName],
    queryFn: async () => {
      const params = branchName && branchName !== "all" ? { branch_name: branchName } : {}
      const { data } = await api.get("/api/v1/inventory/get_my_shop_inventory", { params })
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

function useProductStockLogs(productId: string | null) {
  return useQuery<StockLog[]>({
    queryKey: ["stock-logs", productId],
    queryFn: async () => {
      if (!productId) return []
      const { data } = await api.get(`/api/v1/inventory/${productId}/logs`)
      return data
    },
    enabled: !!productId,
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
  onChange: (val: string) => void
  categories: Category[]
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-10 px-3 rounded-lg border border-zinc-300 bg-white text-sm text-zinc-900 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600"
    >
      <option value="">No category</option>
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
  const { data: branches = [] } = useBranches()
  const [selectedBranch, setSelectedBranch] = useState<string>("all")
  const { data: inventory = [], isLoading } = useInventory(selectedBranch)
  const { data: categories = [] } = useCategories()

  const [showForm, setShowForm] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [bulkResult, setBulkResult] = useState<BulkImportResponse | null>(null)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Add form fields
  const [productName, setProductName] = useState("")
  const [productPrice, setProductPrice] = useState("")
  const [costPrice, setCostPrice] = useState("")
  const [amountAvailable, setAmountAvailable] = useState("")
  const [sku, setSku] = useState("")
  const [branchName, setBranchName] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [supplierName, setSupplierName] = useState("")
  const [supplierContact, setSupplierContact] = useState("")

  // Edit form state (NO direct quantity overwrite)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editPrice, setEditPrice] = useState("")
  const [editCostPrice, setEditCostPrice] = useState("")
  const [editSku, setEditSku] = useState("")
  const [editCategoryId, setEditCategoryId] = useState("")
  const [editSupplierName, setEditSupplierName] = useState("")
  const [editSupplierContact, setEditSupplierContact] = useState("")

  // Restock modal state
  const [restockingItem, setRestockingItem] = useState<InventoryItem | null>(null)
  const [addedQty, setAddedQty] = useState("")
  const [restockReason, setRestockReason] = useState("")
  const [restockDate, setRestockDate] = useState(() => new Date().toISOString().slice(0, 16))

  // Logs drawer state
  const [logsItem, setLogsItem] = useState<InventoryItem | null>(null)
  const { data: stockLogs = [], isLoading: logsLoading } = useProductStockLogs(logsItem?._id ?? null)

  const [deletingId, setDeletingId] = useState<string | null>(null)

  function startEdit(item: InventoryItem) {
    setEditingId(item._id)
    setEditName(item.product_name)
    setEditPrice(String(item.product_price))
    setEditCostPrice(item.cost_price != null ? String(item.cost_price) : "")
    setEditSku(item.sku ?? "")
    setEditCategoryId(item.category_id ?? "")
    setEditSupplierName(item.supplier_name ?? "")
    setEditSupplierContact(item.supplier_contact ?? "")
  }

  function cancelEdit() {
    setEditingId(null)
  }

  function openRestockModal(item: InventoryItem) {
    setRestockingItem(item)
    setAddedQty("10")
    setRestockReason("")
    setRestockDate(new Date().toISOString().slice(0, 16))
  }

  function closeRestockModal() {
    setRestockingItem(null)
    setAddedQty("")
    setRestockReason("")
  }

  const addMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/api/v1/add_to_inventory", {
        product_name: productName.trim(),
        product_price: parseFloat(productPrice),
        cost_price: costPrice ? parseFloat(costPrice) : null,
        amount_available: parseInt(amountAvailable),
        sku: sku.trim() || null,
        branch_name: branchName.trim() || null,
        category_id: categoryId || null,
        supplier_name: supplierName.trim() || null,
        supplier_contact: supplierContact.trim() || null,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] })
      setSuccess(true)
      setProductName("")
      setBranchName("")
      setProductPrice("")
      setCostPrice("")
      setAmountAvailable("")
      setSku("")
      setCategoryId("")
      setSupplierName("")
      setSupplierContact("")
      setShowForm(false)
      setTimeout(() => setSuccess(false), 4000)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/api/v1/inventory/update_stock/${id}`, {
        product_name: editName.trim(),
        product_price: parseFloat(editPrice),
        cost_price: editCostPrice ? parseFloat(editCostPrice) : null,
        sku: editSku.trim() || null,
        category_id: editCategoryId || null,
        supplier_name: editSupplierName.trim() || null,
        supplier_contact: editSupplierContact.trim() || null,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] })
      cancelEdit()
    },
  })

  const restockMutation = useMutation({
    mutationFn: async ({ id, added_quantity, reason, restock_date }: { id: string; added_quantity: number; reason: string; restock_date: string }) => {
      const { data } = await api.post(`/api/v1/inventory/${id}/restock`, {
        added_quantity,
        reason: reason.trim() || "No reason given",
        restock_date: restock_date ? new Date(restock_date).toISOString() : null,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] })
      queryClient.invalidateQueries({ queryKey: ["stock-logs"] })
      closeRestockModal()
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
        <Label>Selling Price (GH₵)</Label>
        <Input type="number" min="0" step="0.01" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Cost Price (GH₵)</Label>
        <Input type="number" min="0" step="0.01" value={editCostPrice} onChange={(e) => setEditCostPrice(e.target.value)} placeholder="Optional unit cost" />
      </div>
      <div className="space-y-1.5">
        <Label>Category</Label>
        <CategorySelect id="edit_category" value={editCategoryId} onChange={setEditCategoryId} categories={categories} />
      </div>
      <div className="space-y-1.5">
        <Label>Supplier Name</Label>
        <Input value={editSupplierName} onChange={(e) => setEditSupplierName(e.target.value)} placeholder="Optional supplier" />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Supplier Contact</Label>
        <Input value={editSupplierContact} onChange={(e) => setEditSupplierContact(e.target.value)} placeholder="Optional contact details" />
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
              Importing...
            </div>
          )}
          {bulkResult && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-700 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {bulkResult.created} of {bulkResult.total_rows} product{bulkResult.total_rows !== 1 ? "s" : ""} imported
                {bulkResult.skipped > 0 && `, ${bulkResult.skipped} skipped`}
              </div>
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
                Selling Price (GH₵) <span className="text-red-500">*</span>
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
              <Label htmlFor="cost_price">Cost Price (GH₵)</Label>
              <Input
                id="cost_price"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="amount_available">
                Initial Stock <span className="text-red-500">*</span>
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
            <div className="space-y-1.5">
              <Label htmlFor="sku">SKU / Barcode</Label>
              <Input
                id="sku"
                placeholder="e.g. BEV-001"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="category">Category</Label>
              <CategorySelect
                id="category"
                value={categoryId}
                onChange={setCategoryId}
                categories={categories}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="branch_name">Branch Assignment</Label>
              <Input
                id="branch_name"
                placeholder="e.g. Main Branch"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="supplier_name">Supplier Name</Label>
              <Input
                id="supplier_name"
                placeholder="e.g. Accra Beverages Ltd"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="supplier_contact">Supplier Contact</Label>
              <Input
                id="supplier_contact"
                placeholder="0XX XXX XXXX"
                value={supplierContact}
                onChange={(e) => setSupplierContact(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={addMutation.isPending}>
              {addMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Product"
              )}
            </Button>
          </div>
        </form>
      )}

      {/* Branch selector tabs if multiple branches exist */}
      {branches.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => setSelectedBranch("all")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0",
              selectedBranch === "all"
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            )}
          >
            All Branches
          </button>
          {branches.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setSelectedBranch(b.branch_name)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0",
                selectedBranch === b.branch_name
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              )}
            >
              {b.branch_name} {b.is_main && "(Main)"}
            </button>
          ))}
        </div>
      )}

      {/* Inventory Table */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-12 flex items-center justify-center text-zinc-400 gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading inventory...</span>
          </div>
        ) : inventory.length === 0 ? (
          <div className="py-16 text-center">
            <Package className="h-10 w-10 text-zinc-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-zinc-700">No products in inventory</p>
            <p className="text-xs text-zinc-400 mt-0.5">Click &quot;Add Product&quot; to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {inventory.map((item) => {
              const isEditing = editingId === item._id
              const isDeleting = deletingId === item._id
              const isLowStock = item.amount_available > 0 && item.amount_available <= LOW_STOCK_THRESHOLD
              const isOutOfStock = item.amount_available <= 0

              return (
                <div key={item._id} className="p-4 hover:bg-zinc-50/60 transition-colors">
                  {isDeleting ? (
                    <DeleteConfirm item={item} />
                  ) : isEditing ? (
                    <div className="space-y-4">
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                        Edit Product Details (Stock quantity is updated via Restock)
                      </p>
                      {editForm}
                      <div className="flex justify-end gap-2 pt-2">
                        <Button size="sm" variant="outline" onClick={cancelEdit}>
                          <X className="h-3.5 w-3.5" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => updateMutation.mutate(item._id)}
                          disabled={updateMutation.isPending}
                        >
                          {updateMutation.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-zinc-900 truncate">
                            {item.product_name}
                          </h3>
                          {item.sku && (
                            <span className="text-[11px] font-mono bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded border border-zinc-200">
                              {item.sku}
                            </span>
                          )}
                          {item.category_name && (
                            <span className="text-xs text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full">
                              {item.category_name}
                            </span>
                          )}
                          {item.branch_name && (
                            <span className="text-xs text-zinc-400">
                              • {item.branch_name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-500">
                          <span>Price: <strong className="text-zinc-800">GH₵{item.product_price.toFixed(2)}</strong></span>
                          {item.cost_price != null && item.cost_price > 0 && (
                            <span>Cost: <strong className="text-zinc-600">GH₵{item.cost_price.toFixed(2)}</strong></span>
                          )}
                          {item.supplier_name && (
                            <span>Supplier: <strong className="text-zinc-600">{item.supplier_name}</strong></span>
                          )}
                        </div>
                      </div>

                      {/* Stock Count Badge & Actions */}
                      <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                        {/* Stock status pill */}
                        <div
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs",
                            isOutOfStock
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : isLowStock
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          )}
                        >
                          <Boxes className="h-3.5 w-3.5" />
                          <span>{item.amount_available} in stock</span>
                        </div>

                        {/* Dedicated Restock Button */}
                        <Button
                          size="sm"
                          onClick={() => openRestockModal(item)}
                          className="h-8 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs gap-1.5"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Restock</span>
                        </Button>

                        {/* Stock Movement Logs */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setLogsItem(item)}
                          className="h-8 px-2.5 text-zinc-600 hover:text-zinc-900"
                          title="View Stock Movement Ledger"
                        >
                          <History className="h-3.5 w-3.5" />
                        </Button>

                        {/* Edit metadata */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEdit(item)}
                          className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-900"
                          title="Edit Details"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>

                        {/* Delete */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeletingId(item._id)}
                          className="h-8 w-8 p-0 text-zinc-400 hover:text-red-600"
                          title="Delete Product"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Dedicated Restock Modal */}
      {restockingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900">
                  Restock: {restockingItem.product_name}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Add new inventory and create an audit log entry
                </p>
              </div>
              <button
                type="button"
                onClick={closeRestockModal}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Dynamic Math Box */}
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between text-xs">
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Current Stock</span>
                <strong className="text-zinc-900 text-sm font-bold">{restockingItem.amount_available}</strong>
              </div>
              <div className="text-emerald-700 font-bold text-base">+ {parseInt(addedQty) || 0}</div>
              <div className="text-right">
                <span className="text-zinc-500 block text-[10px] uppercase font-semibold">New Total</span>
                <strong className="text-emerald-700 text-base font-bold">
                  {restockingItem.amount_available + (parseInt(addedQty) || 0)} units
                </strong>
              </div>
            </div>

            {/* Add Quantity Input */}
            <div className="space-y-1.5">
              <Label htmlFor="restock_qty" className="font-semibold text-zinc-800">
                Quantity to Add <span className="text-red-500">*</span>
              </Label>
              <Input
                id="restock_qty"
                type="number"
                min="1"
                placeholder="e.g. 50"
                value={addedQty}
                onChange={(e) => setAddedQty(e.target.value)}
                autoFocus
                className="text-base font-bold"
              />
            </div>

            {/* Reason / Note Input */}
            <div className="space-y-1.5">
              <Label htmlFor="restock_reason" className="text-zinc-800">
                Reason / Supplier Note (optional)
              </Label>
              <Input
                id="restock_reason"
                placeholder="e.g. Reimbursed, Supplier delivery from Accra..."
                value={restockReason}
                onChange={(e) => setRestockReason(e.target.value)}
              />
              <p className="text-[11px] text-zinc-400">
                Defaults to &quot;No reason given&quot; if left empty.
              </p>
            </div>

            {/* Restock Date Picker */}
            <div className="space-y-1.5 pt-1">
              <Label className="text-zinc-700 font-medium">Restock Date & Time</Label>
              <DateStripPicker
                value={restockDate}
                onChange={(d) => setRestockDate(d)}
              />
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
              <Button variant="outline" onClick={closeRestockModal}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const qty = parseInt(addedQty, 10)
                  if (qty > 0 && restockingItem) {
                    restockMutation.mutate({
                      id: restockingItem._id,
                      added_quantity: qty,
                      reason: restockReason,
                      restock_date: restockDate,
                    })
                  }
                }}
                disabled={!addedQty || parseInt(addedQty, 10) <= 0 || restockMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                {restockMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating Stock...
                  </>
                ) : (
                  `Confirm +${parseInt(addedQty) || 0} Units`
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Movement Logs Modal */}
      {logsItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <div>
                <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                  <History className="h-4 w-4 text-zinc-500" />
                  Stock Ledger: {logsItem.product_name}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Current: <strong>{logsItem.amount_available} units</strong> • Immutable movement history
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLogsItem(null)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {logsLoading ? (
                <div className="py-12 text-center text-zinc-400 flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading movement history...</span>
                </div>
              ) : stockLogs.length === 0 ? (
                <div className="py-10 text-center text-zinc-400">
                  <Boxes className="h-8 w-8 mx-auto mb-2 text-zinc-300" />
                  <p className="text-sm font-semibold text-zinc-700">No stock movements recorded yet</p>
                  <p className="text-xs text-zinc-400 mt-0.5">Movements will appear here automatically when sales or restocks happen.</p>
                </div>
              ) : (
                stockLogs.map((log) => {
                  const isPositive = log.quantity_change > 0
                  return (
                    <div
                      key={log._id}
                      className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-semibold">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] uppercase font-bold",
                              log.movement_type === "RESTOCK"
                                ? "bg-emerald-100 text-emerald-800"
                                : log.movement_type === "SALE"
                                ? "bg-blue-100 text-blue-800"
                                : log.movement_type === "REFUND"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-purple-100 text-purple-800"
                            )}
                          >
                            {log.movement_type}
                          </span>
                          <span className={isPositive ? "text-emerald-700 font-bold" : "text-zinc-700 font-bold"}>
                            {isPositive ? `+${log.quantity_change}` : log.quantity_change} units
                          </span>
                        </div>
                        <span className="text-zinc-400 text-[11px]">
                          {new Date(log.created_at).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-zinc-500 pt-0.5">
                        <span>Stock: {log.previous_quantity} ➔ <strong className="text-zinc-800">{log.new_quantity}</strong></span>
                        <span>By: <strong className="text-zinc-700">{log.performed_by_name}</strong></span>
                      </div>

                      <div className="text-zinc-600 bg-white/70 p-1.5 rounded border border-zinc-200/60 text-[11px]">
                        Reason: <em>&quot;{log.reason}&quot;</em>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="pt-2 border-t border-zinc-100 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setLogsItem(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
