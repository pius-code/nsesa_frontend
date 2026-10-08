import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getErrorMessage(err: unknown, fallback: string = "An error occurred"): string {
  if (!err) return fallback
  if (typeof err === "string") return err

  const anyErr = err as any
  const data = anyErr?.response?.data

  // FastAPI / Pydantic validation error or custom detail
  const detail = data?.detail
  if (typeof detail === "string") return detail
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0]
    if (typeof first === "string") return first
    if (first && typeof first === "object" && typeof first.msg === "string") {
      const field = Array.isArray(first.loc) ? first.loc[first.loc.length - 1] : null
      const cleanMsg = first.msg.replace(/^Value error,\s*/i, "")
      return field && typeof field === "string" && !["body", "query", "path"].includes(field)
        ? `${field.replace(/_/g, " ")}: ${cleanMsg}`
        : cleanMsg
    }
  }
  if (detail && typeof detail === "object") {
    if (typeof detail.msg === "string") {
      return detail.msg.replace(/^Value error,\s*/i, "")
    }
    if (typeof detail.message === "string") return detail.message
    if (typeof detail.error === "string") return detail.error
  }

  if (typeof data?.message === "string") return data.message
  if (typeof data?.error === "string") return data.error
  if (typeof anyErr?.message === "string") return anyErr.message

  return fallback
}
