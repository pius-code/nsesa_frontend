"use server"

import { signIn, auth } from "@/auth"
import { AuthError } from "next-auth"
import { redirect } from "next/navigation"

export async function loginAction(formData: FormData) {
  try {
    await signIn("credentials", {
      worker_email: formData.get("worker_email") as string,
      worker_password: formData.get("worker_password") as string,
      redirect: false,
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password. Please try again." }
    }
    throw error
  }

  const session = await auth()
  if (session?.user?.worker_role === "admin") {
    redirect("/dashboard/admin")
  } else {
    redirect("/dashboard/worker")
  }
}
