"use server"

import { signIn, auth } from "@/auth"
import { AuthError } from "next-auth"
import { redirect } from "next/navigation"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"

export async function loginAction(formData: FormData) {
  const worker_email = formData.get("worker_email") as string
  const worker_password = formData.get("worker_password") as string

  // Precheck directly against the backend
  const precheck = await fetch(`${API_URL}/api/v1/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ worker_email, worker_password }),
  })

  if (!precheck.ok) {
    const data = await precheck.json().catch(() => null)
    return { error: data?.detail || "Invalid email or password. Please try again." }
  }

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
  const isAdminRole = ["admin", "super_admin", "owner", "manager"].includes(
    session?.user?.worker_role || ""
  )

  if (isAdminRole) {
    redirect("/dashboard/admin")
  } else {
    redirect("/dashboard/worker")
  }
}
