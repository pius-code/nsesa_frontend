"use client";

import { useRef } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Printer, Link2, ImageDown, Loader2, ReceiptText } from "lucide-react";
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
  total_price: number;
  payment_mode: string | null;
  processed_by: string;
  shop_image: string | null;
  status: string;
  created_at: string;
  at_shop: string;
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

export default function ReceiptPage() {
  const { receipt_id } = useParams<{ receipt_id: string }>();
  const cardRef = useRef<HTMLDivElement>(null);

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

  function handlePrint() {
    window.print();
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard!");
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

  return (
    <div className="min-h-screen bg-zinc-100 flex flex-col items-center justify-center p-4 print:bg-white print:p-0 print:min-h-0 print:block">
      {/* Receipt card */}
      <div
        ref={cardRef}
        className="w-full max-w-sm bg-white rounded-2xl shadow-md overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-zinc-100">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {receipt.shop_image ? (
                <img
                  src={receipt.shop_image}
                  alt={receipt.at_shop}
                  className="h-10 w-10 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-zinc-400 uppercase">
                    {receipt.at_shop.charAt(0)}
                  </span>
                </div>
              )}
              <div>
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">
                  Receipt
                </p>
                <h1 className="text-lg font-bold text-zinc-900 capitalize">
                  {receipt.at_shop}
                </h1>
              </div>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize shrink-0 ${
                receipt.status === "success"
                  ? "bg-green-100 text-green-700"
                  : "bg-orange-100 text-orange-600"
              }`}
            >
              {receipt.status}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-3">
            {formatDate(receipt.created_at)}
          </p>
        </div>

        {/* Customer */}
        <div className="px-6 py-4 border-b border-zinc-100">
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1.5">
            Customer
          </p>
          <p className="text-sm font-medium text-zinc-800">
            {receipt.customer_name}
            {receipt.customer_number && (
              <span className="ml-2 text-xs text-zinc-400 font-normal">
                · {receipt.customer_number}
              </span>
            )}
          </p>
        </div>

        {/* Items */}
        <div className="px-6 py-4 border-b border-zinc-100">
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">
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

          <div className="flex items-center justify-between mt-4">
            <span className="text-sm font-semibold text-zinc-500">Total</span>
            <span className="text-2xl font-bold text-green-600">
              GH₵{receipt.total_price.toFixed(2)}
            </span>
          </div>
        </div>

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
        Managed by Father's Joy Pay Services
      </p>
    </div>
  );
}
