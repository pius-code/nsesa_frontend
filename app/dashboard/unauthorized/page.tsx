"use client"

import { signOut, useSession } from "next-auth/react"
import { ShieldAlert, LogOut, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function UnauthorizedPage() {
  const { data: session } = useSession()

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl bg-white border border-zinc-200 p-8 text-center shadow-xs">
        <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-100">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold text-zinc-900">Access Restricted</h1>
        <p className="text-sm text-zinc-500 mt-2">
          Hello {session?.user?.name || "there"}, your account does not currently have permissions to view this section.
        </p>
        <p className="text-xs text-zinc-400 mt-1">
          Please ask your store administrator to grant you the required permissions.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mt-6 justify-center">
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Check Again
          </Button>
          <Button
            variant="default"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="gap-2 bg-zinc-900 hover:bg-zinc-800"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </div>
    </div>
  )
}
