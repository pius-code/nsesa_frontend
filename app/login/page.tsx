"use client"

import { useState } from "react"
import { loginAction } from "@/app/actions/auth"

export default function LoginPage() {
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const result = await loginAction(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
    // On success, loginAction calls redirect() server-side — no client handling needed
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Nsesa</h1>
          <p className="mt-2 text-sm text-zinc-500">Sign in to your account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 px-8 py-10">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
                Email address
              </label>
              <input
                id="email"
                name="worker_email"
                type="email"
                autoComplete="email"
                required
                className="block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-600/10"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
                Password
              </label>
              <input
                id="password"
                name="worker_password"
                type="password"
                autoComplete="current-password"
                required
                className="block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-600/10"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
