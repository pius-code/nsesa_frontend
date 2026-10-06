import axios from "axios";
import { getSession, signOut } from "next-auth/react";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080",
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

// How long to wait for the session before giving up (ms)
const SESSION_WAIT_TIMEOUT = 8000;

/**
 * Wait for the NextAuth session to become available.
 * In production after a redirect, getSession() can return null
 * for a brief moment while the cookie hydrates on the client.
 * We poll for up to SESSION_WAIT_TIMEOUT before giving up.
 */
async function waitForSession(maxWaitMs = SESSION_WAIT_TIMEOUT) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const session = await getSession();
    if (session?.accessToken) return session;
    // Wait 300ms before retrying
    await new Promise((r) => setTimeout(r, 300));
  }
  return null;
}

api.interceptors.request.use(async (config) => {
  const session = await waitForSession();
  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }
  return config;
});

let isSigningOut = false;
const APP_START_TIME = Date.now();
const GRACE_PERIOD_MS = 8000;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const is401 = error.response?.status === 401;
    const isClientSide = typeof window !== "undefined";
    const pastGracePeriod = Date.now() - APP_START_TIME > GRACE_PERIOD_MS;

    if (is401 && isClientSide && pastGracePeriod && !isSigningOut) {
      isSigningOut = true;
      signOut({ callbackUrl: "/login" });
    }
    return Promise.reject(error);
  },
);

export default api;
