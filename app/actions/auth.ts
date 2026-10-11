"use server"

import { signIn } from "@/auth"

export async function loginAction(formData: FormData) {
  const worker_email = formData.get("worker_email") as string
  const worker_password = formData.get("worker_password") as string

  try {
    await signIn("credentials", {
      worker_email,
      worker_password,
      redirectTo: "/",
    })
  } catch (error: any) {
    // In Next.js, navigation/redirect works by throwing NEXT_REDIRECT.
    // We MUST re-throw it so Next.js can navigate to the destination!
    const isRedirect =
      error?.message?.includes("NEXT_REDIRECT") ||
      error?.digest?.includes("NEXT_REDIRECT") ||
      (typeof error?.digest === "string" && error.digest.startsWith("NEXT_REDIRECT"))

    if (isRedirect) {
      throw error
    }

    // Any other error during credentials sign-in is an authentication failure
    return { error: "Invalid email or password. Please try again." }
  }
}
