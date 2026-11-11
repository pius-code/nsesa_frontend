"use client"

import { useEffect, useState } from "react"
import { Wrench, RefreshCw, ShieldCheck } from "lucide-react"
import axios from "axios"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"

export default function MaintenancePage() {
  const [checking, setChecking] = useState(false)
  const [message, setMessage] = useState(
    "Sorry, we are currently under maintenance mode. Our engineering team is performing scheduled updates. We will be back shortly."
  )
  const [autoCheckSeconds, setAutoCheckSeconds] = useState(10)

  const checkStatus = async () => {
    setChecking(true)
    try {
      const res = await axios.get(`${API_BASE_URL}/api/v1/system/maintenance`)
      if (res.data) {
        if (!res.data.is_maintenance) {
          window.location.href = "/"
          return
        }
        if (res.data.message) {
          setMessage(res.data.message)
        }
      }
    } catch {
      // Offline or still booting
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setAutoCheckSeconds((prev) => {
        if (prev <= 1) {
          checkStatus()
          return 10
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 selection:bg-amber-500/20 selection:text-amber-300">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-orange-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg w-full bg-zinc-900/90 border border-zinc-800 rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-xl text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold tracking-wide uppercase mb-6">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
          </span>
          System Maintenance
        </div>

        <div className="w-20 h-20 rounded-2xl bg-gradient-to-b from-amber-500/20 to-amber-500/5 border border-amber-500/30 flex items-center justify-center mb-6 shadow-inner text-amber-400">
          <Wrench className="w-10 h-10 animate-bounce duration-1000" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-3">
          Sorry, We Are Under Maintenance
        </h1>

        <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-md mb-8">
          {message}
        </p>

        <div className="w-full bg-zinc-800/80 rounded-xl p-3 border border-zinc-700/50 flex items-center justify-between text-xs text-zinc-400 mb-6">
          <span className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Auto-checking system status:
          </span>
          <span className="font-mono text-zinc-200 font-semibold">{autoCheckSeconds}s</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            type="button"
            onClick={checkStatus}
            disabled={checking}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-semibold text-sm transition-all shadow-lg shadow-amber-500/20 disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} />
            {checking ? "Checking..." : "Check Status Now"}
          </button>
        </div>

        <p className="text-xs text-zinc-600 mt-8">
          Are you a Super Admin? You can log in with your administrative account to access the control panel.
        </p>
      </div>
    </div>
  )
}
