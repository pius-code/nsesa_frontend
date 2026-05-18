import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function Home() {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  if (session.user.worker_role === "admin") {
    redirect("/dashboard/admin")
  } else {
    redirect("/dashboard/worker")
  }
}
