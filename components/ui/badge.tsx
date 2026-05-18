import * as React from "react"
import { cn } from "@/lib/utils"

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "destructive"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        variant === "default" && "bg-green-100 text-green-700",
        variant === "secondary" && "bg-zinc-100 text-zinc-600",
        variant === "destructive" && "bg-red-100 text-red-600",
        className
      )}
      {...props}
    />
  )
}

export { Badge }
