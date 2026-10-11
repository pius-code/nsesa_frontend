import axios from "axios";
import { getSession, signOut } from "next-auth/react";

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

// Flag to prevent multiple simultaneous sign-out triggers from burst 401s
let isSigningOut = false;

// Auto sign-out on 401 Unauthorized (e.g. expired JWT) when on protected pages
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const is401 = error.response?.status === 401;
    const isClientSide = typeof window !== "undefined";

    if (is401 && isClientSide) {
      const isLoginPage = window.location.pathname.startsWith("/login");
      if (!isLoginPage && !isSigningOut) {
        isSigningOut = true;
        signOut({ callbackUrl: "/login?expired=true" });
      }
    }
    return Promise.reject(error);
  }
);

export default api;
