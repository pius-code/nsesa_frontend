import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { TransactionsList } from "@/components/shared/transactions-list"
import { ShieldAlert } from "lucide-react"

export default async function WorkerTransactionsPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const perms = (session.user.permissions || {}) as unknown as Record<string, boolean>
  const isAdmin = ["admin", "super_admin", "owner", "manager"].includes(session.user.worker_role || "")

  if (!isAdmin && !perms.view_own_transactions && !perms.view_all_transactions) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white py-16 text-center">
        <ShieldAlert className="h-10 w-10 text-amber-500 mb-3" />
        <p className="text-base font-semibold text-zinc-800">Access Restricted</p>
        <p className="text-xs text-zinc-500 mt-1 max-w-sm">
          You don&apos;t have permission to view transactions. Please contact your store administrator.
        </p>
      </div>
    )
  }

  return <TransactionsList />
}
