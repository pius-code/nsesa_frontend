"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { CheckCircle2, Loader2, UserPlus, Users } from "lucide-react"
import api from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Worker {
  id: string
  worker_name: string
  worker_shop_name: string
  worker_branch_name: string
  worker_role: string
  worker_email: string
  is_active: boolean
  created_at: string
}

function useWorkers() {
  return useQuery<Worker[]>({
    queryKey: ["workers"],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/shop_workers")
      return data
    },
    staleTime: 2 * 60 * 1000,
  })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export default function WorkersPage() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const shopName = session?.user?.worker_shop_name ?? ""

  const { data: workers = [], isLoading, isError } = useWorkers()

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState("")
  const [role, setRole] = useState("worker")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [success, setSuccess] = useState(false)

  const mutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/api/v1/create_worker", {
        worker_name: name.trim(),
        worker_role: role,
        worker_email: email.trim(),
        worker_password: password,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workers"] })
      setSuccess(true)
      setName("")
      setRole("worker")
      setEmail("")
      setPassword("")
      setShowForm(false)
      setTimeout(() => setSuccess(false), 4000)
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    mutation.mutate()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Workers</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {!isLoading && `${workers.length} team member${workers.length !== 1 ? "s" : ""} in ${shopName}`}
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} variant={showForm ? "outline" : "default"}>
          <UserPlus className="h-4 w-4" />
          Add Worker
        </Button>
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-700 text-sm font-medium">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Worker account created successfully!
        </div>
      )}

      {/* Add worker form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-zinc-200 shadow-sm divide-y divide-zinc-100"
        >
          <div className="px-5 py-5 space-y-4">
            <p className="text-sm font-semibold text-zinc-700">New Worker</p>

            {mutation.isError && (
              <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2.5 text-red-600 text-sm">
                Failed to create worker. The email may already be in use.
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="worker_name">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="worker_name"
                placeholder="e.g. Kwame Mensah"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="worker_role">Role <span className="text-red-500">*</span></Label>
              <select
                id="worker_role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-600/10"
              >
                <option value="worker">Worker</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="worker_email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="worker_email"
                type="email"
                placeholder="worker@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="worker_password">
                Password <span className="text-red-500">*</span>
              </Label>
              <Input
                id="worker_password"
                type="password"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
          </div>

          <div className="px-5 py-4 flex gap-3">
            <Button type="submit" disabled={mutation.isPending} className="flex-1">
              {mutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Creating…</>
              ) : (
                <><UserPlus className="h-4 w-4" />Create Worker</>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Workers list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-zinc-400 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading workers…
        </div>
      ) : isError ? (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-red-600 text-sm">
          Failed to load workers. Please refresh.
        </div>
      ) : workers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white py-20 text-center">
          <Users className="h-10 w-10 text-zinc-300 mb-3" />
          <p className="text-sm font-medium text-zinc-500">No workers yet</p>
          <p className="text-xs text-zinc-400 mt-1">Add your first team member above</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-zinc-200 bg-zinc-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Branch</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Joined</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {workers.map((w) => (
                  <tr key={w.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900">{w.worker_name}</td>
                    <td className="px-4 py-3 text-sm text-zinc-600">{w.worker_email}</td>
                    <td className="px-4 py-3">
                      <Badge variant={w.worker_role === "admin" ? "default" : "secondary"} className="capitalize">
                        {w.worker_role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500">{w.worker_branch_name}</td>
                    <td className="px-4 py-3 text-sm text-zinc-500 whitespace-nowrap">{formatDate(w.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        w.is_active ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-500"
                      )}>
                        {w.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="flex md:hidden flex-col gap-3">
            {workers.map((w) => (
              <div key={w.id} className="bg-white rounded-xl border border-zinc-200 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-zinc-900 truncate">{w.worker_name}</p>
                    <p className="text-xs text-zinc-500 mt-0.5 truncate">{w.worker_email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <Badge variant={w.worker_role === "admin" ? "default" : "secondary"} className="capitalize">
                      {w.worker_role}
                    </Badge>
                    <span className={cn(
                      "text-xs font-semibold",
                      w.is_active ? "text-green-600" : "text-zinc-400"
                    )}>
                      {w.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-zinc-400">
                  <span>{w.worker_branch_name}</span>
                  <span>·</span>
                  <span>Joined {formatDate(w.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
