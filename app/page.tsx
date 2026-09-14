import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function Home() {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  const isAdminRole = ["admin", "super_admin", "owner", "manager"].includes(
    session.user.worker_role || ""
  )

  if (isAdminRole) {
    redirect("/dashboard/admin")
  } else {
    redirect("/dashboard/worker")
  }
}
