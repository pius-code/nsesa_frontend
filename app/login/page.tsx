"use client";

import { useState } from "react";
import { loginAction } from "@/app/actions/auth";
import { Store } from "lucide-react";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await loginAction(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
    // On success, loginAction calls redirect() server-side — no client handling needed
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-zinc-50 px-4"> {/* noqa */}
      {/* Soft ambient brand glow — subtle, not a hard shape */}
      <div className="pointer-events-none absolute -top-40 -left-32 h-96 w-96 rounded-full bg-green-200/40 blur-3xl" /> {/* noqa */}
      <div className="pointer-events-none absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-green-100/60 blur-3xl" /> {/* noqa */}

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-green-700 to-green-950 shadow-lg shadow-green-900/20"> {/* noqa */}
            <Store className="h-6 w-6 text-white" />
          </div>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-zinc-900"> {/* noqa */}
            FJ Pay
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">Point of sale, made simple</p> {/* noqa */}
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl shadow-zinc-900/5 border border-zinc-200/80 px-8 py-10"> {/* noqa */}
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
                className="block w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-600/10" // noqa
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-zinc-700"
              >
                Password
              </label>
              <input
                id="password"
                name="worker_password"
                type="password"
                autoComplete="current-password"
                required
                className="block w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-600/10" // noqa
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5"> {/* noqa */}
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full rounded-xl bg-gradient-to-br from-green-700 to-green-900 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-green-900/20 transition hover:shadow-lg hover:shadow-green-900/25 disabled:opacity-60 disabled:cursor-not-allowed" // noqa
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-400">
          Every shop&apos;s data stays its own — sign in with your shop credentials. {/* noqa */}
        </p>
      </div>
    </div>
  );
}
