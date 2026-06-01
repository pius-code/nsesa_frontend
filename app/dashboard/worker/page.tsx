import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { TransactionForm } from "@/components/worker/transaction-form"

export default async function WorkerDashboard() {
  const session = await auth()
  if (!session) redirect("/login")

  return <TransactionForm workerName={session.user.worker_name} workerId={session.user.worker_id} />
}
