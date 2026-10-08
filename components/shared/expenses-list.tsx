"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Wallet,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Calendar,
  Filter,
  DollarSign,
  TrendingDown,
  Receipt,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldAlert,
} from "lucide-react"
import { toast } from "sonner"
import api from "@/lib/axios"
import { getErrorMessage } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

interface Expense {
  id: string
  title: string
  amount: number
  category: string
  note: string | null
  date: string
  shop_name: string
  recorded_by: string
  created_at: string
}

const CATEGORIES = [
  "Utilities",
  "Rent",
  "Salaries",
  "Logistics",
  "Maintenance",
  "Supplies",
  "Other",
]

const CATEGORY_COLORS: Record<string, string> = {
  Utilities: "bg-amber-50 text-amber-700 border-amber-200",
  Rent: "bg-indigo-50 text-indigo-700 border-indigo-200",
  Salaries: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Logistics: "bg-blue-50 text-blue-700 border-blue-200",
  Maintenance: "bg-rose-50 text-rose-700 border-rose-200",
  Supplies: "bg-purple-50 text-purple-700 border-purple-200",
  Other: "bg-zinc-50 text-zinc-700 border-zinc-200",
}

export function ExpensesList() {
  const queryClient = useQueryClient()
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

  // Form State - Add
  const [title, setTitle] = useState("")
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState("Utilities")
  const [note, setNote] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])

  // Form State - Edit
  const [editTitle, setEditTitle] = useState("")
  const [editAmount, setEditAmount] = useState("")
  const [editCategory, setEditCategory] = useState("Utilities")
  const [editNote, setEditNote] = useState("")
  const [editDate, setEditDate] = useState("")

  // Filter State
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Fetch expenses
  const { data: expenses = [], isLoading, isError } = useQuery<Expense[]>({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/expenses", { params: { limit: 200 } })
      return data
    },
    staleTime: 60 * 1000,
  })

  // Add Expense Mutation
  const addMutation = useMutation({
    mutationFn: async () => {
      const parsedAmount = parseFloat(amount)
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error("Please enter a valid positive amount")
      }

      const payload = {
        title: title.trim(),
        amount: parsedAmount,
        category: category.trim(),
        note: note.trim() || null,
        date: date ? new Date(date).toISOString() : null,
      }
      const { data } = await api.post("/api/v1/expenses", payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] })
      queryClient.invalidateQueries({ queryKey: ["reports"] })
      toast.success("Expense recorded successfully")
      setTitle("")
      setAmount("")
      setCategory("Utilities")
      setNote("")
      setDate(new Date().toISOString().split("T")[0])
      setShowAddForm(false)
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, "Failed to save expense"))
    },
  })

  // Edit Expense Mutation
  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editingExpense) return
      const parsedAmount = parseFloat(editAmount)
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error("Please enter a valid positive amount")
      }

      const payload = {
        title: editTitle.trim(),
        amount: parsedAmount,
        category: editCategory.trim(),
        note: editNote.trim() || null,
        date: editDate ? new Date(editDate).toISOString() : null,
      }
      const { data } = await api.patch(`/api/v1/expenses/${editingExpense.id}`, payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] })
      queryClient.invalidateQueries({ queryKey: ["reports"] })
      toast.success("Expense updated successfully")
      setEditingExpense(null)
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, "Failed to update expense"))
    },
  })

  // Delete Expense Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/expenses/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] })
      queryClient.invalidateQueries({ queryKey: ["reports"] })
      toast.success("Expense deleted")
      setDeletingId(null)
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, "Failed to delete expense"))
      setDeletingId(null)
    },
  })

  function startEdit(exp: Expense) {
    setEditingExpense(exp)
    setEditTitle(exp.title)
    setEditAmount(String(exp.amount))
    setEditCategory(exp.category || "Utilities")
    setEditNote(exp.note || "")
    setEditDate(exp.date ? new Date(exp.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0])
  }

  // Filtered list
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchesSearch =
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.note && e.note.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchesCat = selectedCategory === "all" || e.category === selectedCategory
      return matchesSearch && matchesCat
    })
  }, [expenses, searchQuery, selectedCategory])

  const totalFilteredAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0)
  }, [filteredExpenses])

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 font-heading">
            Operating Expenses
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Track overhead costs, logistics, rent, salaries, and store bills.
          </p>
        </div>

        <Button
          onClick={() => {
            setShowAddForm((prev) => !prev)
            if (editingExpense) setEditingExpense(null)
          }}
          className="bg-green-700 hover:bg-green-800 text-white font-medium"
        >
          <Plus className="h-4 w-4 mr-2" />
          {showAddForm ? "Close Form" : "Add Expense"}
        </Button>
      </div>

      {/* Summary Stat Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Total Logged (Filter)
            </span>
            <div className="h-8 w-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-zinc-900 mt-2">
            GH₵ {totalFilteredAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-zinc-400 mt-1">Across {filteredExpenses.length} entries</p>
        </div>
      </div>

      {/* Add Expense Form Drawer / Box */}
      {showAddForm && (
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-100 mb-5">
            <h2 className="text-base font-bold text-zinc-900">Record New Expense</h2>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-zinc-400 hover:text-zinc-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              addMutation.mutate()
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">Expense Title / Item</Label>
                <Input
                  id="title"
                  placeholder="e.g., Shop Electricity, Cleaning detergents"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="amount">Amount (GH₵)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm font-medium text-zinc-800 focus:outline-hidden"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="note">Note / Reference (Optional)</Label>
              <Input
                id="note"
                placeholder="e.g., Meter # 0123456789, paid via MoMo"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addMutation.isPending || !title.trim() || !amount}
                className="bg-zinc-900 hover:bg-zinc-800 text-white"
              >
                {addMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...
                  </>
                ) : (
                  "Save Expense"
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Expense Form Drawer / Box */}
      {editingExpense && (
        <div className="bg-amber-50/50 rounded-2xl border border-amber-200 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-amber-200/60 mb-5">
            <div>
              <h2 className="text-base font-bold text-zinc-900">Edit Expense</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Modify expense details and records</p>
            </div>
            <button
              onClick={() => setEditingExpense(null)}
              className="text-zinc-400 hover:text-zinc-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              editMutation.mutate()
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-title">Expense Title / Item</Label>
                <Input
                  id="edit-title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-amount">Amount (GH₵)</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-category">Category</Label>
                <select
                  id="edit-category"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm font-medium text-zinc-800 focus:outline-hidden"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-date">Date</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-note">Note / Reference (Optional)</Label>
              <Input
                id="edit-note"
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingExpense(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={editMutation.isPending || !editTitle.trim() || !editAmount}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {editMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...
                  </>
                ) : (
                  "Update Expense"
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
          <Input
            placeholder="Search expenses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-zinc-500 font-medium whitespace-nowrap">Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-9 px-3 rounded-lg border border-zinc-200 bg-white text-xs font-medium text-zinc-700 focus:outline-hidden"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2 text-zinc-400 text-sm">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-600" />
            <span>Loading expenses...</span>
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-red-600 text-sm flex items-center justify-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Failed to load expenses. Please try refreshing.
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="h-12 w-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 mb-3">
              <Wallet className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-zinc-800">No expenses found</p>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm">
              {searchQuery || selectedCategory !== "all"
                ? "Try changing your search or category filter."
                : "Click 'Add Expense' above to log your first operating cost."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-600">
              <thead className="bg-zinc-50/75 border-b border-zinc-200/80 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Expense</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredExpenses.map((exp) => {
                  const badgeClass = CATEGORY_COLORS[exp.category] || CATEGORY_COLORS.Other
                  const displayDate = new Date(exp.date || exp.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })

                  return (
                    <tr key={exp.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-medium text-zinc-900">{exp.title}</p>
                        {exp.note && (
                          <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{exp.note}</p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badgeClass}`}
                        >
                          {exp.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-zinc-500 whitespace-nowrap">
                        {displayDate}
                        {exp.recorded_by && (
                          <span className="block text-[10px] text-zinc-400">
                            by {exp.recorded_by}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-zinc-900 whitespace-nowrap">
                        GH₵ {exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {deletingId === exp.id ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={deleteMutation.isPending}
                              onClick={() => deleteMutation.mutate(exp.id)}
                              className="h-7 px-2 text-xs"
                            >
                              Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeletingId(null)}
                              className="h-7 px-2 text-xs"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEdit(exp)}
                              className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                              title="Edit expense"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeletingId(exp.id)}
                              className="h-8 w-8 p-0 text-zinc-400 hover:text-red-600 hover:bg-red-50"
                              title="Delete expense"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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
    </div>
  )
}
