"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import {
  Store,
  Plus,
  MapPin,
  Phone,
  Users,
  Package,
  CheckCircle2,
  Loader2,
  Pencil,
  Trash2,
  Star,
  Building2,
  X,
} from "lucide-react"
import api from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface Branch {
  id: string
  branch_name: string
  location?: string | null
  phone?: string | null
  is_main: boolean
  is_active: boolean
  worker_count: number
  inventory_count: number
  created_at?: string
}

function useBranches() {
  return useQuery<Branch[]>({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/branches")
      return data
    },
    staleTime: 60 * 1000,
  })
}

function errorMessage(err: unknown, fallback: string) {
  return (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? fallback
}

export default function BranchesPage() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const shopName = session?.user?.worker_shop_name ?? ""

  const { data: branches = [], isLoading, isError } = useBranches()

  const [showModal, setShowModal] = useState(false)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)
  const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null)

  // Form fields
  const [branchName, setBranchName] = useState("")
  const [location, setLocation] = useState("")
  const [phone, setPhone] = useState("")
  const [isMain, setIsMain] = useState(false)

  function openCreateModal() {
    setEditingBranch(null)
    setBranchName("")
    setLocation("")
    setPhone("")
    setIsMain(branches.length === 0) // default to main if first branch
    setShowModal(true)
  }

  function openEditModal(branch: Branch) {
    setEditingBranch(branch)
    setBranchName(branch.branch_name)
    setLocation(branch.location || "")
    setPhone(branch.phone || "")
    setIsMain(branch.is_main)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingBranch(null)
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingBranch) {
        const { data } = await api.put(`/api/v1/branches/${editingBranch.id}`, {
          branch_name: branchName.trim(),
          location: location.trim() || null,
          phone: phone.trim() || null,
          is_main: isMain,
          is_active: true,
        })
        return data
      } else {
        const { data } = await api.post("/api/v1/branches", {
          branch_name: branchName.trim(),
          location: location.trim() || null,
          phone: phone.trim() || null,
          is_main: isMain,
        })
        return data
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] })
      toast.success(editingBranch ? "Branch updated successfully" : "New branch created successfully")
      closeModal()
    },
    onError: (err) => {
      toast.error(errorMessage(err, "Failed to save branch"))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (branchId: string) => {
      const { data } = await api.delete(`/api/v1/branches/${branchId}`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] })
      toast.success("Branch removed successfully")
      setDeletingBranch(null)
    },
    onError: (err) => {
      toast.error(errorMessage(err, "Failed to delete branch"))
    },
  })

  const totalWorkers = branches.reduce((acc, b) => acc + (b.worker_count || 0), 0)
  const totalItems = branches.reduce((acc, b) => acc + (b.inventory_count || 0), 0)
  const mainBranch = branches.find((b) => b.is_main)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Branch Management</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Manage your store branches, assign personnel, and track branch-specific stock for {shopName}
          </p>
        </div>
        <Button onClick={openCreateModal} className="shrink-0">
          <Plus className="h-4 w-4 mr-1.5" />
          Add Branch
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Branches</span>
            <Building2 className="h-5 w-5 text-zinc-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-zinc-900">{branches.length}</p>
          <p className="text-xs text-zinc-400 mt-1">Active retail outlets</p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Main Branch</span>
            <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
          </div>
          <p className="mt-2 text-lg font-bold text-zinc-900 truncate">
            {mainBranch ? mainBranch.branch_name : "None assigned"}
          </p>
          <p className="text-xs text-zinc-400 mt-1 truncate">
            {mainBranch?.location || "Primary hub for business"}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Assigned Staff</span>
            <Users className="h-5 w-5 text-zinc-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-zinc-900">{totalWorkers}</p>
          <p className="text-xs text-zinc-400 mt-1">Team members across branches</p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Branch Inventory</span>
            <Package className="h-5 w-5 text-zinc-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-zinc-900">{totalItems}</p>
          <p className="text-xs text-zinc-400 mt-1">Product lines tracked per branch</p>
        </div>
      </div>

      {/* Main List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-zinc-400 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading branches...
        </div>
      ) : isError ? (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-red-600 text-sm">
          Failed to load branches. Please refresh.
        </div>
      ) : branches.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white py-16 text-center">
          <Store className="h-10 w-10 text-zinc-300 mb-3" />
          <p className="text-base font-semibold text-zinc-700">No branches added yet</p>
          <p className="text-sm text-zinc-400 max-w-sm mt-1 mb-5">
            Add your main shop or secondary branches to track inventory and staff separately.
          </p>
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add First Branch
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm hover:border-zinc-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="h-9 w-9 rounded-lg bg-green-50 text-green-700 flex items-center justify-center font-bold">
                      <Store className="h-4 w-4" />
                    </span>
                    <div>
                      <h2 className="font-semibold text-zinc-900 text-base">{branch.branch_name}</h2>
                      <p className="text-xs text-zinc-400">Branch ID: {branch.id.slice(-6)}</p>
                    </div>
                  </div>
                  {branch.is_main ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-700">
                      <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                      Main
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                      Secondary
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-2 text-sm text-zinc-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                    <span className="truncate">{branch.location || "No location set"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                    <span>{branch.phone || "No phone contact"}</span>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2 border-t border-zinc-100 pt-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="text-xs text-zinc-400">Staff</p>
                      <p className="text-sm font-semibold text-zinc-800">{branch.worker_count || 0}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-emerald-500" />
                    <div>
                      <p className="text-xs text-zinc-400">Products</p>
                      <p className="text-sm font-semibold text-zinc-800">{branch.inventory_count || 0}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEditModal(branch)}
                  className="h-8 px-2.5 text-xs"
                >
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  Edit
                </Button>
                {!branch.is_main && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeletingBranch(branch)}
                    className="h-8 px-2.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-zinc-900 text-lg">
                  {editingBranch ? "Edit Branch" : "Add New Branch"}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Configure branch details for {shopName}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg hover:bg-zinc-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                saveMutation.mutate()
              }}
              className="p-6 space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="branch_name">
                  Branch Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="branch_name"
                  placeholder="e.g. Osu Oxford Street or Main Hub"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="branch_location">Physical Location / Address</Label>
                <Input
                  id="branch_location"
                  placeholder="e.g. Near Shell Station, Accra"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="branch_phone">Branch Contact Phone</Label>
                <Input
                  id="branch_phone"
                  placeholder="e.g. 0244123456"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <input
                  id="is_main"
                  type="checkbox"
                  checked={isMain}
                  onChange={(e) => setIsMain(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-green-600 focus:ring-green-600"
                />
                <Label htmlFor="is_main" className="cursor-pointer text-sm font-normal text-zinc-700">
                  Set as <strong>Main Branch</strong> (headquarters)
                </Label>
              </div>

              <div className="pt-4 flex gap-3">
                <Button
                  type="submit"
                  disabled={saveMutation.isPending || !branchName.trim()}
                  className="flex-1"
                >
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                      Saving...
                    </>
                  ) : editingBranch ? (
                    "Update Branch"
                  ) : (
                    "Create Branch"
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={closeModal}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingBranch && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-xl max-w-sm w-full p-6 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="h-12 w-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-zinc-900 text-lg">Delete Branch?</h3>
            <p className="text-sm text-zinc-500 mt-2">
              Are you sure you want to delete <strong>{deletingBranch.branch_name}</strong>?
            </p>
            <div className="mt-6 flex gap-3">
              <Button
                variant="destructive"
                className="flex-1"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deletingBranch.id)}
              >
                {deleteMutation.isPending ? "Deleting..." : "Yes, Delete"}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDeletingBranch(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
