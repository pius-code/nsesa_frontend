import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getErrorMessage(err: unknown, fallback: string = "An error occurred"): string {
  if (!err) return fallback
  const anyErr = err as any
  const detail = anyErr?.response?.data?.detail
  if (typeof detail === "string") return detail
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0]
    if (typeof first === "string") return first
    if (first && typeof first.msg === "string") {
      return first.msg.replace(/^Value error,\s*/i, "")
    }
  }
  if (detail && typeof detail === "object" && typeof detail.msg === "string") {
    return detail.msg.replace(/^Value error,\s*/i, "")
  }
  return anyErr?.message || fallback
}
