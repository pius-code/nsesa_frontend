"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Loader2,
  Store,
  Users,
  ChevronLeft,
  ChevronRight,
  Mail,
  Ban,
  Trash2,
  RotateCcw,
  X,
  Check,
  Building2,
  MessageSquare,
  Eye,
  TrendingUp,
  MapPin,
  Phone,
  Package,
  Star,
} from "lucide-react"
import api from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

interface Shop {
  shop_name: string
  shop_image: string | null
  admin_name: string
  admin_email: string
  admin_phone: string | null
  worker_count: number
  branch_count?: number
  sms_sent_count?: number
  created_at: string
  status: "active" | "suspended" | "deleted"
  status_reason: string | null
}

interface ShopsResponse {
  total_shops: number
  page: number
  limit: number
  total_pages: number
  shops: Shop[]
}

interface BranchDetail {
  id: string
  branch_name: string
  location?: string | null
  phone?: string | null
  is_main: boolean
  worker_count: number
  inventory_count: number
  sales_volume: number
}

interface WorkerDetail {
  id: string
  worker_name: string
  worker_email: string
  worker_role: string
  worker_branch_name?: string | null
  worker_phone?: string | null
  is_active: boolean
}

interface ShopDetailsResponse {
  shop_name: string
  shop_image?: string | null
  admin_name: string
  admin_email: string
  admin_phone?: string | null
  status: "active" | "suspended" | "deleted"
  status_reason?: string | null
  sms_sent_count: number
  total_revenue: number
  total_transactions: number
  branches: BranchDetail[]
  workers: WorkerDetail[]
  created_at: string
}

const LIMIT = 10

function errorMessage(err: unknown, fallback: string) {
  return (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? fallback
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 2,
  }).format(amount)
}

function ShopAvatar({ shop }: { shop: { shop_name: string; shop_image?: string | null } }) {
  if (shop.shop_image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={shop.shop_image}
        alt={shop.shop_name}
        className="h-10 w-10 rounded-full object-cover shrink-0"
      />
    )
  }
  return (
    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
      <span className="text-sm font-bold text-green-700 uppercase">
        {shop.shop_name.charAt(0)}
      </span>
    </div>
  )
}

function StatusBadge({ status }: { status: Shop["status"] }) {
  if (status === "active") return <Badge className="capitalize">Active</Badge>
  if (status === "suspended") return <Badge variant="secondary" className="capitalize bg-amber-100 text-amber-800">Suspended</Badge>
  return <Badge variant="destructive" className="capitalize">Deleted</Badge>
}

type ActionMode = "suspend" | "delete" | null

function ShopActions({ shop }: { shop: Shop }) {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<ActionMode>(null)
  const [reason, setReason] = useState("")

  function reset() {
    setMode(null)
    setReason("")
  }

  const suspendMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/api/v1/shops/${shop.shop_name}/suspend`, { reason })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all_shops"] })
      toast.success(`${shop.shop_name} suspended`)
      reset()
    },
    onError: (err) => {
      toast.error(errorMessage(err, "Failed to suspend shop"))
    },
  })

  const reactivateMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/api/v1/shops/${shop.shop_name}/reactivate`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all_shops"] })
      toast.success(`${shop.shop_name} reactivated`)
    },
    onError: (err) => {
      toast.error(errorMessage(err, "Failed to reactivate shop"))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.delete(`/api/v1/shops/${shop.shop_name}`, { data: { reason } })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all_shops"] })
      toast.success(`${shop.shop_name} deleted`)
      reset()
    },
    onError: (err) => {
      toast.error(errorMessage(err, "Failed to delete shop"))
    },
  })

  if (mode === "suspend") {
    return (
      <div className="flex items-center gap-2">
        <Input
          placeholder="Reason for suspension"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="h-8 text-xs w-44"
          autoFocus
        />
        <Button
          size="sm"
          variant="destructive"
          className="h-8 px-2 text-xs"
          onClick={() => suspendMutation.mutate()}
          disabled={suspendMutation.isPending || !reason.trim()}
        >
          {suspendMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
        </Button>
        <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={reset}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    )
  }

  if (mode === "delete") {
    return (
      <div className="flex items-center gap-2">
        <Input
          placeholder="Reason for deletion"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="h-8 text-xs w-44"
          autoFocus
        />
        <Button
          size="sm"
          variant="destructive"
          className="h-8 px-2 text-xs"
          onClick={() => deleteMutation.mutate()}
          disabled={deleteMutation.isPending || !reason.trim()}
        >
          {deleteMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
        </Button>
        <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={reset}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    )
  }

  if (shop.status === "active") {
    return (
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50"
          onClick={() => setMode("suspend")}
        >
          <Ban className="h-3 w-3 mr-1" />
          Suspend
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => setMode("delete")}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    )
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="h-8 px-2.5 text-xs text-green-700 hover:bg-green-50"
      onClick={() => reactivateMutation.mutate()}
      disabled={reactivateMutation.isPending}
    >
      {reactivateMutation.isPending ? (
        <Loader2 className="h-3 w-3 animate-spin mr-1" />
      ) : (
        <RotateCcw className="h-3 w-3 mr-1" />
      )}
      Reactivate
    </Button>
  )
}

function ShopDetailsModal({
  shopName,
  onClose,
}: {
  shopName: string
  onClose: () => void
}) {
  const { data, isLoading, isError } = useQuery<ShopDetailsResponse>({
    queryKey: ["shop_details", shopName],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/admin/shops/${encodeURIComponent(shopName)}/details`)
      return data
    },
  })

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-3">
            {data && <ShopAvatar shop={data} />}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-zinc-900 text-lg capitalize">{shopName}</h3>
                {data && <StatusBadge status={data.status} />}
              </div>
              <p className="text-xs text-zinc-500">
                Created {data ? formatDate(data.created_at) : "..."}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 p-1.5 rounded-lg hover:bg-zinc-200/60"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-zinc-400 text-sm">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading shop details...
            </div>
          ) : isError || !data ? (
            <div className="rounded-xl bg-red-50 border border-red-100 p-4 text-red-600 text-sm">
              Failed to load details for this shop.
            </div>
          ) : (
            <>
              {/* Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5">
                  <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                    Total Revenue
                  </span>
                  <p className="text-lg font-bold text-zinc-900 mt-1">
                    {formatCurrency(data.total_revenue)}
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">{data.total_transactions} orders</p>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5">
                  <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                    SMS Sent
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <MessageSquare className="h-4 w-4 text-blue-600" />
                    <p className="text-lg font-bold text-blue-700">{data.sms_sent_count}</p>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Platform SMS delivered</p>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5">
                  <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                    Branches
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Building2 className="h-4 w-4 text-emerald-600" />
                    <p className="text-lg font-bold text-zinc-900">{data.branches.length}</p>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Locations operating</p>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5">
                  <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                    Staff
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Users className="h-4 w-4 text-purple-600" />
                    <p className="text-lg font-bold text-zinc-900">{data.workers.length}</p>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Active users</p>
                </div>
              </div>

              {/* Admin info */}
              <div className="rounded-xl border border-zinc-200 p-4 bg-white">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Admin Contact
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-zinc-400 block">Name</span>
                    <span className="font-medium text-zinc-800">{data.admin_name}</span>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-400 block">Email</span>
                    <span className="font-medium text-zinc-800 truncate block">{data.admin_email}</span>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-400 block">Phone</span>
                    <span className="font-medium text-zinc-800">{data.admin_phone || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Branches list */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-sm font-bold text-zinc-900">
                    Branches ({data.branches.length})
                  </h4>
                </div>

                {data.branches.length === 0 ? (
                  <p className="text-xs text-zinc-400 italic">No branch records found.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {data.branches.map((b) => (
                      <div
                        key={b.id}
                        className="rounded-xl border border-zinc-200 p-3.5 bg-white space-y-2 hover:border-zinc-300 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Store className="h-4 w-4 text-green-600" />
                            <span className="font-semibold text-zinc-900 text-sm">{b.branch_name}</span>
                          </div>
                          {b.is_main ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                              <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                              Main
                            </span>
                          ) : (
                            <span className="text-[11px] text-zinc-400 bg-zinc-100 rounded-full px-2 py-0.5">
                              Branch
                            </span>
                          )}
                        </div>

                        <div className="space-y-1 text-xs text-zinc-500">
                          {b.location && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3 w-3 text-zinc-400 shrink-0" />
                              <span className="truncate">{b.location}</span>
                            </div>
                          )}
                          {b.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="h-3 w-3 text-zinc-400 shrink-0" />
                              <span>{b.phone}</span>
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-600">
                          <span>{b.worker_count} staff • {b.inventory_count} items</span>
                          <span className="font-semibold text-zinc-900">{formatCurrency(b.sales_volume)} sales</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Workers list */}
              <div>
                <h4 className="text-sm font-bold text-zinc-900 mb-2.5">
                  Assigned Team ({data.workers.length})
                </h4>
                <div className="rounded-xl border border-zinc-200 overflow-hidden bg-white">
                  <table className="w-full text-xs">
                    <thead className="bg-zinc-50 border-b border-zinc-200">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-zinc-500">Name</th>
                        <th className="px-3 py-2 text-left font-semibold text-zinc-500">Role</th>
                        <th className="px-3 py-2 text-left font-semibold text-zinc-500">Branch</th>
                        <th className="px-3 py-2 text-left font-semibold text-zinc-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {data.workers.map((w) => (
                        <tr key={w.id}>
                          <td className="px-3 py-2 font-medium text-zinc-900">{w.worker_name}</td>
                          <td className="px-3 py-2 text-zinc-600 capitalize">{w.worker_role}</td>
                          <td className="px-3 py-2 text-zinc-600">
                            {w.worker_branch_name ? (
                              <span className="inline-flex rounded-md bg-zinc-100 px-2 py-0.5 font-medium text-zinc-700">
                                {w.worker_branch_name}
                              </span>
                            ) : (
                              <span className="text-zinc-400 italic">None</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <span className={w.is_active ? "text-green-600 font-medium" : "text-zinc-400"}>
                              {w.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ShopsPage() {
  const [page, setPage] = useState(1)
  const [selectedShopName, setSelectedShopName] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery<ShopsResponse>({
    queryKey: ["all_shops", page],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/all_shops?page=${page}&limit=${LIMIT}`)
      return data
    },
    staleTime: 60 * 1000,
  })

  const shops = data?.shops ?? []
  const totalShops = data?.total_shops ?? 0
  const totalPages = data?.total_pages ?? 1

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Platform Shops</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          All registered businesses, branch networks, and platform SMS metrics
        </p>
      </div>

      {/* Summary card */}
      {!isLoading && !isError && (
        <div className="w-fit">
          <div className="bg-white rounded-xl border border-zinc-200 px-5 py-4 shadow-xs">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Total Registered Shops</p>
            <p className="text-3xl font-bold text-zinc-900 mt-1">{totalShops}</p>
          </div>
        </div>
      )}

      {/* States */}
      {isLoading && (
        <div className="flex items-center justify-center py-20 gap-2 text-zinc-400 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading shops...
        </div>
      )}

      {isError && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-red-600 text-sm">
          Failed to load shops. Please refresh.
        </div>
      )}

      {!isLoading && !isError && shops.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white py-20 text-center">
          <Store className="h-10 w-10 text-zinc-300 mb-3" />
          <p className="text-sm font-medium text-zinc-500">No shops yet</p>
        </div>
      )}

      {/* Shop list */}
      {shops.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-xs">
            <table className="w-full">
              <thead className="border-b border-zinc-200 bg-zinc-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Shop</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Admin</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Branches</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Workers</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">SMS Sent</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {shops.map((shop) => (
                  <tr key={`${shop.shop_name}-${shop.admin_email}`} className="hover:bg-zinc-50 transition-colors align-middle">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ShopAvatar shop={shop} />
                        <div>
                          <button
                            onClick={() => setSelectedShopName(shop.shop_name)}
                            className="text-sm font-bold text-zinc-900 capitalize hover:text-green-700 text-left transition-colors flex items-center gap-1.5"
                          >
                            {shop.shop_name}
                            <Eye className="h-3.5 w-3.5 text-zinc-400 hover:text-zinc-600" />
                          </button>
                          <span className="text-xs text-zinc-400 block">Joined {formatDate(shop.created_at)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-zinc-800">{shop.admin_name}</p>
                      <p className="text-xs text-zinc-400">{shop.admin_email}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-700">
                        <Building2 className="h-3 w-3 text-zinc-500" />
                        {shop.branch_count ?? 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-600">
                        <Users className="h-3 w-3" />
                        {shop.worker_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                        <MessageSquare className="h-3 w-3 text-blue-600" />
                        {shop.sms_sent_count ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={shop.status} />
                      {shop.status !== "active" && shop.status_reason && (
                        <p className="text-xs text-zinc-400 mt-1 max-w-[14rem] truncate">{shop.status_reason}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedShopName(shop.shop_name)}
                          className="h-8 px-2 text-xs"
                        >
                          Details
                        </Button>
                        <ShopActions shop={shop} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="flex md:hidden flex-col gap-3">
            {shops.map((shop) => (
              <div key={`${shop.shop_name}-${shop.admin_email}`} className="bg-white rounded-xl border border-zinc-200 px-4 py-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <ShopAvatar shop={shop} />
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => setSelectedShopName(shop.shop_name)}
                      className="font-bold text-zinc-900 capitalize truncate text-left block"
                    >
                      {shop.shop_name}
                    </button>
                    <p className="text-xs text-zinc-500 truncate">{shop.admin_name}</p>
                  </div>
                  <StatusBadge status={shop.status} />
                </div>

                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
                    <Building2 className="h-3 w-3 text-zinc-500" />
                    {shop.branch_count ?? 1} branches
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
                    <Users className="h-3 w-3" />
                    {shop.worker_count} workers
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                    <MessageSquare className="h-3 w-3 text-blue-600" />
                    {shop.sms_sent_count ?? 0} SMS
                  </span>
                </div>

                <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedShopName(shop.shop_name)}
                    className="h-8 text-xs"
                  >
                    View Details
                  </Button>
                  <ShopActions shop={shop} />
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <p className="text-sm text-zinc-500">
                Page <span className="font-semibold text-zinc-700">{page}</span> of{" "}
                <span className="font-semibold text-zinc-700">{totalPages}</span>
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Shop Details Slide-over / Modal */}
      {selectedShopName && (
        <ShopDetailsModal
          shopName={selectedShopName}
          onClose={() => setSelectedShopName(null)}
        />
      )}
    </div>
  )
}
