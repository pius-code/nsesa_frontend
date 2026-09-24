"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Wallet,
  Plus,
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
} from "lucide-react"
import { toast } from "sonner"
import api from "@/lib/axios"
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
  Rent: "bg-purple-50 text-purple-700 border-purple-200",
  Salaries: "bg-blue-50 text-blue-700 border-blue-200",
  Logistics: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Maintenance: "bg-orange-50 text-orange-700 border-orange-200",
  Supplies: "bg-cyan-50 text-cyan-700 border-cyan-200",
  Other: "bg-zinc-50 text-zinc-700 border-zinc-200",
}

export default function ExpensesPage() {
  const queryClient = useQueryClient()

  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState("")
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState("Utilities")
  const [note, setNote] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])

  const [selectedCategory, setSelectedCategory] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
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
      setShowForm(false)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || err.message || "Failed to save expense")
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
      toast.error(err.response?.data?.detail || "Failed to delete expense")
      setDeletingId(null)
    },
  })

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchesCategory =
        selectedCategory === "all" ||
        e.category.toLowerCase() === selectedCategory.toLowerCase()
      const matchesSearch =
        searchQuery === "" ||
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.note && e.note.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchesCategory && matchesSearch
    })
  }, [expenses, selectedCategory, searchQuery])

  // KPI Calculations
  const stats = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    let monthTotal = 0
    let weekTotal = 0
    let allTotal = 0

    for (const exp of expenses) {
      const d = new Date(exp.date || exp.created_at)
      allTotal += exp.amount
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        monthTotal += exp.amount
      }
      if (d >= sevenDaysAgo && d <= now) {
        weekTotal += exp.amount
      }
    }

    return { monthTotal, weekTotal, allTotal, count: expenses.length }
  }, [expenses])

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Expenses</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Log electricity, rent, supplies, and operating costs. These are deducted from gross profit.
          </p>
        </div>
        <Button
          onClick={() => setShowForm((prev) => !prev)}
          className="self-start sm:self-auto bg-zinc-900 hover:bg-zinc-800 text-white font-medium rounded-xl shadow-xs transition-colors"
        >
          {showForm ? (
            <>
              <X className="h-4 w-4 mr-1.5" /> Close
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-1.5" /> Add Expense
            </>
          )}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
              This Month
            </span>
            <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-zinc-900">
              GH₵{stats.monthTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">Current calendar month</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
              Past 7 Days
            </span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-zinc-900">
              GH₵{stats.weekTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">Rolling 7-day total</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
              Total Entries
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-zinc-900">{stats.count}</p>
            <p className="text-xs text-zinc-400 mt-0.5">
              Total: GH₵{stats.allTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Expandable Add Expense Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs p-5 sm:p-6 transition-all duration-200 animate-in fade-in-50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-zinc-900">Record New Expense</h2>
            <button
              onClick={() => setShowForm(false)}
              className="text-zinc-400 hover:text-zinc-600 text-sm"
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
                <Label htmlFor="title">Title / Description *</Label>
                <Input
                  id="title"
                  placeholder="e.g., ECG Electricity Prepaid, Store Cleaning"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="amount">Amount (GH₵) *</Label>
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

              <div className="space-y-1.5">
                <Label htmlFor="category">Category *</Label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-sm text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-zinc-950"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="date">Expense Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
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
                onClick={() => setShowForm(false)}
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
                  <th className="py-3.5 px-4 text-right">Action</th>
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
                        GH₵{exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeletingId(exp.id)}
                            className="h-8 w-8 p-0 text-zinc-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
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
    </div>
  )
}
