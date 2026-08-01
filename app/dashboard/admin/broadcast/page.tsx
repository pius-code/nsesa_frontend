"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { Megaphone, Users, Loader2, Send, X, Check, ShieldCheck } from "lucide-react"
import api from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

const SMS_SEGMENT_LENGTH = 160

type Target = "customers" | "shop_admins"

function useRecipientCount(target: Target) {
  return useQuery<{ recipient_count: number }>({
    queryKey: ["broadcast-recipients-count", target],
    queryFn: async () => {
      const url = target === "customers"
        ? "/api/v1/broadcast/recipients-count"
        : "/api/v1/broadcast/shop-admins/recipients-count"
      const { data } = await api.get(url)
      return data
    },
    staleTime: 5 * 60 * 1000,
  })
}

export default function BroadcastPage() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const isSuperAdmin = session?.user?.worker_role === "super_admin"

  const [target, setTarget] = useState<Target>("customers")
  const { data, isLoading } = useRecipientCount(target)
  const recipientCount = data?.recipient_count ?? 0

  const [message, setMessage] = useState("")
  const [confirming, setConfirming] = useState(false)

  const segments = Math.max(1, Math.ceil(message.length / SMS_SEGMENT_LENGTH))

  const sendMutation = useMutation({
    mutationFn: async () => {
      const url = target === "customers" ? "/api/v1/broadcast/sms" : "/api/v1/broadcast/shop-admins/sms" // noqa
      const { data } = await api.post(url, { message: message.trim() })
      return data
    },
    onSuccess: (data) => {
      toast.success(data.message ?? "Broadcast queued")
      setMessage("")
      setConfirming(false)
      queryClient.invalidateQueries({ queryKey: ["broadcast-recipients-count"] }) // noqa
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail // noqa
      toast.error(msg ?? "Failed to send broadcast")
      setConfirming(false)
    },
  })

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Send SMS</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          {target === "customers"
            ? "Broadcast a message to every customer who's ever bought from your shop" // noqa
            : "Broadcast a message to every shop admin on the platform"}
        </p>
      </div>

      {isSuperAdmin && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTarget("customers")}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-colors ${ // noqa
              target === "customers"
                ? "bg-green-600 border-green-600 text-white"
                : "bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300"
            }`}
          >
            <Users className="h-4 w-4" />
            My Customers
          </button>
          <button
            type="button"
            onClick={() => setTarget("shop_admins")}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-colors ${ // noqa
              target === "shop_admins"
                ? "bg-green-600 border-green-600 text-white"
                : "bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300"
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            Shop Admins
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4">
        <div className="flex items-center gap-2 rounded-lg bg-zinc-50 border border-zinc-100 px-3 py-2.5 text-sm text-zinc-600"> {/* noqa */}
          <Users className="h-4 w-4 text-zinc-400 shrink-0" />
          {isLoading ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Counting recipients…
            </span>
          ) : (
            <span>
              This will reach <span className="font-semibold text-zinc-900">{recipientCount}</span>{" "} {/* noqa */}
              {target === "customers" ? "customer" : "shop admin"}{recipientCount !== 1 ? "s" : ""} {/* noqa */}
            </span>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="broadcast_message">Message</Label>
          <textarea
            id="broadcast_message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={target === "customers"
              ? "e.g. 20% off all drinks this weekend only! Come through 🎉" // noqa
              : "e.g. Scheduled maintenance tonight 11pm-12am, the app may be briefly unavailable" // noqa
            }
            rows={5}
            maxLength={459}
            className="flex w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-600/10 resize-none" // noqa
          />
          <p className="text-xs text-zinc-400">
            {message.length}/459 characters · {segments} SMS segment{segments !== 1 ? "s" : ""} {/* noqa */}
          </p>
        </div>

        {!confirming ? (
          <Button
            type="button"
            className="w-full"
            disabled={message.trim().length < 3 || recipientCount === 0}
            onClick={() => setConfirming(true)}
          >
            <Send className="h-4 w-4" />
            Send Broadcast
          </Button>
        ) : (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3.5 space-y-3"> {/* noqa */}
            <p className="text-sm text-amber-800">
              Send this message to all <span className="font-semibold">{recipientCount}</span>{" "} {/* noqa */}
              {target === "customers" ? "customers" : "shop admins"} now? This can&apos;t be undone. {/* noqa */}
            </p>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setConfirming(false)} disabled={sendMutation.isPending}> {/* noqa */}
                <X className="h-3.5 w-3.5" />
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => sendMutation.mutate()}
                disabled={sendMutation.isPending}
                className="flex-1"
              >
                {sendMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} {/* noqa */}
                Confirm & Send
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 text-xs text-zinc-400">
        <Megaphone className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <p>
          {target === "customers"
            ? "Recipients are every unique phone number from a registered client or a past sale at your shop." // noqa
            : "Recipients are every shop admin with a phone number on file — add one from the Workers page if someone's missing."} {/* noqa */}
        </p>
      </div>
    </div>
  )
}
