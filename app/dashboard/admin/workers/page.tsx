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
  AlertTriangle,
  X,
} from "lucide-react"
import api from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface Worker {
  id: string
  worker_name: string
  worker_shop_name: string
  worker_branch_name: string
  worker_role: string
  worker_email: string
  is_active: boolean
  created_at: string
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

export default function WorkersPage() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const currentUserId = session?.user?.id ?? ""
  const shopName = session?.user?.worker_shop_name ?? ""

  const { data: workers = [], isLoading, isError } = useWorkers()
  const { data: branches = [] } = useBranches()
  const [branchName, setBranchName] = useState("")

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState("")
  const [role, setRole] = useState("worker")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")

  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Worker | null>(null)

  function showToast(type: "success" | "error", message: string) {
    setNotification({ type, message })
    setTimeout(() => {
      setNotification((prev) => (prev?.message === message ? null : prev))
    }, 4000)
  }

  // Create Worker Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/api/v1/create_worker", {
        worker_name: name.trim(),
        worker_role: role,
        worker_branch_name: branchName.trim() || null,
        worker_email: email.trim(),
        worker_phone: phone.trim() || null,
        worker_password: password,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workers"] })
      showToast("success", "Worker account created successfully!")
      setName("")
      setRole("worker")
      setBranchName("")
      setEmail("")
      setPhone("")
      setPassword("")
      setShowForm(false)
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail ?? "Failed to create worker. The email may already be in use."
      showToast("error", msg)
    },
  })

  // Toggle Active/Inactive Mutation
  const toggleMutation = useMutation({
    mutationFn: async (workerId: string) => {
      const { data } = await api.patch(`/api/v1/workers/${workerId}/toggle-status`)
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["workers"] })
      showToast("success", data.message || "Worker status updated successfully!")
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail ?? "Failed to update worker status."
      showToast("error", msg)
    },
  })

  // Delete Worker Mutation
  const deleteMutation = useMutation({
    mutationFn: async (workerId: string) => {
      const { data } = await api.delete(`/api/v1/workers/${workerId}`)
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["workers"] })
      showToast("success", data.message || "Worker removed successfully!")
      setDeleteTarget(null)
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail ?? "Failed to delete worker."
      showToast("error", msg)
      setDeleteTarget(null)
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    createMutation.mutate()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Workers & Staff</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {!isLoading && `${workers.length} team member${workers.length !== 1 ? "s" : ""} in ${shopName}`}
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} variant={showForm ? "outline" : "default"}>
          <UserPlus className="h-4 w-4" />
          Add Worker
        </Button>
      </div>

      {notification && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium border transition-all animate-in fade-in",
            notification.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          )}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Add worker form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-zinc-200 shadow-sm divide-y divide-zinc-100"
        >
          <div className="px-5 py-5 space-y-4">
            <p className="text-sm font-semibold text-zinc-700">New Worker Registration</p>

            <div className="space-y-1.5">
              <Label htmlFor="worker_name">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="worker_name"
                placeholder="e.g. Kwame Mensah"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="worker_role">Role <span className="text-red-500">*</span></Label>
              <select
                id="worker_role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-600/10"
              >
                <option value="worker">Worker</option>
                <option value="admin">Admin</option>
                {session?.user?.worker_role === "super_admin" && (
                  <option value="super_admin">Super Admin</option>
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="worker_branch">Assigned Branch</Label>
              <select
                id="worker_branch"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                className="w-full h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-600/10"
              >
                <option value="">Unassigned (All/General)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.branch_name}>
                    {b.branch_name} {b.is_main ? "(Main Branch)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="worker_email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="worker_email"
                type="email"
                placeholder="worker@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="worker_phone">Phone</Label>
              <Input
                id="worker_phone"
                placeholder="0XX XXX XXXX (optional, used for platform SMS)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="worker_password">
                Password <span className="text-red-500">*</span>
              </Label>
              <Input
                id="worker_password"
                type="password"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
          </div>

          <div className="px-5 py-4 flex gap-3">
            <Button type="submit" disabled={createMutation.isPending} className="flex-1">
              {createMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Creating...</>
              ) : (
                <><UserPlus className="h-4 w-4" />Create Worker</>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Workers list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-zinc-400 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading workers...
        </div>
      ) : isError ? (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-red-600 text-sm">
          Failed to load workers. Please refresh.
        </div>
      ) : workers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white py-20 text-center">
          <Users className="h-10 w-10 text-zinc-300 mb-3" />
          <p className="text-sm font-medium text-zinc-500">No workers yet</p>
          <p className="text-xs text-zinc-400 mt-1">Add your first team member above</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-zinc-200 bg-zinc-50/80">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Branch</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Joined</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {workers.map((w) => {
                  const isSelf = w.id === currentUserId
                  return (
                    <tr key={w.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="px-4 py-3.5 text-sm font-medium text-zinc-900">
                        <div className="flex items-center gap-2">
                          <span>{w.worker_name}</span>
                          {isSelf && (
                            <span className="text-[10px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded font-medium border border-zinc-200">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-zinc-600 font-mono text-xs">{w.worker_email}</td>
                      <td className="px-4 py-3.5">
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                          w.worker_role === "super_admin"
                            ? "bg-purple-100 text-purple-700"
                            : w.worker_role === "admin"
                            ? "bg-zinc-900 text-white"
                            : "bg-zinc-100 text-zinc-600"
                        )}>
                          {w.worker_role === "super_admin" ? "Super Admin" : w.worker_role}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-zinc-600">
                        {w.worker_branch_name ? (
                          <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                            {w.worker_branch_name}
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-400 italic">General</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-zinc-500 whitespace-nowrap">{formatDate(w.created_at)}</td>
                      <td className="px-4 py-3.5">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          w.is_active
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                            : "bg-rose-50 text-rose-700 border border-rose-200/60"
                        )}>
                          <span className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            w.is_active ? "bg-emerald-500" : "bg-rose-500"
                          )} />
                          {w.is_active ? "Active" : "Deactivated"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {isSelf ? (
                          <span className="text-xs text-zinc-400 italic pr-2">Protected</span>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={toggleMutation.isPending}
                              onClick={() => toggleMutation.mutate(w.id)}
                              className={cn(
                                "h-8 px-2.5 text-xs font-medium transition-colors",
                                w.is_active
                                  ? "text-amber-700 hover:text-amber-800 hover:bg-amber-50 border-amber-200"
                                  : "text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-200"
                              )}
                              title={w.is_active ? "Deactivate worker (prevent login)" : "Activate worker"}
                            >
                              {w.is_active ? (
                                <><UserX className="h-3.5 w-3.5 mr-1 text-amber-600" />Deactivate</>
                              ) : (
                                <><UserCheck className="h-3.5 w-3.5 mr-1 text-emerald-600" />Activate</>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteTarget(w)}
                              className="h-8 w-8 p-0 text-zinc-400 hover:text-rose-600 hover:bg-rose-50"
                              title="Delete worker permanently"
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
                        {isSelf && (
                          <span className="text-[10px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded font-medium border border-zinc-200">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 font-mono mt-0.5 truncate">{w.worker_email}</p>
                    </div>
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold shrink-0",
                      w.is_active
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                        : "bg-rose-50 text-rose-700 border border-rose-200/60"
                    )}>
                      <span className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        w.is_active ? "bg-emerald-500" : "bg-rose-500"
                      )} />
                      {w.is_active ? "Active" : "Deactivated"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-zinc-500 border-t border-zinc-100 pt-2.5">
                    <span className="capitalize">Role: <strong>{w.worker_role}</strong></span>
                    <span>Branch: <strong>{w.worker_branch_name || "General"}</strong></span>
                  </div>

                  {!isSelf && (
                    <div className="flex items-center gap-2 pt-1 border-t border-zinc-100">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={toggleMutation.isPending}
                        onClick={() => toggleMutation.mutate(w.id)}
                        className={cn(
                          "flex-1 h-8 text-xs font-medium",
                          w.is_active
                            ? "text-amber-700 hover:text-amber-800 hover:bg-amber-50 border-amber-200"
                            : "text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-200"
                        )}
                      >
                        {w.is_active ? (
                          <><UserX className="h-3.5 w-3.5 mr-1 text-amber-600" />Deactivate</>
                        ) : (
                          <><UserCheck className="h-3.5 w-3.5 mr-1 text-emerald-600" />Activate</>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteTarget(w)}
                        className="h-8 px-3 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-100 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start justify-between gap-3">
              <div className="h-10 w-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <button
                onClick={() => setDeleteTarget(null)}
                className="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div>
              <h3 className="text-lg font-bold text-zinc-900">Delete Worker Account</h3>
              <p className="text-sm text-zinc-500 mt-1 leading-relaxed">
                Are you sure you want to permanently delete{" "}
                <span className="font-semibold text-zinc-800">{deleteTarget.worker_name}</span>{" "}
                (<span className="font-mono text-xs text-zinc-600">{deleteTarget.worker_email}</span>)?
              </p>
              <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-100 text-xs text-rose-800 font-medium">
                This will immediately revoke their platform access and remove their account record. This action cannot be undone.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                disabled={deleteMutation.isPending}
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {deleteMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Deleting...</>
                ) : (
                  <><Trash2 className="h-4 w-4 mr-1.5" />Delete Account</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
