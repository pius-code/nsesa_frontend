"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession, signOut } from "next-auth/react"
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  FileText,
  Save,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  Sparkles,
} from "lucide-react"
import api from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ImageUpload } from "@/components/ui/image-upload"
import { cn } from "@/lib/utils"

interface ShopProfile {
  name: string
  logo_url: string | null
  location: string | null
  phone: string | null
  email: string | null
  description: string | null
  currency: string
  status: string
  created_at: string
}

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()

  const { data: profile, isLoading, isError } = useQuery<ShopProfile>({
    queryKey: ["shop_profile"],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/shop/profile")
      return data
    },
    staleTime: 5 * 60 * 1000,
  })

  const [name, setName] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [location, setLocation] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [description, setDescription] = useState("")
  const [currency, setCurrency] = useState("GH₵")

  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [reloginRequired, setReloginRequired] = useState(false)
  const [reloginCountdown, setReloginCountdown] = useState(4)

  useEffect(() => {
    if (profile) {
      setName(profile.name || "")
      setLogoUrl(profile.logo_url || "")
      setLocation(profile.location || "")
      setPhone(profile.phone || "")
      setEmail(profile.email || "")
      setDescription(profile.description || "")
      setCurrency(profile.currency || "GH₵")
    }
  }, [profile])

  // Countdown timer for automatic logout if business name was changed
  useEffect(() => {
    if (!reloginRequired) return
    if (reloginCountdown <= 0) {
      signOut({ callbackUrl: "/login" })
      return
    }
    const timer = setTimeout(() => {
      setReloginCountdown((c) => c - 1)
    }, 1000)
    return () => clearTimeout(timer)
  }, [reloginRequired, reloginCountdown])

  const mutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.patch("/api/v1/shop/profile", {
        name: name.trim() || undefined,
        logo_url: logoUrl || null,
        location: location.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        description: description.trim() || null,
        currency: currency.trim() || "GH₵",
      })
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["shop_profile"] })
      if (data.requires_relogin) {
        setReloginRequired(true)
      } else {
        setNotification({ type: "success", message: data.message || "Profile updated successfully!" })
        setTimeout(() => setNotification(null), 4000)
      }
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail ?? "Failed to update company profile."
      setNotification({ type: "error", message: msg })
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    mutation.mutate()
  }

  const isNameChanged = profile && name.trim() !== profile.name

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Company Settings & Profile</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Manage your store branding, official contact information, and business identity.
        </p>
      </div>

      {notification && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium border transition-all animate-in fade-in",
            notification.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          )}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-24 gap-2 text-zinc-400 text-sm">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading company profile...
        </div>
      ) : isError ? (
        <div className="rounded-xl bg-red-50 border border-red-100 p-6 text-red-600 text-sm">
          Failed to load profile details. Please try refreshing.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Brand Identity Card */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs p-6 space-y-6">
            <div>
              <h2 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-green-600" />
                Store Branding & Identity
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Your store logo and business name appear on customer receipts, invoices, and worker dashboards.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              {/* Logo */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-zinc-700">Company Logo</Label>
                <ImageUpload value={logoUrl} onChange={(url) => setLogoUrl(url)} />
              </div>

              {/* Name & Currency */}
              <div className="md:col-span-2 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="company_name" className="text-xs font-semibold text-zinc-700">
                    Business / Store Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="company_name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Nsesa Fashion & Tech"
                    required
                  />
                  {isNameChanged && (
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200/70 text-xs text-amber-800 flex items-start gap-2 mt-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Note:</strong> Renaming your store will update all past transactions, stock records, and worker accounts, and will require you to log in again.
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="currency" className="text-xs font-semibold text-zinc-700">
                    Default Currency Symbol
                  </Label>
                  <Input
                    id="currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    placeholder="GH₵"
                    className="max-w-[120px]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contact & Location Card */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs p-6 space-y-6">
            <div>
              <h2 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-zinc-600" />
                Contact & Address
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Official contact channels printed on sales receipts and displayed to customers.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-zinc-400" />
                  Official Phone Number
                </Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 024 123 4567"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-zinc-400" />
                  Business Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. sales@mycompany.com"
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <Label htmlFor="location" className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                  Headquarters / Physical Location
                </Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Accra Mall, Unit 24, Spintex Road"
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <Label htmlFor="description" className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-zinc-400" />
                  Business Description / Slogan
                </Label>
                <textarea
                  id="description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short summary or slogan of your store..."
                  className="w-full rounded-lg border border-zinc-300 bg-white p-3 text-sm text-zinc-900 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-600/10 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white px-6 h-11"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Company Profile
                </>
              )}
            </Button>
          </div>
        </form>
      )}

      {/* Relogin Modal when shop is renamed */}
      {reloginRequired && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-100 text-center space-y-4 animate-in zoom-in-95">
            <div className="h-12 w-12 rounded-full bg-green-100 text-green-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-6 w-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-zinc-900">Store Name Updated!</h3>
              <p className="text-sm text-zinc-500 mt-1.5 leading-relaxed">
                Your store has been renamed to <span className="font-semibold text-zinc-800">{name}</span> and all records have been cascaded.
              </p>
              <p className="text-xs text-zinc-400 mt-2">
                Logging you out in <span className="font-bold text-green-600">{reloginCountdown}</span> seconds...
              </p>
            </div>

            <Button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full bg-zinc-900 hover:bg-zinc-800 text-white"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Log In Now
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
