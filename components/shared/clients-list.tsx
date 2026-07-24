"use client"

import { useEffect, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { CheckCircle2, Loader2, Users, Plus, Pencil, Check, X, Trash2, Search } from "lucide-react"
import api from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Client {
  id: string
  client_name: string
  client_phone: string | null
  client_email: string | null
  notes: string | null
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(handle)
  }, [value, delayMs])
  return debounced
}

function useClients(query: string) {
  const debouncedQuery = useDebouncedValue(query.trim(), 300)
  return useQuery<Client[]>({
    queryKey: ["clients", debouncedQuery],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/clients", { params: { q: debouncedQuery || undefined, limit: 100 } })
      return data
    },
    staleTime: 60 * 1000,
  })
}

export function ClientsList() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const canManage = session?.user?.worker_role === "admin" || session?.user?.worker_role === "super_admin"

  const [search, setSearch] = useState("")
  const { data: clients = [], isLoading, isError } = useClients(search)

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [success, setSuccess] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [editEmail, setEditEmail] = useState("")

  const [deletingId, setDeletingId] = useState<string | null>(null)

  function startEdit(client: Client) {
    setEditingId(client.id)
    setEditName(client.client_name)
    setEditPhone(client.client_phone ?? "")
    setEditEmail(client.client_email ?? "")
  }

  function cancelEdit() {
    setEditingId(null)
  }

  const addMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/api/v1/clients", {
        client_name: name.trim(),
        client_phone: phone.trim() || null,
        client_email: email.trim() || null,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] })
      setSuccess(true)
      setName("")
      setPhone("")
      setEmail("")
      setShowForm(false)
      setTimeout(() => setSuccess(false), 4000)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/api/v1/clients/${id}`, {
        client_name: editName.trim(),
        client_phone: editPhone.trim() || null,
        client_email: editEmail.trim() || null,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] })
      cancelEdit()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/api/v1/clients/${id}`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] })
      setDeletingId(null)
    },
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Clients</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {clients.length} client{clients.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} variant={showForm ? "outline" : "default"}>
          <Plus className="h-4 w-4" />
          Add Client
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
        <Input
          placeholder="Search by name or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-700 text-sm font-medium">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Client added!
        </div>
      )}

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            addMutation.mutate()
          }}
          className="bg-white rounded-xl border border-zinc-200 shadow-sm px-5 py-5 space-y-4"
        >
          <p className="text-sm font-semibold text-zinc-700">New Client</p>

          {addMutation.isError && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2.5 text-red-600 text-sm">
              Failed to add client. Phone number may already be registered.
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="client_name">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input id="client_name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="client_phone">Phone</Label>
              <Input id="client_phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="client_email">Email</Label>
              <Input id="client_email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="submit" disabled={addMutation.isPending || name.trim() === ""} className="flex-1">
              {addMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Add Client"
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-zinc-400 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading clients…
        </div>
      ) : isError ? (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-red-600 text-sm">
          Failed to load clients. Please refresh.
        </div>
      ) : clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white py-20 text-center">
          <Users className="h-10 w-10 text-zinc-300 mb-3" />
          <p className="text-sm font-medium text-zinc-500">No clients yet</p>
          <p className="text-xs text-zinc-400 mt-1">Add your first client above</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {clients.map((client) => {
            const isEditing = editingId === client.id
            const isSaving = updateMutation.isPending && editingId === client.id
            const isDeleting = deleteMutation.isPending && deleteMutation.variables === client.id

            if (deletingId === client.id) {
              return (
                <div key={client.id} className="rounded-xl bg-red-50 border border-red-200 px-4 py-3.5">
                  <p className="text-sm text-red-700">
                    Delete <span className="font-semibold">{client.client_name}</span>? This can&apos;t be undone.
                  </p>
                  <div className="flex justify-end gap-2 mt-3">
                    <Button size="sm" variant="outline" onClick={() => setDeletingId(null)} disabled={isDeleting}>
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(client.id)} disabled={isDeleting}>
                      {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      Delete
                    </Button>
                  </div>
                </div>
              )
            }

            return (
              <div key={client.id} className="bg-white rounded-xl border border-zinc-200 px-4 py-3.5">
                {isEditing ? (
                  <div className="flex flex-col gap-2.5">
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" autoFocus />
                    <div className="grid grid-cols-2 gap-2.5">
                      <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Phone" />
                      <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Email" />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="outline" onClick={cancelEdit} disabled={isSaving}>
                        <X className="h-3.5 w-3.5" />
                        Cancel
                      </Button>
                      <Button size="sm" onClick={() => updateMutation.mutate(client.id)} disabled={isSaving || editName.trim() === ""}>
                        {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-900 truncate">{client.client_name}</p>
                      <p className="text-sm text-zinc-500 mt-0.5 truncate">
                        {[client.client_phone, client.client_email].filter(Boolean).join(" · ") || "No contact info"}
                      </p>
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => startEdit(client)}
                          className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeletingId(client.id)}
                          disabled={isDeleting}
                          className="p-1.5 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
                        >
                          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
