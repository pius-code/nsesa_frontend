"use client"

import { useState } from "react"
import { CSVPreviewResult } from "@/lib/csv-preview"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, AlertCircle, FileSpreadsheet, Loader2, Upload, X } from "lucide-react"

interface CSVImportPreviewProps {
  fileName: string
  preview: CSVPreviewResult
  isPending: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function CSVImportPreview({
  fileName,
  preview,
  isPending,
  onConfirm,
  onCancel,
}: CSVImportPreviewProps) {
  const [showAll, setShowAll] = useState(false)
  const displayRows = showAll ? preview.rows : preview.rows.slice(0, 20)

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5 space-y-4 shadow-sm animate-in fade-in duration-150">
      {/* Header & Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-9 w-9 rounded-lg bg-green-50 border border-green-200 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="h-5 w-5 text-green-700" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-zinc-900 truncate">{fileName}</p>
            <p className="text-xs text-zinc-500">Review products before saving to your inventory</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-800">
            {preview.totalRows} Total Rows
          </span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 gap-1">
            <CheckCircle2 className="h-3 w-3" /> {preview.validCount} Valid
          </span>
          {preview.errorCount > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 gap-1">
              <AlertCircle className="h-3 w-3" /> {preview.errorCount} Error{preview.errorCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Preview Table */}
      <div className="rounded-lg border border-zinc-200 overflow-hidden">
        <div className="max-h-72 overflow-y-auto overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 sticky top-0 z-10 text-zinc-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Product Name</th>
                <th className="px-3 py-2 text-left">SKU</th>
                <th className="px-3 py-2 text-left">Category</th>
                <th className="px-3 py-2 text-left">Branch</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Retail Price</th>
                <th className="px-3 py-2 text-right">Cost Price</th>
                <th className="px-3 py-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {displayRows.map((row) => (
                <tr
                  key={row.rowNumber}
                  className={row.isValid ? "hover:bg-zinc-50/60" : "bg-rose-50/50 hover:bg-rose-50"}
                >
                  <td className="px-3 py-2 text-zinc-400 font-mono">{row.rowNumber}</td>
                  <td className="px-3 py-2 font-medium text-zinc-900 min-w-[140px]">
                    {row.productName || <span className="text-rose-400 italic">Missing</span>}
                  </td>
                  <td className="px-3 py-2 text-zinc-500 font-mono">{row.sku || "-"}</td>
                  <td className="px-3 py-2 text-zinc-600">{row.category || "-"}</td>
                  <td className="px-3 py-2 text-zinc-600">{row.branch || "-"}</td>
                  <td className="px-3 py-2 text-right font-semibold text-zinc-900">
                    {row.quantity !== null ? row.quantity : <span className="text-rose-500">Invalid</span>}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-zinc-900">
                    {row.price !== null ? `GHS ${row.price.toFixed(2)}` : <span className="text-rose-500">Invalid</span>}
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-500">
                    {row.costPrice !== null && row.costPrice > 0 ? `GHS ${row.costPrice.toFixed(2)}` : "-"}
                  </td>
                  <td className="px-3 py-2 text-center whitespace-nowrap">
                    {row.isValid ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="h-3 w-3" /> Ready
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full" title={row.error}>
                        <AlertCircle className="h-3 w-3" /> {row.error || "Error"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {preview.rows.length > 20 && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-green-700 hover:text-green-800 font-medium cursor-pointer"
          >
            {showAll ? "Show less (first 20 rows)" : `View all ${preview.rows.length} rows...`}
          </button>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-zinc-100">
        <p className="text-xs text-zinc-500">
          {preview.errorCount > 0
            ? `${preview.errorCount} row(s) with errors will be skipped during import.`
            : "All rows verified and ready to be imported."}
        </p>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
            className="w-full sm:w-auto text-xs h-9 cursor-pointer"
          >
            <X className="h-3.5 w-3.5 mr-1 text-zinc-400" />
            Cancel & Change File
          </Button>

          <Button
            type="button"
            onClick={onConfirm}
            disabled={isPending || preview.validCount === 0}
            className="w-full sm:w-auto bg-green-700 hover:bg-green-800 text-white text-xs h-9 font-semibold shadow-xs cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Accept & Import ({preview.validCount} Items)
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
