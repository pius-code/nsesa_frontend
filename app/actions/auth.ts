"use server"

import { signIn, auth } from "@/auth"
import { AuthError } from "next-auth"
import { redirect } from "next/navigation"

export async function loginAction(formData: FormData) {
  const worker_email = formData.get("worker_email") as string
  const worker_password = formData.get("worker_password") as string

  // Single login call — NextAuth's authorize handles the backend check internally.
  // We removed the duplicate "precheck" fetch that was calling bcrypt twice on Render,
  // which was the main cause of 5+ minute sign-in wait times.
  try {
    await signIn("credentials", {
      worker_email,
      worker_password,
      redirect: false,
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password. Please try again." }
    }
    throw error
  }

  const session = await auth()

  if (!session) {
    return { error: "Login failed. Please try again." }
  }

  const isAdminRole = ["admin", "super_admin", "owner", "manager"].includes(
    session?.user?.worker_role || ""
  )

  if (isAdminRole) {
    redirect("/dashboard/admin")
  } else {
    redirect("/dashboard/worker")
  }
}
