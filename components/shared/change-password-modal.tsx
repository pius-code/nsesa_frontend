"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { Lock, Loader2, X, Eye, EyeOff, Check, XCircle } from "lucide-react"
import api from "@/lib/axios"
import { getErrorMessage } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { validatePassword } from "@/lib/password"
import { cn } from "@/lib/utils"

interface ChangePasswordModalProps {
  open: boolean
  onClose: () => void
}

export function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [error, setError] = useState("")

  const validation = validatePassword(newPassword)
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword

  const mutation = useMutation({
    mutationFn: async () => {
      setError("")
      if (!validation.isValid) {
        throw new Error(
          "New password must be at least 8 characters, alphanumeric, and contain a symbol (e.g. !@#$%^&*)."
        )
      }
      if (newPassword !== confirmPassword) {
        throw new Error("New passwords do not match")
      }

      const { data } = await api.post("/api/v1/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      })
      return data
    },
    onSuccess: () => {
      toast.success("Password changed successfully!", {
        description: "You can use your new password on your next login.",
      })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      onClose()
    },
    onError: (err: any) => {
      const msg = getErrorMessage(err, "Failed to change password")
      setError(msg)
    },
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-zinc-200 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 p-1 rounded-lg cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-green-50 text-green-700 flex items-center justify-center border border-green-200 shadow-2xs">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900">Change Password</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Update your login password securely</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
            <XCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            mutation.mutate()
          }}
          className="space-y-4"
        >
          {/* Current Password */}
          <div className="space-y-1.5">
            <Label htmlFor="current-pw" className="text-xs font-semibold text-zinc-700">
              Current Password
            </Label>
            <div className="relative">
              <Input
                id="current-pw"
                type={showCurrent ? "text" : "password"}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <Label htmlFor="new-pw" className="text-xs font-semibold text-zinc-700">
              New Password
            </Label>
            <div className="relative">
              <Input
                id="new-pw"
                type={showNew ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter strong new password"
                className="pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Live Password Strength Requirements */}
            {newPassword.length > 0 && (
              <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-2.5 mt-2 space-y-1">
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                  Password Policy Requirements:
                </p>
                <div className="grid grid-cols-1 gap-1 text-xs">
                  <div
                    className={cn(
                      "flex items-center gap-1.5 text-[11px]",
                      validation.checks.minLength ? "text-emerald-700 font-medium" : "text-zinc-400"
                    )}
                  >
                    <Check className={cn("h-3 w-3", validation.checks.minLength ? "opacity-100" : "opacity-30")} />
                    <span>At least 8 characters</span>
                  </div>

                  <div
                    className={cn(
                      "flex items-center gap-1.5 text-[11px]",
                      validation.checks.hasLetter && validation.checks.hasNumber
                        ? "text-emerald-700 font-medium"
                        : "text-zinc-400"
                    )}
                  >
                    <Check
                      className={cn(
                        "h-3 w-3",
                        validation.checks.hasLetter && validation.checks.hasNumber ? "opacity-100" : "opacity-30"
                      )}
                    />
                    <span>Alphanumeric (letters and numbers)</span>
                  </div>

                  <div
                    className={cn(
                      "flex items-center gap-1.5 text-[11px]",
                      validation.checks.hasSymbol ? "text-emerald-700 font-medium" : "text-zinc-400"
                    )}
                  >
                    <Check className={cn("h-3 w-3", validation.checks.hasSymbol ? "opacity-100" : "opacity-30")} />
                    <span>Contains a symbol (e.g. !@#$%^&*)</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="confirm-pw" className="text-xs font-semibold text-zinc-700">
                Confirm New Password
              </Label>
              {confirmPassword.length > 0 && (
                <span
                  className={cn(
                    "text-[10px] font-medium",
                    passwordsMatch ? "text-emerald-600" : "text-red-500"
                  )}
                >
                  {passwordsMatch ? "Passwords match" : "Does not match"}
                </span>
              )}
            </div>
            <Input
              id="confirm-pw"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="font-mono"
            />
          </div>

          <div className="flex gap-2.5 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 cursor-pointer">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                mutation.isPending ||
                !currentPassword ||
                !validation.isValid ||
                !passwordsMatch
              }
              className="flex-1 bg-green-700 hover:bg-green-800 text-white cursor-pointer"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Saving...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
