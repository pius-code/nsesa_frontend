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
  Smartphone,
  Search,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Info,
  Clock,
  Store,
} from "lucide-react";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const SMS_SEGMENT_LENGTH = 160;

interface Recipient {
  name?: string | null;
  phone: string;
}

interface RecipientResponse {
  recipient_count: number;
  recipients?: Recipient[];
}

function useBranchRecipientCount() {
  return useQuery<RecipientResponse>({
    queryKey: ["worker-broadcast-recipients-count"],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/broadcast/recipients-count");
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

const SAMPLE_TEMPLATES = [
  {
    label: "Branch Flash Sale",
    text: "Flash Sale at our branch today! Visit us to enjoy special discounts on select items.",
  },
  {
    label: "Fresh Stock Arrival",
    text: "New products have just arrived at our branch! Pop in today to get yours while stock lasts.",
  },
  {
    label: "Thank You Note",
    text: "Thank you for shopping at our branch! We appreciate your loyalty and look forward to serving you again.",
  },
  {
    label: "Weekend Hours",
    text: "Notice: Our branch is open all weekend to serve you. Visit us for great deals!",
  },
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    "bg-emerald-100 text-emerald-700",
    "bg-blue-100 text-blue-700",
    "bg-indigo-100 text-indigo-700",
    "bg-violet-100 text-violet-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
  ];
  return colors[Math.abs(hash) % colors.length];
}

export default function WorkerBroadcastPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const branchName = session?.user?.worker_branch_name || "Main Branch";
  const shopName = session?.user?.worker_shop_name || "";

  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [confirming, setConfirming] = useState(false);

  const { data: countData, isLoading: countLoading } = useBranchRecipientCount();
  const recipientCount = countData?.recipient_count ?? 0;
  const recipients = countData?.recipients ?? [];

  const charCount = message.length;
  const segments = Math.ceil(charCount / SMS_SEGMENT_LENGTH) || 1;
  const charsRemainingInSegment =
    charCount === 0
      ? SMS_SEGMENT_LENGTH
      : SMS_SEGMENT_LENGTH - (charCount % SMS_SEGMENT_LENGTH || SMS_SEGMENT_LENGTH);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/api/v1/broadcast/sms", {
        message: message.trim(),
        branch_name: branchName,
      });
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message ?? "Broadcast queued successfully");
      setMessage("");
      setConfirming(false);
      queryClient.invalidateQueries({ queryKey: ["worker-broadcast-recipients-count"] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg ?? "Failed to send broadcast");
      setConfirming(false);
    },
  });

  const filteredRecipients = recipients.filter(
    (r) =>
      r.phone.includes(search) ||
      (r.name && r.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-green-700" />
              Branch SMS Broadcast
            </h1>
            <Badge variant="secondary" className="gap-1 font-semibold text-zinc-700">
              <Store className="h-3 w-3 text-green-600" />
              {branchName}
            </Badge>
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            Send announcements directly to customers who visited or shopped at {branchName}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Composer */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-green-600" />
                <h2 className="text-sm font-bold text-zinc-900">Message Composer</h2>
              </div>
              <span className="text-xs text-zinc-400">
                Sender ID: <strong className="text-zinc-700">{shopName}</strong>
              </span>
            </div>

            {/* Template shortcuts */}
            <div>
              <Label className="text-xs text-zinc-500 flex items-center gap-1 mb-2">
                <Sparkles className="h-3 w-3 text-amber-500" /> Quick Templates
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.label}
                    type="button"
                    onClick={() => setMessage(tmpl.text)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium transition"
                  >
                    {tmpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea */}
            <div className="space-y-1.5">
              <Label htmlFor="broadcast_msg" className="text-xs font-semibold text-zinc-700">
                Message Content
              </Label>
              <textarea
                id="broadcast_msg"
                rows={4}
                maxLength={459}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  setConfirming(false);
                }}
                placeholder="Type your branch message here..."
                className="w-full rounded-xl border border-zinc-300 p-3 text-sm text-zinc-900 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-600/10 resize-none"
              />
              <div className="flex justify-between items-center text-xs text-zinc-400 pt-1">
                <span>{charCount}/459 characters</span>
                <span className="font-medium text-zinc-600">
                  {segments} SMS part{segments > 1 ? "s" : ""} ({charsRemainingInSegment} chars left in part)
                </span>
              </div>
            </div>

            {/* Confirm & Send Button */}
            <div className="pt-2">
              {!confirming ? (
                <Button
                  onClick={() => setConfirming(true)}
                  disabled={!message.trim() || recipientCount === 0 || countLoading}
                  className="w-full h-11 text-sm font-semibold"
                >
                  <Send className="h-4 w-4 mr-1.5" />
                  Review & Send to {recipientCount} Branch Customer{recipientCount !== 1 ? "s" : ""}
                </Button>
              ) : (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-3">
                  <p className="text-sm font-medium text-green-900">
                    Ready to send to <strong>{recipientCount}</strong> customer{recipientCount !== 1 ? "s" : ""} of <strong>{branchName}</strong>?
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => sendMutation.mutate()}
                      disabled={sendMutation.isPending}
                      className="flex-1 bg-green-700 hover:bg-green-800 text-white"
                    >
                      {sendMutation.isPending ? (
                        <><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Queuing SMS...</>
                      ) : (
                        <><Check className="h-4 w-4 mr-1.5" /> Confirm & Send</>
                      )}
                    </Button>
                    <Button variant="outline" onClick={() => setConfirming(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Audience Preview */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-zinc-500" />
                <h3 className="text-sm font-bold text-zinc-900">Branch Audience</h3>
              </div>
              <Badge variant="secondary" className="font-semibold text-zinc-700">
                {countLoading ? "..." : `${recipientCount} total`}
              </Badge>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
              <Input
                placeholder="Search customers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs bg-zinc-50"
              />
            </div>

            {/* List */}
            {countLoading ? (
              <div className="flex items-center justify-center py-10 gap-2 text-zinc-400 text-xs">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading branch customers...
              </div>
            ) : filteredRecipients.length === 0 ? (
              <p className="text-xs text-zinc-400 py-8 text-center italic">
                {search ? "No matching customers found." : "No customers have visited this branch yet."}
              </p>
            ) : (
              <div className="divide-y divide-zinc-100 max-h-80 overflow-y-auto pr-1">
                {filteredRecipients.map((r, i) => (
                  <div key={i} className="py-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${getAvatarColor(r.name || "Customer")}`}>
                        {(r.name || "C").charAt(0).toUpperCase()}
                      </span>
                      <span className="font-medium text-zinc-800">{r.name || "Walk-in Customer"}</span>
                    </div>
                    <span className="font-mono text-zinc-500 text-[11px]">{r.phone}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
