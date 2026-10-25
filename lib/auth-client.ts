import { signOut } from "next-auth/react";

export async function safeSignOut(redirectUrl = "/login") {
  try {
    await signOut({ redirect: false });
  } catch (err) {
    console.error("Sign out error:", err);
  } finally {
    // Force a clean hard navigation so all client cache and cookies are purged
    window.location.href = redirectUrl;
  }
}
