"use server"

import { signIn, auth } from "@/auth"
import { AuthError } from "next-auth"
import { redirect } from "next/navigation"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"

export async function loginAction(formData: FormData) {
  const worker_email = formData.get("worker_email") as string
  const worker_password = formData.get("worker_password") as string

  // NextAuth's credentials flow deliberately hides the real reason behind a
  // generic "invalid credentials" error for security. That's fine for wrong
  // passwords, but it also hides messages we DO want shown verbatim — e.g.
  // "Your shop has been suspended." — so we pre-check directly against the
  // backend first and surface its exact detail before ever calling signIn(). // noqa
  const precheck = await fetch(`${API_URL}/api/v1/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ worker_email, worker_password }),
  })

  if (!precheck.ok) {
    const data = await precheck.json().catch(() => null)
    return { error: data?.detail || "Invalid email or password. Please try again." } // noqa
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
  if (session?.user?.worker_role === "admin" || session?.user?.worker_role === "super_admin") { // noqa
    redirect("/dashboard/admin")
  } else {
    redirect("/dashboard/worker")
  }
}
