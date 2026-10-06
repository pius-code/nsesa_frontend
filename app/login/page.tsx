"use client";

import { useState } from "react";
import { loginAction } from "@/app/actions/auth";
import { Store, Loader2, CheckCircle2, X, AlertCircle, Eye, EyeOff } from "lucide-react";
import api from "@/lib/axios";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotError, setForgotError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Safety timeout: if login hasn't responded in 45 seconds, show an error.
    // This prevents the UI from spinning indefinitely on Render cold starts.
    const timeout = setTimeout(() => {
      setLoading(false);
      setError("Sign in is taking longer than expected. The server may be waking up — please try again in a moment.");
    }, 45000);

    const formData = new FormData(e.currentTarget);
    const result = await loginAction(formData);

    clearTimeout(timeout);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  async function handleForgotSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!forgotEmail.trim()) return;

    setForgotLoading(true);
    setForgotError("");

    try {
      const { data } = await api.post("/api/v1/auth/forgot-password", {
        email: forgotEmail.trim(),
      });
      setForgotSent(true);
      setForgotMessage(data?.message || "The administrators have been notified.");
    } catch (err: any) {
      setForgotError(err?.response?.data?.detail || "Failed to submit request. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-zinc-50 px-4">
      {/* Soft ambient brand glow */}
      <div className="pointer-events-none absolute -top-40 -left-32 h-96 w-96 rounded-full bg-green-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-green-100/60 blur-3xl" />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-green-700 to-green-950 shadow-lg shadow-green-900/20">
            <Store className="h-6 w-6 text-white" />
          </div>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-zinc-900">
            FJ Pay
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">Point of sale, made simple</p>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl shadow-zinc-900/5 border border-zinc-200/80 px-8 py-10">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-zinc-700"
              >
                Email address
              </label>
              <input
                id="email"
                name="worker_email"
                type="email"
                autoComplete="email"
                required
                className="block w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-600/10"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-zinc-700"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(true);
                    setForgotSent(false);
                    setForgotError("");
                    setForgotEmail("");
                  }}
                  className="text-xs font-semibold text-green-700 hover:text-green-800 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="worker_password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  className="block w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 pr-10 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-600/10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer p-1 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full rounded-xl bg-gradient-to-br from-green-700 to-green-900 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-green-900/20 transition hover:shadow-lg hover:shadow-green-900/25 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-400">
          Every shop&apos;s data stays its own — sign in with your shop credentials.
        </p>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-zinc-200 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 p-1 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>

            {forgotSent ? (
              <div className="text-center py-4 space-y-4">
                <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto border border-green-200">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900">Request Sent</h3>
                  <p className="text-sm text-zinc-600 mt-2 leading-relaxed">
                    {forgotMessage}
                  </p>
                  <p className="text-xs text-zinc-400 mt-2">
                    Your administrators have been notified via their dashboard and can reset your password.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-full rounded-xl bg-zinc-900 text-white font-medium text-sm py-2.5 hover:bg-zinc-800 transition"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-zinc-900">Forgot Password</h3>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                    Enter your work email address. We&apos;ll notify your store administrators so they can reset it for you.
                  </p>
                </div>

                {forgotError && (
                  <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{forgotError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="forgot-email" className="block text-xs font-semibold text-zinc-700">
                    Work Email Address
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="worker@shop.com"
                    className="block w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-600/10"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 rounded-xl border border-zinc-200 text-zinc-700 text-sm font-medium py-2.5 hover:bg-zinc-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading || !forgotEmail.trim()}
                    className="flex-1 rounded-xl bg-gradient-to-br from-green-700 to-green-900 text-white text-sm font-semibold py-2.5 shadow-md shadow-green-900/20 hover:shadow-lg disabled:opacity-60 transition flex items-center justify-center gap-2"
                  >
                    {forgotLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Sending…
                      </>
                    ) : (
                      "Notify Admins"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
