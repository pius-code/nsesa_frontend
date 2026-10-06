"use server"

import { signIn } from "@/auth"
import { AuthError } from "next-auth"

export async function loginAction(formData: FormData) {
  const worker_email = formData.get("worker_email") as string
  const worker_password = formData.get("worker_password") as string

  try {
    await signIn("credentials", {
      worker_email,
      worker_password,
      redirectTo: "/",
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password. Please try again." }
    }
    // Re-throw redirect error so Next.js performs navigation to "/"
    throw error
  }
}
