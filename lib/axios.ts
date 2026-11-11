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

// Auto-handle 503 Maintenance and 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isClientSide = typeof window !== "undefined";
    const status = error.response?.status;

    // 1. Maintenance Mode detection (HTTP 503) -> redirect to /maintenance
    const is503Maintenance =
      status === 503 &&
      (error.response?.data?.maintenance_mode === true ||
        (typeof error.response?.data?.detail === "string" &&
          error.response?.data?.detail.toLowerCase().includes("maintenance")));

    if (is503Maintenance && isClientSide) {
      const isMaintenancePage = window.location.pathname.startsWith("/maintenance");
      if (!isMaintenancePage) {
        window.location.href = "/maintenance";
      }
      return Promise.reject(error);
    }

    // 2. Auto sign-out on 401 Unauthorized (e.g. expired JWT) when on protected pages
    if (status === 401 && isClientSide) {
      const isLoginPage = window.location.pathname.startsWith("/login");
      if (!isLoginPage && !isSigningOut) {
        isSigningOut = true;
        signOut({ redirect: false }).finally(() => {
          window.location.href = "/login?expired=true";
        });
      }
    }
    return Promise.reject(error);
  }
);

export default api;
