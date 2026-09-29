"use client"

import { SessionProvider } from "next-auth/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import { Toaster } from "sonner"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            retry: (failureCount, error) => {
              const status = (error as { response?: { status?: number } })?.response?.status
              if (status === 401) return false
              return failureCount < 1
            },
          },
        },
      })
  )

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </QueryClientProvider>
    </SessionProvider>
  )
}
