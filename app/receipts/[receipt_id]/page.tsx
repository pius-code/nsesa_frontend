"use client";

import { useState, useRef, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Printer,
  Link2,
  ImageDown,
  Loader2,
  ReceiptText,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

interface ReceiptItem {
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
}

interface ReceiptData {
  _id: string;
  receipt_id: string;
  customer_name: string;
  customer_number: string | null;
  items: ReceiptItem[];
  subtotal?: number;
  discount?: number;
  tax?: number;
  total_price: number;
  payment_mode: string | null;
  processed_by: string;
  shop_image: string | null;
  status: string;
  created_at: string;
  at_shop: string;
  rating?: number | null;
  review_comment?: string | null;
  reviewed_at?: string | null;
  shop_reply?: string | null;
  shop_replied_at?: string | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPaymentMode(mode: string) {
  if (mode === "momo") return "MoMo";
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

// Deterministic hue from the shop name — mirrors the sidebar's avatar so a
// shop without a logo still gets a distinct, consistent brand color.
function nameToHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

export default function ReceiptPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-100 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
        </div>
      }
    >
      <ReceiptInner />
    </Suspense>
  );
}

function ReceiptInner() {
  const { receipt_id } = useParams<{ receipt_id: string }>();
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref");
  const queryClient = useQueryClient();
  const cardRef = useRef<HTMLDivElement>(null);

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");

  const {
    data: receipt,
    isLoading,
    isError,
  } = useQuery<ReceiptData>({
    queryKey: ["receipt", receipt_id],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/v1/receipt/${receipt_id}`);
      if (!res.ok) throw new Error("Receipt not found");
      return res.json();
    },
    enabled: !!receipt_id,
    staleTime: Infinity,
  });

  const reviewMutation = useMutation({
    mutationFn: async () => {
      if (!rating || rating < 1) throw new Error("Please select a star rating");
      if (!refCode) throw new Error("Missing review authorization reference");
      const res = await fetch(
        `${API_URL}/api/v1/receipt/${receipt_id}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ref: refCode,
            rating,
            comment: comment.trim() || null,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to submit feedback");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receipt", receipt_id] });
      toast.success("Thank you! Your feedback has been recorded.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to submit feedback");
    },
  });

  function handlePrint() {
    window.print();
  }

  function handleCopyLink() {
    // Strip ?ref= query parameter so shared receipts are strictly read-only
    const cleanUrl = `${window.location.origin}${window.location.pathname}`;
    navigator.clipboard.writeText(cleanUrl);
    toast.success("Link copied! (Verification token stripped)");
  }

  async function handleDownloadImage() {
    if (!cardRef.current) return;
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `receipt-${receipt?.receipt_id}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Receipt saved as image!");
    } catch {
      toast.error("Could not save image. Try screenshot instead.");
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (isError || !receipt) {
    return (
      <div className="min-h-screen bg-zinc-100 flex flex-col items-center justify-center gap-3 px-4 text-center">
        <ReceiptText className="h-10 w-10 text-zinc-300" />
        <p className="text-sm font-semibold text-zinc-500">Receipt not found</p>
        <p className="text-xs text-zinc-400">
          This receipt may have expired or the link is incorrect.
        </p>
      </div>
    );
  }

  const isRefunded = receipt.status === "returned";
  const isWithin72Hours =
    Date.now() - new Date(receipt.created_at).getTime() <= 72 * 60 * 60 * 1000;
  const hasReviewed = Boolean(receipt.rating);

  return (
    <div className="min-h-screen bg-zinc-100 py-8 px-4 flex flex-col items-center justify-center font-sans">
      {/* Receipt Card */}
      <div
        ref={cardRef}
        className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden"
      >
        {/* Header / Brand strip */}
        <div className="px-6 pt-6 pb-4 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            {receipt.shop_image ? (
              <img
                src={receipt.shop_image}
                alt={receipt.at_shop}
                className="w-12 h-12 rounded-xl object-cover shrink-0 border border-zinc-100 shadow-2xs"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-2xs"
                style={{
                  backgroundColor: `hsl(${nameToHue(receipt.at_shop)}, 65%, 45%)`,
                }}
              >
                {receipt.at_shop.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-base font-bold text-zinc-900 truncate">
                {receipt.at_shop}
              </h1>
              <p className="text-xs text-zinc-400">Official Receipt</p>
            </div>
            {isRefunded && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 shrink-0">
                Refunded
              </span>
            )}
          </div>
        </div>

        {/* Transaction meta */}
        <div className="px-6 py-3 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
          <span>{formatDate(receipt.created_at)}</span>
          <span className="font-mono text-zinc-400">#{receipt.receipt_id}</span>
        </div>

        {/* Customer greeting */}
        <div className="px-6 pt-4 pb-2">
          <p className="text-xs text-zinc-400">Billed to</p>
          <p className="text-sm font-semibold text-zinc-800 capitalize">
            {receipt.customer_name}
          </p>
          {receipt.customer_number && (
            <p className="text-xs text-zinc-400 font-mono">
              {receipt.customer_number}
            </p>
          )}
        </div>

        {/* Items */}
        <div className="px-6 py-3">
          <p className="text-xs text-zinc-400 mb-2 font-medium uppercase tracking-wider">
            Items
          </p>
          <div className="rounded-xl border border-zinc-100 overflow-hidden">
            {receipt.items.map((item, i) => (
              <div
                key={item.product_id}
                className={`flex items-center justify-between px-3 py-2.5 ${
                  i < receipt.items.length - 1 ? "border-b border-zinc-100" : ""
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800 truncate">
                    {item.product_name}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    GH₵{item.unit_price.toFixed(2)} × {item.quantity}
                  </p>
                </div>
                <span className="text-sm font-semibold text-zinc-700 shrink-0 ml-4">
                  GH₵{item.subtotal.toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* Breakdown if discount or tax exists */}
          {(Number(receipt.discount || 0) > 0 ||
            Number(receipt.tax || 0) > 0) && (
            <div className="mt-3 pt-3 border-t border-zinc-100 space-y-1.5 text-xs text-zinc-500">
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span className="font-medium text-zinc-700">
                  GH₵
                  {Number(receipt.subtotal || receipt.total_price).toFixed(2)}
                </span>
              </div>
              {Number(receipt.discount || 0) > 0 && (
                <div className="flex items-center justify-between text-rose-600 font-medium">
                  <span>Discount</span>
                  <span>-GH₵{Number(receipt.discount).toFixed(2)}</span>
                </div>
              )}
              {Number(receipt.tax || 0) > 0 && (
                <div className="flex items-center justify-between text-blue-600 font-medium">
                  <span>Tax / VAT</span>
                  <span>+GH₵{Number(receipt.tax).toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-100">
            <span className="text-sm font-semibold text-zinc-500">Total</span>
            <span className="text-2xl font-bold text-green-600">
              GH₵{receipt.total_price.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Customer Review Section */}
        {hasReviewed ? (
          <div className="px-6 py-4 border-t border-zinc-100 bg-amber-50/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-700">
                Customer Rating
              </span>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`h-3.5 w-3.5 ${
                      s <= (receipt.rating || 0)
                        ? "fill-amber-400 text-amber-400"
                        : "text-zinc-200"
                    }`}
                  />
                ))}
              </div>
            </div>
            {receipt.review_comment && (
              <p className="text-xs text-zinc-600 mt-2 italic bg-white/70 p-2.5 rounded-lg border border-amber-100">
                &ldquo;{receipt.review_comment}&rdquo;
              </p>
            )}
            {receipt.shop_reply && (
              <div className="mt-2.5 pl-3 border-l-2 border-emerald-500 py-1 bg-emerald-50/50 rounded-r-lg px-2">
                <p className="text-[11px] font-semibold text-emerald-800">
                  Response from {receipt.at_shop}:
                </p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  {receipt.shop_reply}
                </p>
              </div>
            )}
          </div>
        ) : refCode && isWithin72Hours ? (
          <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/70 print:hidden">
            <div className="text-center space-y-0.5 mb-2.5">
              <p className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                Rate your experience
              </p>
              <p className="text-[11px] text-zinc-500">
                How was your service with {receipt.at_shop}?
              </p>
            </div>

            <div className="flex justify-center items-center gap-1.5 mb-2.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 text-zinc-300 hover:text-amber-400 transition-colors cursor-pointer"
                  aria-label={`Rate ${star} star`}
                >
                  <Star
                    className={`h-6 w-6 transition-transform active:scale-95 ${
                      star <= (hoverRating || rating)
                        ? "fill-amber-400 text-amber-400"
                        : "text-zinc-300"
                    }`}
                  />
                </button>
              ))}
            </div>

            {rating > 0 && (
              <div className="space-y-2 animate-in fade-in duration-200">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Optional: leave a comment for the shop..."
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-lg border border-zinc-200 bg-white text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => reviewMutation.mutate()}
                  disabled={reviewMutation.isPending}
                  className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-medium cursor-pointer"
                >
                  {reviewMutation.isPending
                    ? "Submitting..."
                    : "Submit Feedback"}
                </Button>
              </div>
            )}
          </div>
        ) : refCode && !isWithin72Hours ? (
          <div className="px-6 py-2.5 border-t border-zinc-100 bg-zinc-50 text-center text-[11px] text-zinc-400 print:hidden">
            The 72-hour feedback period for this purchase has ended.
          </div>
        ) : null}

        {/* Footer info */}
        <div className="px-6 py-4 space-y-2">
          {receipt.payment_mode && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">Payment</span>
              <span className="text-xs font-semibold text-zinc-600">
                {formatPaymentMode(receipt.payment_mode)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">Served by</span>
            <span className="text-xs font-semibold text-zinc-600">
              {receipt.processed_by}
            </span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-zinc-50">
            <span className="text-[10px] text-zinc-300">Receipt ID</span>
            <span className="text-[10px] text-zinc-300 font-mono">
              ···{receipt.receipt_id.slice(-8).toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Actions — hidden when printing */}
      <div className="flex gap-2 mt-5 print:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrint}
          className="gap-1.5"
        >
          <Printer className="h-3.5 w-3.5" />
          Print
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyLink}
          className="gap-1.5"
        >
          <Link2 className="h-3.5 w-3.5" />
          Copy Link
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadImage}
          className="gap-1.5"
        >
          <ImageDown className="h-3.5 w-3.5" />
          Save Image
        </Button>
      </div>
      <p className="mt-3 text-xs text-zinc-400 print:hidden">
        Managed by Father&apos;s Joy Pay Services
      </p>
    </div>
  );
}
