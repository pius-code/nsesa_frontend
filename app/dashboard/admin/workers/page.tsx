"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import {
  CheckCircle2,
  Loader2,
  UserPlus,
  Users,
  UserCheck,
  UserX,
  Trash2,
  X,
  Shield,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { toast } from "sonner"
import api from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────
interface WorkerPermissions {
  is_global: boolean
  can_sell: boolean
  can_manage_orders: boolean
  view_own_transactions: boolean
  view_all_transactions: boolean
  can_add_inventory: boolean
  can_update_stock: boolean
  can_add_others: boolean
  can_manage_expenses: boolean
  can_view_own_branch_report: boolean
  can_view_all_reports: boolean
  can_view_specific_branches: string[]
  can_add_categories: boolean
  can_sms_own_branch: boolean
  can_sms_all_branches: boolean
  can_see_clients: boolean
  can_add_clients: boolean
  can_edit_clients: boolean
}

interface Worker {
  id: string
  worker_name: string
  worker_shop_name: string
  worker_branch_name: string
  worker_role: string
  role_label: string
  worker_email: string
  worker_phone?: string | null
  permissions: WorkerPermissions
  is_active: boolean
  created_at: string
}

interface BranchOption {
  id: string
  branch_name: string
  is_main: boolean
}

// ─── Permission display config ─────────────────────────────────────────────────
const PERM_GROUPS = [
  {
    label: "Access Scope",
    items: [
      { key: "is_global", label: "Global access (all branches)", description: "Can see the entire shop, not just own branch" },
    ],
  },
  {
    label: "Sales",
    items: [
      { key: "can_sell", label: "Can sell", description: "Create and complete transactions" },
      { key: "can_manage_orders", label: "Can manage orders", description: "Edit, refund, and delete transactions" },
    ],
  },
  {
    label: "Transactions",
    items: [
      { key: "view_own_transactions", label: "View own transactions", description: "Can see their own transactions" },
      { key: "view_all_transactions", label: "View all transactions", description: "Can see every transaction in the shop" },
    ],
  },
  {
    label: "Inventory",
    items: [
      { key: "can_add_inventory", label: "Can add inventory", description: "Add new products and remove items" },
      { key: "can_update_stock", label: "Can restock", description: "Update quantity on existing products" },
    ],
  },
  {
    label: "People & Finance",
    items: [
      { key: "can_add_others", label: "Can add workers", description: "Create new worker accounts and set their permissions" },
      { key: "can_manage_expenses", label: "Can manage expenses", description: "Add, edit and delete shop expenses" },
    ],
  },
  {
    label: "Reports",
    items: [
      { key: "can_view_own_branch_report", label: "View branch report", description: "View financial report for own branch" },
      { key: "can_view_all_reports", label: "View all reports", description: "View reports across all branches" },
    ],
  },  {
    label: "Catalogue",
    items: [
      { key: "can_add_categories", label: "Can manage categories", description: "Add and edit product categories" },
    ],
  },
  {
    label: "SMS",
    items: [
      { key: "can_sms_own_branch", label: "Send SMS to own branch", description: "Can send SMS to customers in their branch only" },
      { key: "can_sms_all_branches", label: "Send SMS to all customers", description: "Can broadcast SMS to all customers across all branches" },
    ],
  },
  {
    label: "Clients",
    items: [
      { key: "can_see_clients", label: "View clients", description: "Can view the shop's client list and search clients" },
      { key: "can_add_clients", label: "Add clients", description: "Can register new clients" },
      { key: "can_edit_clients", label: "Edit clients", description: "Can edit client details" },
    ],
  },
]

const DEFAULT_PERMS: WorkerPermissions = {
  is_global: false,
  can_sell: true,
  can_manage_orders: false,
  view_own_transactions: true,
  view_all_transactions: false,
  can_add_inventory: false,
  can_update_stock: false,
  can_add_others: false,
  can_manage_expenses: false,
  can_view_own_branch_report: false,
  can_view_all_reports: false,
  can_view_specific_branches: [],
  can_add_categories: false,
  can_sms_own_branch: false,
  can_sms_all_branches: false,
  can_see_clients: false,
  can_add_clients: false,
  can_edit_clients: false,
}

// ─── Hooks ─────────────────────────────────────────────────────────────────────
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

function useWorkers() {
  return useQuery<Worker[]>({
    queryKey: ["workers"],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/shop_workers")
      return data
    },
    staleTime: 2 * 60 * 1000,
  })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

// ─── Permission Checkbox Component ─────────────────────────────────────────────
function PermCheckbox({
  permKey,
  label,
  description,
  checked,
  onChange,
}: {
  permKey: string
  label: string
  description: string
  checked: boolean
  onChange: (key: string, val: boolean) => void
}) {
  return (
    <label
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all select-none",
        checked
          ? "border-indigo-300 bg-indigo-50"
          : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
      )}
    >
      <div className="mt-0.5 shrink-0">
        <div
          className={cn(
            "h-4 w-4 rounded border-2 flex items-center justify-center transition-colors",
            checked ? "bg-indigo-600 border-indigo-600" : "border-zinc-300 bg-white"
          )}
        >
          {checked && (
            <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 12 12">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </div>
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange(permKey, e.target.checked)}
      />
      <div className="min-w-0">
        <p className={cn("text-sm font-medium", checked ? "text-indigo-900" : "text-zinc-700")}>{label}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
      </div>
    </label>
  )
}

// ─── Permission Panel ──────────────────────────────────────────────────────────
function PermissionsPanel({
  perms,
  onChange,
}: {
  perms: WorkerPermissions
  onChange: (perms: WorkerPermissions) => void
}) {
  const handleChange = (key: string, val: boolean) => {
    onChange({ ...perms, [key]: val })
  }

  return (
    <div className="space-y-4">
      {PERM_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">{group.label}</p>
          <div className="space-y-2">
            {group.items.map((item) => (
              <PermCheckbox
                key={item.key}
                permKey={item.key}
                label={item.label}
                description={item.description}
                checked={!!perms[item.key as keyof WorkerPermissions]}
                onChange={handleChange}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Active permission badges ──────────────────────────────────────────────────
const PERM_BADGE_LABELS: Record<string, string> = {
  can_sell: "Sell",
  can_manage_orders: "Orders",
  view_all_transactions: "All Txns",
  can_add_inventory: "Inventory",
  can_update_stock: "Restock",
  can_add_others: "Add Workers",
  can_manage_expenses: "Expenses",
  can_view_all_reports: "Reports",
  can_add_categories: "Categories",
  is_global: "Global",
  can_see_clients: "Clients",
  can_add_clients: "Add Client",
  can_edit_clients: "Edit Client",
}

function PermBadges({ perms }: { perms: WorkerPermissions }) {
  const active = Object.entries(PERM_BADGE_LABELS)
    .filter(([k]) => !!perms[k as keyof WorkerPermissions])
    .map(([, label]) => label)

  if (!active.length) return <span className="text-xs text-zinc-400 italic">No permissions</span>

  return (
    <div className="flex flex-wrap gap-1">
      {active.slice(0, 4).map((l) => (
        <span key={l} className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
          {l}
        </span>
      ))}
      {active.length > 4 && (
        <span className="inline-flex items-center rounded-full bg-zinc-100 border border-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
          +{active.length - 4} more
        </span>
      )}
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function WorkersPage() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const currentUserId = session?.user?.id ?? ""

  const { data: workers = [], isLoading, isError } = useWorkers()
  const { data: branches = [] } = useBranches()

  // Create form state
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState("")
  const [roleLabel, setRoleLabel] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [branchName, setBranchName] = useState("")
  const [newPerms, setNewPerms] = useState<WorkerPermissions>(DEFAULT_PERMS)
  const [showPermPanel, setShowPermPanel] = useState(false)

  // Edit permissions state
  const [editTarget, setEditTarget] = useState<Worker | null>(null)
  const [editPerms, setEditPerms] = useState<WorkerPermissions>(DEFAULT_PERMS)
  const [editRoleLabel, setEditRoleLabel] = useState("")

  const [deleteTarget, setDeleteTarget] = useState<Worker | null>(null)

  function showToast(type: "success" | "error", message: string) {
    if (type === "success") toast.success(message)
    else toast.error(message)
  }

  // Create worker
  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/api/v1/create_worker", {
        worker_name: name.trim(),
        role_label: roleLabel.trim() || "",
        worker_branch_name: branchName.trim() || null,
        worker_email: email.trim(),
        worker_phone: phone.trim() || null,
        worker_password: password,
        permissions: newPerms,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workers"] })
      showToast("success", "Worker created successfully!")
      setName(""); setRoleLabel(""); setBranchName(""); setEmail(""); setPhone(""); setPassword("")
      setNewPerms(DEFAULT_PERMS); setShowForm(false); setShowPermPanel(false)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      showToast("error", msg || "Failed to create worker.")
    },
  })

  // Toggle active
  const toggleMutation = useMutation({
    mutationFn: async (workerId: string) => {
      await api.patch(`/api/v1/workers/${workerId}/toggle-status`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workers"] }),
    onError: () => showToast("error", "Failed to update worker status."),
  })

  // Delete worker
  const deleteMutation = useMutation({
    mutationFn: async (workerId: string) => {
      await api.delete(`/api/v1/workers/${workerId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workers"] })
      showToast("success", "Worker deleted.")
      setDeleteTarget(null)
    },
    onError: () => showToast("error", "Failed to delete worker."),
  })

  // Update permissions
  const permMutation = useMutation({
    mutationFn: async () => {
      if (!editTarget) return
      const { data } = await api.patch(`/api/v1/workers/${editTarget.id}/permissions`, {
        role_label: editRoleLabel,
        permissions: editPerms,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workers"] })
      showToast("success", `Permissions updated for ${editTarget?.worker_name}!`)
      setEditTarget(null)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      showToast("error", msg || "Failed to update permissions.")
    },
  })

  function openPermEditor(w: Worker) {
    setEditTarget(w)
    setEditPerms({ ...DEFAULT_PERMS, ...(w.permissions || {}) })
    setEditRoleLabel(w.role_label || "")
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-zinc-400" /> Workers
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">{workers.length} team member{workers.length !== 1 ? "s" : ""}</p>
        </div>
        <Button
          onClick={() => setShowForm((v) => !v)}
          className="bg-zinc-900 text-white hover:bg-zinc-700 gap-1.5"
          size="sm"
        >
          <UserPlus className="h-4 w-4" />
          {showForm ? "Cancel" : "Add Worker"}
        </Button>
      </div>


      {/* Create Worker Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 space-y-6">
          <h2 className="text-base font-semibold text-zinc-900">New Worker</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="w-name">Full name *</Label>
              <Input id="w-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Akosua Mensah" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="w-role-label">Job title / Role label</Label>
              <Input id="w-role-label" value={roleLabel} onChange={(e) => setRoleLabel(e.target.value)} placeholder="e.g. Cashier, Store Manager" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="w-email">Email address *</Label>
              <Input id="w-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="worker@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="w-phone">Phone (optional)</Label>
              <Input id="w-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+233 xx xxx xxxx" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="w-password">Password *</Label>
              <Input id="w-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Temporary password" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="w-branch">Branch</Label>
              {branches.length > 0 ? (
                <select
                  id="w-branch"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                >
                  <option value="">— Select branch —</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.branch_name}>{b.branch_name}{b.is_main ? " (Main)" : ""}</option>
                  ))}
                </select>
              ) : (
                <Input id="w-branch" value={branchName} onChange={(e) => setBranchName(e.target.value)} placeholder="Branch name" />
              )}
            </div>
          </div>

          {/* Permissions accordion */}
          <div className="border border-zinc-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowPermPanel((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-zinc-700 bg-zinc-50 hover:bg-zinc-100 transition-colors"
            >
              <span className="flex items-center gap-2"><Shield className="h-4 w-4 text-indigo-500" /> Configure Permissions</span>
              {showPermPanel ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
            </button>
            {showPermPanel && (
              <div className="p-4 border-t border-zinc-200 bg-white max-h-96 overflow-y-auto">
                <PermissionsPanel perms={newPerms} onChange={setNewPerms} />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)} disabled={createMutation.isPending}>Cancel</Button>
            <Button
              disabled={!name || !email || !password || createMutation.isPending}
              onClick={() => createMutation.mutate()}
              className="bg-zinc-900 text-white hover:bg-zinc-700"
            >
              {createMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Creating...</> : <>Create Worker</>}
            </Button>
          </div>
        </div>
      )}

      {/* Workers list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-zinc-500 gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />Loading workers...
        </div>
      ) : isError ? (
        <div className="text-center py-20 text-rose-600 text-sm">Failed to load workers. Please refresh.</div>
      ) : workers.length === 0 ? (
        <div className="text-center py-20 text-zinc-500 text-sm">No workers yet — add the first one above.</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50 text-xs text-zinc-500 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left font-medium">Worker</th>
                  <th className="px-4 py-3 text-left font-medium">Branch</th>
                  <th className="px-4 py-3 text-left font-medium">Permissions</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Joined</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {workers.map((w) => {
                  const isSelf = w.id === currentUserId
                  return (
                    <tr key={w.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-semibold text-xs uppercase shrink-0">
                            {w.worker_name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-zinc-900">{w.worker_name}</span>
                              {isSelf && <span className="text-[10px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded font-medium border border-zinc-200">You</span>}
                            </div>
                            <p className="text-xs text-zinc-400 font-mono">{w.worker_email}</p>
                            {w.role_label && <p className="text-xs text-indigo-600 font-medium mt-0.5">{w.role_label}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">{w.worker_branch_name || "General"}</td>
                      <td className="px-4 py-3"><PermBadges perms={w.permissions || {} as WorkerPermissions} /></td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                          w.is_active ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60" : "bg-rose-50 text-rose-700 border border-rose-200/60"
                        )}>
                          <span className={cn("h-1.5 w-1.5 rounded-full", w.is_active ? "bg-emerald-500" : "bg-rose-500")} />
                          {w.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">{formatDate(w.created_at)}</td>
                      <td className="px-4 py-3">
                        {!isSelf && (
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="ghost"
                              onClick={() => openPermEditor(w)}
                              className="h-8 px-2.5 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                              title="Edit permissions"
                            >
                              <Shield className="h-3.5 w-3.5 mr-1" />Permissions
                            </Button>
                            <Button size="sm" variant="ghost"
                              disabled={toggleMutation.isPending}
                              onClick={() => toggleMutation.mutate(w.id)}
                              className={cn("h-8 px-2.5 text-xs font-medium transition-colors",
                                w.is_active ? "text-amber-700 hover:text-amber-800 hover:bg-amber-50" : "text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                              )}
                            >
                              {w.is_active ? <><UserX className="h-3.5 w-3.5 mr-1 text-amber-600" />Deactivate</> : <><UserCheck className="h-3.5 w-3.5 mr-1 text-emerald-600" />Activate</>}
                            </Button>
                            <Button size="sm" variant="ghost"
                              onClick={() => setDeleteTarget(w)}
                              className="h-8 w-8 p-0 text-zinc-400 hover:text-rose-600 hover:bg-rose-50"
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

          {/* Mobile cards */}
          <div className="flex md:hidden flex-col gap-3">
            {workers.map((w) => {
              const isSelf = w.id === currentUserId
              return (
                <div key={w.id} className="bg-white rounded-xl border border-zinc-200 p-4 shadow-sm flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-zinc-900 truncate">{w.worker_name}</p>
                        {isSelf && <span className="text-[10px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded font-medium border border-zinc-200">You</span>}
                      </div>
                      <p className="text-xs text-zinc-500 font-mono mt-0.5 truncate">{w.worker_email}</p>
                      {w.role_label && <p className="text-xs text-indigo-600 font-medium mt-0.5">{w.role_label}</p>}
                      <div className="mt-2"><PermBadges perms={w.permissions || {} as WorkerPermissions} /></div>
                    </div>
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold shrink-0",
                      w.is_active ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60" : "bg-rose-50 text-rose-700 border border-rose-200/60"
                    )}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", w.is_active ? "bg-emerald-500" : "bg-rose-500")} />
                      {w.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500 border-t border-zinc-100 pt-2.5">Branch: <strong>{w.worker_branch_name || "General"}</strong></div>
                  {!isSelf && (
                    <div className="flex items-center gap-2 pt-1 border-t border-zinc-100 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => openPermEditor(w)} className="flex-1 h-8 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                        <Shield className="h-3.5 w-3.5 mr-1" />Permissions
                      </Button>
                      <Button size="sm" variant="outline" disabled={toggleMutation.isPending} onClick={() => toggleMutation.mutate(w.id)}
                        className={cn("flex-1 h-8 text-xs font-medium",
                          w.is_active ? "text-amber-700 hover:bg-amber-50 border-amber-200" : "text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                        )}>
                        {w.is_active ? <><UserX className="h-3.5 w-3.5 mr-1" />Deactivate</> : <><UserCheck className="h-3.5 w-3.5 mr-1" />Activate</>}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setDeleteTarget(w)} className="h-8 px-3 text-xs text-rose-600 border-rose-200 hover:bg-rose-50">
                        <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Permission Editor Slide-over */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditTarget(null)} />
          <div className="relative w-full sm:w-[420px] bg-white sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 shrink-0">
              <div>
                <h3 className="font-bold text-zinc-900 text-base">{editTarget.worker_name}</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Manage permissions</p>
              </div>
              <button onClick={() => setEditTarget(null)} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-zinc-100 text-zinc-400 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Role Label */}
            <div className="px-5 pt-4 pb-2 border-b border-zinc-100 shrink-0">
              <Label htmlFor="edit-role-label" className="text-xs font-medium text-zinc-600 mb-1.5 block">Job title / Role label</Label>
              <Input
                id="edit-role-label"
                value={editRoleLabel}
                onChange={(e) => setEditRoleLabel(e.target.value)}
                placeholder="e.g. Cashier, Store Manager, Supervisor"
              />
            </div>

            {/* Permissions Scroll Area */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <PermissionsPanel perms={editPerms} onChange={setEditPerms} />
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-zinc-100 flex gap-2.5 shrink-0">
              <Button variant="outline" className="flex-1" onClick={() => setEditTarget(null)} disabled={permMutation.isPending}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={permMutation.isPending}
                onClick={() => permMutation.mutate()}
              >
                {permMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Saving...</> : "Save Permissions"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-100 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="h-10 w-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <button onClick={() => setDeleteTarget(null)} className="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900">Delete Worker Account</h3>
              <p className="text-sm text-zinc-500 mt-1 leading-relaxed">
                Permanently delete <span className="font-semibold text-zinc-800">{deleteTarget.worker_name}</span>?
              </p>
              <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-100 text-xs text-rose-800 font-medium">
                This revokes their access immediately and cannot be undone.
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button variant="outline" disabled={deleteMutation.isPending} onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deleteTarget.id)} className="bg-rose-600 hover:bg-rose-700 text-white">
                {deleteMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Deleting...</> : <><Trash2 className="h-4 w-4 mr-1.5" />Delete Account</>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
