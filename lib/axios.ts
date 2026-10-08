import axios from "axios";
import { getSession } from "next-auth/react";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080",
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

// Shared session request to avoid hammering NextAuth endpoints with duplicate calls
let pendingSessionPromise: Promise<any> | null = null;

async function getCachedSession() {
  if (typeof window === "undefined") {
    return null;
  }
  if (!pendingSessionPromise) {
    pendingSessionPromise = getSession().finally(() => {
      // Cache briefly so burst requests share the same session
      setTimeout(() => {
        pendingSessionPromise = null;
      }, 1500);
    });
  }
  return pendingSessionPromise;
}

api.interceptors.request.use(async (config) => {
  try {
    const session = await getCachedSession();
    if (session?.accessToken) {
      config.headers.Authorization = `Bearer ${session.accessToken}`;
    }
  } catch (err) {
    console.error("Failed to attach auth token to request:", err);
  }
  return config;
});

// Simply pass through errors — Next.js middleware handles route protection.
// We avoid auto-signing out on single 401s to prevent cascading session wipes.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
