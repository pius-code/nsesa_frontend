"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Megaphone,
  Users,
  Loader2,
  Send,
  X,
  Check,
  ShieldCheck,
  Smartphone,
  Search,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Info,
  Clock,
} from "lucide-react";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const SMS_SEGMENT_LENGTH = 160;

type Target = "customers" | "shop_admins";

interface Recipient {
  name?: string | null;
  phone: string;
}

interface RecipientResponse {
  recipient_count: number;
  recipients?: Recipient[];
}

function useRecipientCount(target: Target) {
  return useQuery<RecipientResponse>({
    queryKey: ["broadcast-recipients-count", target],
    queryFn: async () => {
      const url =
        target === "customers"
          ? "/api/v1/broadcast/recipients-count"
          : "/api/v1/broadcast/shop-admins/recipients-count";
      const { data } = await api.get(url);
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

const SAMPLE_TEMPLATES = [
  {
    label: "Weekend Special",
    text: "Weekend Special! Enjoy 20% off all purchases at our store this Friday & Saturday.",
  },
  {
    label: "New Stock Alert",
    text: "New stock has just arrived! Visit us today to grab your favorite items before they run out.",
  },
  {
    label: "Customer Thank You",
    text: "Thank you for shopping with us! We appreciate your business and hope to see you again soon.",
  },
  {
    label: "Maintenance Notice",
    text: "Notice: The shop will not be open today from 2PM to 5PM due to temporary maintenance. We apologize for any inconvenience.",
  },
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    "bg-emerald-500",
    "bg-blue-500",
    "bg-purple-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-teal-500",
  ];
  return colors[Math.abs(hash) % colors.length];
}

export default function BroadcastPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.worker_role === "super_admin";

  const [target, setTarget] = useState<Target>("customers");
  const { data, isLoading } = useRecipientCount(target);
  const recipientCount = data?.recipient_count ?? 0;
  const recipients = data?.recipients ?? [];

  const [searchFilter, setSearchFilter] = useState("");
  const [showRecipientsList, setShowRecipientsList] = useState(true);
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState(false);

  const segments = Math.max(1, Math.ceil(message.length / SMS_SEGMENT_LENGTH));

  const filteredRecipients = recipients.filter((r) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      (r.name && r.name.toLowerCase().includes(q)) ||
      r.phone.toLowerCase().includes(q)
    );
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const url =
        target === "customers"
          ? "/api/v1/broadcast/sms"
          : "/api/v1/broadcast/shop-admins/sms";
      const { data } = await api.post(url, { message: message.trim() });
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message ?? "Broadcast queued successfully");
      setMessage("");
      setConfirming(false);
      queryClient.invalidateQueries({ queryKey: ["broadcast-recipients-count"] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response
        ?.data?.detail;
      toast.error(msg ?? "Failed to send broadcast");
      setConfirming(false);
    },
  });

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-green-50 text-green-700">
              <Megaphone className="h-6 w-6" />
            </div>
            SMS Broadcast Campaign
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Send targeted SMS messages to customers or shop staff directly.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Composer */}
        <div className="lg:col-span-7 space-y-6">
          {/* Target Audience Switcher */}
          {isSuperAdmin && (
            <div className="bg-white p-1.5 rounded-2xl border border-zinc-200 shadow-xs grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setTarget("customers");
                  setConfirming(false);
                }}
                className={cn(
                  "flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all",
                  target === "customers"
                    ? "bg-green-700 text-white shadow-xs"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                )}
              >
                <Users className="h-4 w-4" />
                My Customers
              </button>
              <button
                type="button"
                onClick={() => {
                  setTarget("shop_admins");
                  setConfirming(false);
                }}
                className={cn(
                  "flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all",
                  target === "shop_admins"
                    ? "bg-green-700 text-white shadow-xs"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                )}
              >
                <ShieldCheck className="h-4 w-4" />
                Shop Admins
              </button>
            </div>
          )}

          {/* Composer Card */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 space-y-5">
            {/* Recipient Audience Banner */}
            <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-green-50 to-emerald-50/60 border border-green-200/80 px-4 py-3 rounded-xl">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-green-600 text-white flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-green-900 uppercase tracking-wide">
                    Target Audience
                  </p>
                  {isLoading ? (
                    <div className="flex items-center gap-1.5 text-xs text-green-700 font-medium">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Loading recipients…
                    </div>
                  ) : (
                    <p className="text-sm font-bold text-green-950 truncate">
                      {recipientCount} {target === "customers" ? "customer" : "shop admin"}{recipientCount !== 1 ? "s" : ""} selected
                    </p>
                  )}
                </div>
              </div>

              {recipients.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowRecipientsList((v) => !v)}
                  className="flex items-center gap-1 text-xs font-bold text-green-700 hover:text-green-800 bg-white border border-green-200/80 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-green-50 transition-colors"
                >
                  {showRecipientsList ? (
                    <>
                      Hide List <ChevronUp className="h-3.5 w-3.5" />
                    </>
                  ) : (
                    <>
                      View List ({recipients.length}) <ChevronDown className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Quick Templates */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Quick Message Templates
              </label>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setMessage(tmpl.text);
                      setConfirming(false);
                    }}
                    className="text-xs font-medium bg-zinc-50 hover:bg-green-50 hover:text-green-700 hover:border-green-200 border border-zinc-200 text-zinc-700 px-3 py-1.5 rounded-xl transition-colors text-left"
                  >
                    {tmpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="broadcast_message" className="text-sm font-semibold text-zinc-800">
                  Message Content
                </Label>
                <span className="text-xs text-zinc-400 font-mono">
                  {message.length} / 459 characters
                </span>
              </div>
              <textarea
                id="broadcast_message"
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  setConfirming(false);
                }}
                placeholder={
                  target === "customers"
                    ? "e.g. 20% off all drinks this weekend only! Come through"
                    : "e.g. Notice: The shop will not be open today from 2PM to 5PM due to temporary maintenance."
                }
                rows={6}
                maxLength={459}
                className="flex w-full rounded-2xl border border-zinc-300 bg-white p-4 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-600/10 resize-none shadow-xs"
              />

              <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
                <span>
                  Estimated: <strong className="text-zinc-800">{segments} SMS segment{segments !== 1 ? "s" : ""}</strong> per recipient
                </span>
                <span className="text-zinc-400">
                  Total SMS: <strong className="text-zinc-800">{segments * recipientCount}</strong> messages
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            {!confirming ? (
              <Button
                type="button"
                size="lg"
                className="w-full bg-green-700 hover:bg-green-800 text-white gap-2 font-semibold shadow-sm"
                disabled={message.trim().length < 3 || recipientCount === 0}
                onClick={() => setConfirming(true)}
              >
                <Send className="h-4 w-4" />
                Proceed to Send Broadcast
              </Button>
            ) : (
              <div className="rounded-2xl bg-amber-50/90 border border-amber-200 p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-950">
                      Confirm SMS Broadcast Dispatch
                    </p>
                    <p className="text-xs text-amber-800 mt-1">
                      Are you sure you want to send this SMS to all{" "}
                      <strong className="font-bold underline">{recipientCount}</strong>{" "}
                      {target === "customers" ? "customers" : "shop admins"}? This action cannot be reversed.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConfirming(false)}
                    disabled={sendMutation.isPending}
                    className="flex-1 bg-white border-amber-200 text-amber-900 hover:bg-amber-100"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => sendMutation.mutate()}
                    disabled={sendMutation.isPending}
                    className="flex-1 bg-green-700 hover:bg-green-800 text-white font-semibold gap-2"
                  >
                    {sendMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Confirm & Send Now
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Mobile Screen Preview & Recipients List */}
        <div className="lg:col-span-5 space-y-6">
          {/* Live Mobile SMS Preview Mockup */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide flex items-center gap-1.5">
                <Smartphone className="h-4 w-4 text-zinc-400" />
                Live Mobile SMS Preview
              </span>
              <span className="text-[10px] bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full font-medium">
                Customer View
              </span>
            </div>

            {/* Mobile Device Mockup */}
            <div className="mx-auto w-full bg-zinc-900 rounded-3xl p-3 border-4 border-zinc-800 shadow-xl max-w-xs">
              <div className="bg-white rounded-2xl p-4 min-h-[220px] flex flex-col justify-between space-y-3">
                <div className="flex items-center gap-2 border-b border-zinc-100 pb-2">
                  <div className="h-6 w-6 rounded-full bg-green-600 text-white flex items-center justify-center text-[10px] font-bold">
                    FJ
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-zinc-900 leading-tight">
                      FJ Pay
                    </p>
                    <p className="text-[9px] text-zinc-400">Notification</p>
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-end">
                  <div className="bg-green-100/90 text-green-950 p-3 rounded-2xl rounded-bl-xs text-xs font-sans leading-relaxed shadow-2xs">
                    {message.trim() ? (
                      message
                    ) : (
                      <span className="text-zinc-400 italic">
                        Type your message on the left to see live preview…
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] text-zinc-400 mt-1 ml-1 text-right">
                    Just now
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recipient Preview & Search Card */}
          {showRecipientsList && (
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading font-semibold text-zinc-900 text-sm">
                    Recipients ({recipients.length})
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Customers receiving this SMS broadcast
                  </p>
                </div>
              </div>

              {recipients.length > 0 ? (
                <>
                  {/* Search Filter */}
                  <div className="relative">
                    <Search className="h-4 w-4 text-zinc-400 absolute left-3 top-2.5" />
                    <Input
                      type="text"
                      placeholder="Search recipient name or phone…"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="pl-9 text-xs h-9 rounded-xl border-zinc-200"
                    />
                  </div>

                  {/* Recipient List */}
                  <div className="divide-y divide-zinc-100 max-h-64 overflow-y-auto pr-1">
                    {filteredRecipients.length > 0 ? (
                      filteredRecipients.map((rec, idx) => {
                        const name = rec.name || "Customer";
                        const colorClass = getAvatarColor(name);
                        const initial = name.charAt(0).toUpperCase();

                        return (
                          <div key={idx} className="py-2.5 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={cn(
                                  "h-7 w-7 rounded-full text-white flex items-center justify-center text-xs font-bold shrink-0",
                                  colorClass
                                )}
                              >
                                {initial}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-zinc-900 truncate">
                                  {name}
                                </p>
                              </div>
                            </div>
                            <span className="font-mono text-xs text-zinc-500 font-medium shrink-0">
                              {rec.phone}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="py-4 text-center text-xs text-zinc-400">
                        No matching recipients found.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-6 text-zinc-400 text-xs">
                  <Users className="h-6 w-6 mx-auto mb-2 text-zinc-300" />
                  <p>Recipient list will load when backend response is available.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
