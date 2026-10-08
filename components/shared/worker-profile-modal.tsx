"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  User,
  Mail,
  Phone,
  Store,
  Shield,
  Lock,
  Loader2,
  X,
  AlertTriangle,
  KeyRound,
  CheckCircle2,
} from "lucide-react"
import api from "@/lib/axios"
import { getErrorMessage } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface WorkerProfileModalProps {
  open: boolean
  onClose: () => void
  onOpenChangePassword?: () => void
}

interface ProfileData {
  id: string
  worker_name: string
  worker_shop_name: string
  worker_branch_name: string
  worker_role: string
  role_label: string
  worker_email: string
  worker_phone?: string | null
  worker_shop_image?: string
  permissions: Record<string, boolean>
  is_active: boolean
}

const PERM_LABELS: Record<string, string> = {
  can_sell: "Sales & POS",
  can_manage_orders: "Order Management",
  view_own_transactions: "View Own Txns",
  view_all_transactions: "View All Txns",
  can_add_inventory: "Add Products",
  can_update_stock: "Restock Inventory",
  can_add_others: "Manage Workers",
  can_manage_expenses: "Operating Expenses",
  can_view_own_branch_report: "Branch Reports",
  can_view_all_reports: "All Reports",
  can_add_categories: "Categories",
  can_sms_own_branch: "SMS (Branch)",
  can_sms_all_branches: "SMS (All)",
  can_see_clients: "View Clients",
  can_add_clients: "Add Clients",
  can_edit_clients: "Edit Clients",
  can_edit_profile: "Edit Profile Info",
}

export function WorkerProfileModal({
  open,
  onClose,
  onOpenChangePassword,
}: WorkerProfileModalProps) {
  const queryClient = useQueryClient()
  const [phone, setPhone] = useState("")
  const [name, setName] = useState("")

  const { data: profile, isLoading } = useQuery<ProfileData>({
    queryKey: ["worker-profile"],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/profile")
      return data
    },
    enabled: open,
    staleTime: 5000,
  })

  useEffect(() => {
    if (profile) {
      setPhone(profile.worker_phone || "")
      setName(profile.worker_name || "")
    }
  }, [profile])

  const canEditName =
    profile?.worker_role === "admin" ||
    profile?.worker_role === "super_admin" ||
    !!profile?.permissions?.can_edit_profile

  const updateMutation = useMutation({
    mutationFn: async () => {
      const trimmedPhone = phone.trim()
      if (!trimmedPhone) {
        throw new Error("Phone number is required.")
      }

      const payload: { worker_phone: string; worker_name?: string } = {
        worker_phone: trimmedPhone,
      }

      if (canEditName && name.trim()) {
        payload.worker_name = name.trim()
      }

      const { data } = await api.put("/api/v1/profile", payload)
      return data
    },
    onSuccess: () => {
      toast.success("Profile updated successfully!")
      queryClient.invalidateQueries({ queryKey: ["worker-profile"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-profile"] })
      onClose()
    },
    onError: (err: any) => {
      const msg = getErrorMessage(err, "Failed to update profile.")
      toast.error(msg)
    },
  })

  if (!open) return null

  const isPhoneMissing = !profile?.worker_phone || profile.worker_phone.trim() === ""
  const activePerms = Object.entries(profile?.permissions || {})
    .filter(([_, val]) => !!val)
    .map(([key]) => PERM_LABELS[key] || key)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-zinc-200 relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-600 p-1.5 rounded-full hover:bg-zinc-100 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-zinc-400">
            <Loader2 className="h-7 w-7 animate-spin text-green-700" />
            <p className="text-sm">Loading your profile...</p>
          </div>
        ) : profile ? (
          <div className="space-y-6">
            {/* Header info */}
            <div className="flex items-center gap-4 border-b border-zinc-100 pb-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-700 to-green-950 text-white flex items-center justify-center font-heading font-bold text-xl shadow-md shrink-0">
                {profile.worker_name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-zinc-900 truncate">
                  {profile.worker_name}
                </h3>
                <p className="text-xs text-zinc-500 capitalize flex items-center gap-1.5 mt-0.5">
                  <span className="font-semibold text-green-800 bg-green-50 px-2 py-0.5 rounded-md border border-green-200/60">
                    {profile.role_label || profile.worker_role?.replace("_", " ")}
                  </span>
                  <span>•</span>
                  <span>{profile.worker_shop_name?.replace(/_/g, " ")}</span>
                </p>
              </div>
            </div>

            {/* Missing phone alert */}
            {isPhoneMissing && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-amber-900">Phone Number Missing</p>
                  <p className="text-amber-700 mt-0.5 leading-relaxed">
                    Please enter your active phone number below. This ensures you can receive security alerts and password reset notifications.
                  </p>
                </div>
              </div>
            )}

            {/* Profile fields */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                updateMutation.mutate()
              }}
              className="space-y-4"
            >
              {/* Full Name */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="prof-name" className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-zinc-400" /> Full Name
                  </Label>
                  {!canEditName && (
                    <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                      <Lock className="h-3 w-3" /> Locked
                    </span>
                  )}
                </div>
                <Input
                  id="prof-name"
                  value={name}
                  disabled={!canEditName}
                  onChange={(e) => setName(e.target.value)}
                  className={cn(!canEditName && "bg-zinc-50 text-zinc-600 cursor-not-allowed")}
                  placeholder="Your full name"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="prof-email" className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-zinc-400" /> Email / Username
                </Label>
                <Input
                  id="prof-email"
                  value={profile.worker_email}
                  disabled
                  className="bg-zinc-50 text-zinc-600 font-mono text-xs cursor-not-allowed"
                />
              </div>

              {/* Phone number */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="prof-phone" className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-green-700" /> Phone Number *
                  </Label>
                  <span className="text-[11px] text-green-700 font-medium">Required for alerts</span>
                </div>
                <Input
                  id="prof-phone"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +233 24 123 4567 or 0241234567"
                  className={cn(
                    "font-mono text-sm",
                    isPhoneMissing && "border-amber-300 ring-2 ring-amber-100"
                  )}
                />
              </div>

              {/* Branch & Shop info */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-100">
                  <p className="text-[11px] font-medium text-zinc-400">Assigned Branch</p>
                  <p className="text-xs font-bold text-zinc-800 mt-0.5 truncate">
                    {profile.worker_branch_name || "Main Branch"}
                  </p>
                </div>
                <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-100">
                  <p className="text-[11px] font-medium text-zinc-400">Account Status</p>
                  <p className="text-xs font-bold text-emerald-700 mt-0.5 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Active Member
                  </p>
                </div>
              </div>

              {/* Active Permissions Section */}
              <div className="pt-2 border-t border-zinc-100">
                <p className="text-xs font-semibold text-zinc-700 mb-2 flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-indigo-600" />
                  Your Shop Permissions ({activePerms.length})
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1 bg-zinc-50/60 rounded-xl border border-zinc-100">
                  {profile.worker_role === "super_admin" || profile.worker_role === "admin" ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Full Administrative Access
                    </span>
                  ) : activePerms.length > 0 ? (
                    activePerms.map((perm) => (
                      <span
                        key={perm}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/60"
                      >
                        {perm}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-zinc-400 italic px-2 py-1">Standard member permissions</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-3 border-t border-zinc-100">
                {onOpenChangePassword && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      onClose()
                      onOpenChangePassword()
                    }}
                    className="w-full sm:w-auto h-9 text-xs text-zinc-700 border-zinc-200 gap-1.5 hover:bg-zinc-100"
                  >
                    <KeyRound className="h-3.5 w-3.5 text-zinc-500" />
                    Change Password
                  </Button>
                )}

                <div className="flex-1 w-full flex gap-2 sm:justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onClose}
                    className="flex-1 sm:flex-initial h-9 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending || !phone.trim()}
                    className="flex-1 sm:flex-initial h-9 text-xs bg-green-700 hover:bg-green-800 text-white font-medium"
                  >
                    {updateMutation.isPending ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        Saving...
                      </>
                    ) : (
                      "Save Profile"
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  )
}
