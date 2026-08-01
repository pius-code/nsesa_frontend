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

const LIMIT = 10

function errorMessage(err: unknown, fallback: string) {
  return (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? fallback; // noqa
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function ShopAvatar({ shop }: { shop: Shop }) {
  if (shop.shop_image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={shop.shop_image}
        alt={shop.shop_name}
        className="h-12 w-12 rounded-full object-cover shrink-0"
      />
    )
  }
  return (
    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
      <span className="text-base font-bold text-green-600 uppercase">
        {shop.shop_name.charAt(0)}
      </span>
    </div>
  )
}

function StatusBadge({ status }: { status: Shop["status"] }) {
  if (status === "active") return <Badge className="capitalize">Active</Badge>
  if (status === "suspended") return <Badge variant="warning" className="capitalize">Suspended</Badge> // noqa
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
      const { data } = await api.post(`/api/v1/shops/${shop.shop_name}/suspend`, { reason }) // noqa
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all_shops"] })
      toast.success("Shop suspended")
      reset()
    },
    onError: (err: unknown) => toast.error(errorMessage(err, "Failed to suspend shop")), // noqa
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/api/v1/shops/${shop.shop_name}/delete`, { reason }) // noqa
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all_shops"] })
      toast.success("Shop deleted")
      reset()
    },
    onError: (err: unknown) => toast.error(errorMessage(err, "Failed to delete shop")),
  })

  const reactivateMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/api/v1/shops/${shop.shop_name}/reactivate`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all_shops"] })
      toast.success("Shop reactivated")
    },
    onError: (err: unknown) => toast.error(errorMessage(err, "Failed to reactivate shop")), // noqa
  })

  const isPending = suspendMutation.isPending || deleteMutation.isPending || reactivateMutation.isPending; // noqa

  if (mode) {
    return (
      <div className="flex flex-col sm:flex-row gap-2 mt-2">
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={`Why is this shop being ${mode === "suspend" ? "suspended" : "deleted"}?`} // noqa
          className="sm:max-w-xs"
          autoFocus
        />
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={reset} disabled={isPending}> {/* noqa */}
            <X className="h-3.5 w-3.5" />
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={isPending || reason.trim().length < 3}
            onClick={() => (mode === "suspend" ? suspendMutation.mutate() : deleteMutation.mutate())} // noqa
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} {/* noqa */}
            Confirm
          </Button>
        </div>
      </div>
    )
  }

  if (shop.status === "active") {
    return (
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => setMode("suspend")}> {/* noqa */}
          <Ban className="h-3.5 w-3.5" />
          Suspend
        </Button>
        <Button type="button" size="sm" variant="destructive" onClick={() => setMode("delete")}> {/* noqa */}
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>
      </div>
    )
  }

  return (
    <Button
      type="button"
      size="sm"
      onClick={() => reactivateMutation.mutate()}
      disabled={reactivateMutation.isPending}
    >
      {reactivateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />} {/* noqa */}
      Reactivate
    </Button>
  )
}

export default function ShopsPage() {
  const [page, setPage] = useState(1)

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
        <h1 className="text-xl font-bold text-zinc-900">Shops</h1>
        <p className="text-sm text-zinc-500 mt-0.5">All registered shops on the platform</p>
      </div>

      {/* Summary card */}
      {!isLoading && !isError && (
        <div className="w-fit">
          <div className="bg-white rounded-xl border border-zinc-200 px-5 py-4">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Total Shops</p>
            <p className="text-3xl font-bold text-zinc-900 mt-1">{totalShops}</p>
          </div>
        </div>
      )}

      {/* States */}
      {isLoading && (
        <div className="flex items-center justify-center py-20 gap-2 text-zinc-400 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading shops…
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
          <div className="hidden md:block bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-zinc-200 bg-zinc-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Shop</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Admin</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Workers</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {shops.map((shop) => (
                  <tr key={`${shop.shop_name}-${shop.admin_email}`} className="hover:bg-zinc-50 transition-colors align-top">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ShopAvatar shop={shop} />
                        <span className="text-sm font-semibold text-zinc-900 capitalize">
                          {shop.shop_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-zinc-800">{shop.admin_name}</p>
                      <p className="text-xs text-zinc-400">{shop.admin_email}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-600">
                        <Users className="h-3 w-3" />
                        {shop.worker_count}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={shop.status} />
                      {shop.status !== "active" && shop.status_reason && (
                        <p className="text-xs text-zinc-400 mt-1 max-w-[16rem]">{shop.status_reason}</p> // noqa
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ShopActions shop={shop} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="flex md:hidden flex-col gap-3">
            {shops.map((shop) => (
              <div key={`${shop.shop_name}-${shop.admin_email}`} className="bg-white rounded-xl border border-zinc-200 px-4 py-4">
                <div className="flex items-center gap-3">
                  <ShopAvatar shop={shop} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-zinc-900 capitalize truncate">{shop.shop_name}</p>
                    <p className="text-xs text-zinc-500 truncate">{shop.admin_name}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-600">
                      <Users className="h-3 w-3" />
                      {shop.worker_count}
                    </span>
                    <StatusBadge status={shop.status} />
                  </div>
                </div>
                {shop.status !== "active" && shop.status_reason && (
                  <p className="text-xs text-zinc-400 mt-2">{shop.status_reason}</p>
                )}
                <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center gap-2 text-xs text-zinc-400">
                  <Mail className="h-3 w-3 shrink-0" />
                  <span className="truncate">{shop.admin_email}</span>
                  <span className="ml-auto shrink-0">{formatDate(shop.created_at)}</span>
                </div>
                <div className="mt-3 pt-3 border-t border-zinc-100">
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
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
