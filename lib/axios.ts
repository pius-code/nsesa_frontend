import axios from "axios";
import { getSession, signOut } from "next-auth/react";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080",
  headers: { "Content-Type": "application/json" },
  // Set a 30 second timeout so requests don't spin forever on Render cold starts
  timeout: 30000,
});

api.interceptors.request.use(async (config) => {
  const session = await getSession();
  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }
  return config;
});

let isSigningOut = false;

// Track when the app loaded so we don't sign out on the first-burst 401s
// that happen right after login redirect before the session cookie has hydrated.
const APP_START_TIME = Date.now();
const GRACE_PERIOD_MS = 5000; // 5 second grace window after page load

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const is401 = error.response?.status === 401;
    const isClientSide = typeof window !== "undefined";
    const pastGracePeriod = Date.now() - APP_START_TIME > GRACE_PERIOD_MS;

    // Only sign out if:
    // 1. It's a 401
    // 2. We're on the client
    // 3. We're past the 5s grace period (session has had time to hydrate)
    // 4. We're not already signing out
    if (is401 && isClientSide && pastGracePeriod && !isSigningOut) {
      isSigningOut = true;
      signOut({ callbackUrl: "/login" });
    }
    return Promise.reject(error);
  },
);

export default api;
