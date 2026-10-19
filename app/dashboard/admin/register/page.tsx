"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/axios"
import { getErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/ui/image-upload";

interface RegisterPayload {
  worker_name: string;
  worker_shop_name: string;
  worker_branch_name?: string;
  worker_role: string;
  worker_email: string;
  worker_phone: string;
  worker_password: string;
  worker_shop_image: string;
}

export default function RegisterPage() {
  const [form, setForm] = useState<RegisterPayload>({
    worker_name: "",
    worker_shop_name: "",
    worker_role: "admin",
    worker_email: "",
    worker_phone: "",
    worker_password: "",
    worker_shop_image: "",
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  function set(field: keyof RegisterPayload, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/api/v1/registerme", form);
      return data;
    },
    onSuccess: () => {
      toast.success("shop registered successfully!");
      setForm({
        worker_name: "",
        worker_shop_name: "",
        worker_role: "admin",
        worker_email: "",
        worker_phone: "",
        worker_password: "",
        worker_shop_image: "",
      });
      setConfirmPassword("");
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Registration failed. Please try again."));
    },
  });

  const passwordsMatch = form.worker_password === confirmPassword;
  const canSubmit =
    form.worker_name.trim() &&
    form.worker_shop_name.trim() &&
    form.worker_email.trim() &&
    form.worker_password.trim().length >= 8 &&
    confirmPassword.trim() &&
    passwordsMatch &&
    !mutation.isPending;

  return (
    <div className="mx-auto max-w-xl w-full">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-900">Add Shop To System</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Add a new shop to the plaform
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) mutation.mutate();
        }}
        className="bg-white rounded-2xl border border-zinc-200 shadow-sm divide-y divide-zinc-100"
      >
        {/* Identity */}
        <div className="px-5 py-5 space-y-4">
          <p className="text-sm font-semibold text-zinc-700">Worker Details</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="worker_name">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="worker_name"
                placeholder="e.g. John Doe"
                value={form.worker_name}
                onChange={(e) => set("worker_name", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="worker_role">
                Role <span className="text-red-500">*</span>
              </Label>
              <select
                id="worker_role"
                value={form.worker_role}
                onChange={(e) => set("worker_role", e.target.value)}
                className="w-full h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-600/10"
              >
                <option value="worker">Worker</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="worker_shop_name">
              Shop Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="worker_shop_name"
              placeholder="e.g. Acme Enterprise"
              value={form.worker_shop_name}
              onChange={(e) => set("worker_shop_name", e.target.value)}
              required
            />
            <p className="text-xs text-zinc-500">
              The business owner will be prompted to set up their primary main branch upon first login.
            </p>
          </div>
        </div>

        {/* Credentials */}
        <div className="px-5 py-5 space-y-4">
          <p className="text-sm font-semibold text-zinc-700">
            Login Credentials
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="worker_email">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="worker_email"
              type="email"
              placeholder="worker@shop.com"
              value={form.worker_email}
              onChange={(e) => set("worker_email", e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="worker_phone">Phone</Label>
            <Input
              id="worker_phone"
              placeholder="0XX XXX XXXX (used for platform SMS)"
              value={form.worker_phone}
              onChange={(e) => set("worker_phone", e.target.value)}
            />
          </div>

          {/* Password with Eye Toggle */}
          <div className="space-y-1.5">
            <Label htmlFor="worker_password">
              Password <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="worker_password"
                type={showPassword ? "text" : "password"}
                placeholder="Min. 8 characters"
                value={form.worker_password}
                onChange={(e) => set("worker_password", e.target.value)}
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 focus:outline-none cursor-pointer"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password with Eye Toggle */}
          <div className="space-y-1.5">
            <Label htmlFor="confirm_password">
              Confirm Password <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="confirm_password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 focus:outline-none cursor-pointer"
                tabIndex={-1}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword.length > 0 && (
              <div className="flex items-center gap-1.5 pt-0.5 text-xs">
                {passwordsMatch ? (
                  <span className="text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Passwords match
                  </span>
                ) : (
                  <span className="text-red-600 font-medium flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" /> Passwords do not match
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Shop image */}
        <div className="px-5 py-5 space-y-4">
          <p className="text-sm font-semibold text-zinc-700">Shop Image</p>
          <ImageUpload
            value={form.worker_shop_image}
            onChange={(url) => set("worker_shop_image", url)}
          />
        </div>

        {/* Submit */}
        <div className="px-5 py-4">
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={!canSubmit}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Registering…
              </>
            ) : (
              "Register Shop"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
