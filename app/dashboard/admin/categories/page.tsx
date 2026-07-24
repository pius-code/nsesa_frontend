"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { CheckCircle2, Loader2, Tags, Plus, Pencil, Check, X, Trash2 } from "lucide-react"
import api from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Category {
  id: string
  name: string
  description: string | null
  created_by: string
  created_at: string
  updated_at: string
}

function useCategories() {
  return useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/categories")
      return data
    },
    staleTime: 5 * 60 * 1000,
  })
}

export default function CategoriesPage() {
  const queryClient = useQueryClient()
  const { data: categories = [], isLoading, isError } = useCategories()
  const { data: session } = useSession()
  const role = session?.user?.worker_role
  const canEdit = role === "admin" || role === "super_admin"
  const canDelete = role === "super_admin"

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [success, setSuccess] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")

  const [deletingId, setDeletingId] = useState<string | null>(null)

  function startEdit(category: Category) {
    setEditingId(category.id)
    setEditName(category.name)
    setEditDescription(category.description ?? "")
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName("")
    setEditDescription("")
  }

  const addMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/api/v1/categories", {
        name: name.trim(),
        description: description.trim() || null,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      setSuccess(true)
      setName("")
      setDescription("")
      setShowForm(false)
      setTimeout(() => setSuccess(false), 4000)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/api/v1/categories/${id}`, {
        name: editName.trim(),
        description: editDescription.trim() || null,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      cancelEdit()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/api/v1/categories/${id}`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      setDeletingId(null)
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    addMutation.mutate()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Categories</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {categories.length} categor{categories.length !== 1 ? "ies" : "y"} across all shops
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} variant={showForm ? "outline" : "default"}>
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-700 text-sm font-medium">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Category added!
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-zinc-200 shadow-sm px-5 py-5 space-y-4"
        >
          <p className="text-sm font-semibold text-zinc-700">New Category</p>

          {addMutation.isError && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2.5 text-red-600 text-sm">
              Failed to add category. It may already exist.
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="category_name">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="category_name"
              placeholder="e.g. Beverages"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="category_description">Description</Label>
            <Input
              id="category_description"
              placeholder="Optional"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="submit" disabled={addMutation.isPending} className="flex-1">
              {addMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Add Category"
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
          Loading categories…
        </div>
      ) : isError ? (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-red-600 text-sm">
          Failed to load categories. Please refresh.
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white py-20 text-center">
          <Tags className="h-10 w-10 text-zinc-300 mb-3" />
          <p className="text-sm font-medium text-zinc-500">No categories yet</p>
          <p className="text-xs text-zinc-400 mt-1">Add your first category above</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {categories.map((category) => {
            const isEditing = editingId === category.id
            const isSaving = updateMutation.isPending && editingId === category.id
            const isDeleting = deleteMutation.isPending && deleteMutation.variables === category.id

            if (deletingId === category.id) {
              return (
                <div key={category.id} className="rounded-xl bg-red-50 border border-red-200 px-4 py-3.5">
                  <p className="text-sm text-red-700">
                    Delete <span className="font-semibold">{category.name}</span>? Products keep their existing tag, but it won&apos;t be selectable for new ones. {/* noqa */}
                  </p>
                  <div className="flex justify-end gap-2 mt-3">
                    <Button size="sm" variant="outline" onClick={() => setDeletingId(null)} disabled={isDeleting}>
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(category.id)} disabled={isDeleting}>
                      {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      Delete
                    </Button>
                  </div>
                </div>
              )
            }

            return (
              <div
                key={category.id}
                className="bg-white rounded-xl border border-zinc-200 px-4 py-3.5"
              >
                {isEditing ? (
                  <div className="flex flex-col gap-2.5">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Category name"
                      autoFocus
                    />
                    <Input
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Description (optional)"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelEdit}
                        disabled={isSaving}
                      >
                        <X className="h-3.5 w-3.5" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => updateMutation.mutate(category.id)}
                        disabled={isSaving || editName.trim() === ""}
                      >
                        {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-900 truncate">{category.name}</p>
                      {category.description && (
                        <p className="text-sm text-zinc-500 mt-0.5 truncate">{category.description}</p>
                      )}
                    </div>
                    {(canEdit || canDelete) && (
                      <div className="flex items-center gap-1 shrink-0">
                        {canEdit && (
                          <button
                            onClick={() => startEdit(category)}
                            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setDeletingId(category.id)}
                            disabled={isDeleting}
                            className="p-1.5 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
                          >
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </button>
                        )}
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
