"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Session } from "next-auth";
import {
  Menu,
  ReceiptText,
  ClipboardList,
  LogOut,
  LayoutDashboard,
  Users,
  Package,
  ShieldCheck,
  Tags,
  Contact,
  Clock,
  Megaphone,
  TrendingUp,
  Wallet,
  Store,
  Settings,
  KeyRound,
  User,
  AlertTriangle,
  ChevronDown,
  Check,
  Building2,
  ArrowLeftRight,
} from "lucide-react";
import { WorkerProfileModal } from "@/components/shared/worker-profile-modal";
import { signOut } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/axios";
import { cn, getErrorMessage } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChangePasswordModal } from "@/components/shared/change-password-modal";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

export interface BranchOption {
  id: string;
  branch_name: string;
  is_main: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getNavItems(session: Session["user"]): NavItem[] {
  const role = session.worker_role;
  const perms = (session.permissions || {}) as unknown as Record<string, boolean>;

  if (role === "super_admin") {
    return [
      { label: "Expenses", href: "/dashboard/admin/expenses", icon: Wallet },
      { label: "Financial Reports", href: "/dashboard/admin/reports", icon: TrendingUp },
      { label: "Categories", href: "/dashboard/admin/categories", icon: Tags },
      { label: "Clients", href: "/dashboard/admin/clients", icon: Contact },
      { label: "Send SMS", href: "/dashboard/admin/broadcast", icon: Megaphone },
      { label: "Branches", href: "/dashboard/admin/branches", icon: Store },
      { label: "Workers", href: "/dashboard/admin/workers", icon: Users },
      { label: "Shops", href: "/dashboard/admin/shops", icon: LayoutDashboard },
      { label: "Admin", href: "/dashboard/admin/register", icon: ShieldCheck },
      { label: "Settings", href: "/dashboard/admin/settings", icon: Settings },
    ];
  }

  if (role === "admin") {
    return [
      { label: "Overview", href: "/dashboard/admin", icon: LayoutDashboard },
      { label: "Transactions", href: "/dashboard/admin/new", icon: ReceiptText },
      { label: "Pending Orders", href: "/dashboard/admin/pending", icon: Clock },
      { label: "Inventory", href: "/dashboard/admin/inventory", icon: Package },
      { label: "View Transactions", href: "/dashboard/admin/transactions", icon: ClipboardList },
      { label: "Expenses", href: "/dashboard/admin/expenses", icon: Wallet },
      { label: "Financial Reports", href: "/dashboard/admin/reports", icon: TrendingUp },
      { label: "Categories", href: "/dashboard/admin/categories", icon: Tags },
      { label: "Clients", href: "/dashboard/admin/clients", icon: Contact },
      { label: "Send SMS", href: "/dashboard/admin/broadcast", icon: Megaphone },
      { label: "Branches", href: "/dashboard/admin/branches", icon: Store },
      { label: "Workers", href: "/dashboard/admin/workers", icon: Users },
      { label: "Settings", href: "/dashboard/admin/settings", icon: Settings },
    ];
  }

  // Workers: permission-gated nav
  const items: NavItem[] = [];

  if (perms.can_sell) {
    items.push({ label: "New Transaction", href: "/dashboard/worker", icon: ReceiptText });
  }
  if (perms.can_manage_orders) {
    items.push({ label: "Pending Orders", href: "/dashboard/worker/pending", icon: Clock });
  }
  if (perms.view_own_transactions || perms.view_all_transactions) {
    items.push({ label: "Transactions", href: "/dashboard/worker/transactions", icon: ClipboardList });
  }
  if (perms.can_add_inventory || perms.can_update_stock) {
    items.push({ label: "Inventory", href: "/dashboard/worker/inventory", icon: Package });
  }
  if (perms.can_see_clients) {
    items.push({ label: "Clients", href: "/dashboard/worker/clients", icon: Contact });
  }
  if (perms.can_manage_expenses) {
    items.push({ label: "Expenses", href: "/dashboard/worker/expenses", icon: Wallet });
  }
  if (perms.can_sms_own_branch || perms.can_sms_all_branches) {
    items.push({ label: "Send SMS", href: "/dashboard/worker/broadcast", icon: Megaphone });
  }
  if (perms.can_manage_branches) {
    items.push({ label: "Branches", href: "/dashboard/admin/branches", icon: Store });
  }

  return items;
}

function nameToHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

function BranchSwitcher({
  activeBranch,
  branches,
  canSwitch,
  isPending,
  onSwitch,
}: {
  activeBranch: string;
  branches: BranchOption[];
  canSwitch: boolean;
  isPending: boolean;
  onSwitch: (branchName: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (!canSwitch || branches.length <= 1) {
    return (
      <p className="text-[11px] text-green-200/80 tracking-wide font-medium flex items-center gap-1.5 mt-0.5">
        <Store className="h-3 w-3 shrink-0 text-green-300/80" />
        <span className="truncate">{activeBranch}</span>
      </p>
    );
  }

  return (
    <div className="relative mt-1" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className="group flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-black/25 hover:bg-black/40 text-white/90 hover:text-white transition-all text-[11px] font-medium border border-white/10 hover:border-white/25 cursor-pointer max-w-full"
        title="Click to switch operating branch"
      >
        <Store className="h-3 w-3 text-green-300 shrink-0" />
        <span className="truncate max-w-[120px] font-semibold">{activeBranch}</span>
        <ChevronDown
          className={cn("h-3 w-3 text-green-200/70 shrink-0 transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-60 rounded-xl bg-white text-zinc-900 shadow-2xl border border-zinc-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 border-b border-zinc-100 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Switch Operating Branch</span>
            <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
              Live Context
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto py-1 divide-y divide-zinc-50">
            {branches.map((b) => {
              const isSelected = activeBranch.trim().toLowerCase() === b.branch_name.trim().toLowerCase();
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onSwitch(b.branch_name);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors cursor-pointer",
                    isSelected ? "bg-emerald-50/80 text-emerald-900 font-semibold" : "hover:bg-zinc-50 text-zinc-700"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className={cn("h-3.5 w-3.5 shrink-0", isSelected ? "text-emerald-700" : "text-zinc-400")} />
                    <span className="truncate">{b.branch_name}</span>
                    {b.is_main && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200/60 shrink-0">
                        Main
                      </span>
                    )}
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 text-emerald-700 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ShopIdentity({
  session,
  activeBranch,
  branches,
  canSwitch,
  isPending,
  onSwitch,
}: {
  session: Session;
  activeBranch: string;
  branches: BranchOption[];
  canSwitch: boolean;
  isPending: boolean;
  onSwitch: (branchName: string | null) => void;
}) {
  const shopName = (session.user.worker_shop_name || "Shop").replace(/_/g, " ");
  const shopImage = session.user.worker_shop_image;
  const hue = nameToHue(shopName);
  const initial = shopName.trim().charAt(0).toUpperCase();

  return (
    <div className="px-5 py-5 bg-gradient-to-br from-green-800 to-green-950 text-white">
      <div className="flex items-center gap-3 min-w-0">
        {shopImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shopImage}
            alt={shopName}
            className="h-11 w-11 rounded-xl object-cover shrink-0 ring-2 ring-white/15"
          />
        ) : (
          <div
            className="h-11 w-11 rounded-xl shrink-0 flex items-center justify-center font-heading font-bold text-lg text-white ring-2 ring-white/15"
            style={{ backgroundColor: `hsl(${hue}, 55%, 40%)` }}
          >
            {initial}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-heading font-bold text-[15px] leading-tight truncate capitalize">
            {shopName}
          </p>
          <BranchSwitcher
            activeBranch={activeBranch}
            branches={branches}
            canSwitch={canSwitch}
            isPending={isPending}
            onSwitch={onSwitch}
          />
        </div>
      </div>
    </div>
  );
}

function SidebarContent({
  session,
  navItems,
  pathname,
  pendingResetsCount = 0,
  isPhoneMissing = false,
  activeBranch,
  branches,
  canSwitchBranch,
  isSwitchingBranch,
  onSwitchBranch,
  onOpenProfile,
  onOpenChangePassword,
  onNavigate,
}: {
  session: Session;
  navItems: NavItem[];
  pathname: string;
  pendingResetsCount?: number;
  isPhoneMissing?: boolean;
  activeBranch: string;
  branches: BranchOption[];
  canSwitchBranch: boolean;
  isSwitchingBranch: boolean;
  onSwitchBranch: (branchName: string | null) => void;
  onOpenProfile?: () => void;
  onOpenChangePassword?: () => void;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <ShopIdentity
        session={session}
        activeBranch={activeBranch}
        branches={branches}
        canSwitch={canSwitchBranch}
        isPending={isSwitchingBranch}
        onSwitch={onSwitchBranch}
      />

      <nav className="flex-1 min-h-0 overflow-y-auto space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          const isWorkers = item.label === "Workers";
          const showBadge = isWorkers && pendingResetsCount > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-green-50 text-green-800 font-semibold"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              )}
            >
              <Icon
                className={cn("h-4 w-4 shrink-0", isActive ? "text-green-700" : "text-zinc-400")}
              />
              <span className="truncate">{item.label}</span>
              {showBadge && (
                <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-bold leading-none text-white bg-red-500 rounded-full animate-pulse shadow-xs">
                  {pendingResetsCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <Separator />

      <div className="px-4 py-4 space-y-2">
        <div className="px-3 mb-2">
          <p className="text-sm font-medium text-zinc-900 truncate">
            {session.user.worker_name}
          </p>
          <p className="text-xs text-zinc-500 capitalize">
            {(session.user as { role_label?: string }).role_label || session.user.worker_role?.replace("_", " ")}
          </p>
        </div>

        <button
          onClick={onOpenProfile}
          className="flex w-full items-center justify-between rounded-full px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-zinc-400" />
            <span>My Profile</span>
          </div>
          {isPhoneMissing && (
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" title="Phone number missing" />
          )}
        </button>

        <button
          onClick={onOpenChangePassword}
          className="flex w-full items-center gap-3 rounded-full px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors cursor-pointer"
        >
          <KeyRound className="h-4 w-4 text-zinc-400" />
          Change Password
        </button>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-full px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
        <p className="px-3 pt-1 text-[10px] text-zinc-300">Powered by FJ Pay</p>
      </div>
    </div>
  );
}

export function DashboardShell({
  session,
  children,
}: {
  session: Session;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const navItems = getNavItems(session.user);
  const shopName = (session.user.worker_shop_name || "Shop").replace(/_/g, " ");

  const role = session.user.worker_role;
  const perms = (session.user.permissions || {}) as unknown as Record<string, boolean>;
  const canManageWorkers = role === "admin" || role === "super_admin" || !!perms.can_add_others;
  const canSwitchBranch = role === "admin" || role === "super_admin" || !!perms.can_manage_branches || !!perms.is_global;

  // Poll for pending password reset requests if user has permissions to view them
  const { data: pendingResets = [] } = useQuery({
    queryKey: ["pending-password-resets-count"],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/admin/password-resets");
      return data;
    },
    enabled: canManageWorkers,
    refetchInterval: 20000,
    staleTime: 10000,
  });

  const pendingResetsCount = Array.isArray(pendingResets)
    ? pendingResets.length
    : (pendingResets as any)?.count ?? (pendingResets as any)?.requests?.length ?? 0;

  // Fetch current user's profile to get live branch & phone info
  const { data: profile } = useQuery<{ worker_phone?: string | null; worker_branch_name?: string | null }>({
    queryKey: ["dashboard-profile"],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/profile");
      return data;
    },
    staleTime: 10000,
  });

  // Fetch shop branches
  const { data: branches = [] } = useQuery<BranchOption[]>({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/branches");
      return data;
    },
    staleTime: 60000,
  });

  const isPhoneMissing = profile !== undefined && (!profile?.worker_phone || profile.worker_phone.trim() === "");

  // Determine current active operating branch
  const activeBranch = profile?.worker_branch_name || session.user.worker_branch_name || "Main Branch";

  // Main branch detection
  const mainBranchRecord = branches.find((b) => b.is_main);
  const mainBranchName = mainBranchRecord ? mainBranchRecord.branch_name : "Main Branch";

  // User is considered operating in a switched/alternate branch if not on the main branch
  const isSwitchedBranch =
    canSwitchBranch &&
    branches.length > 1 &&
    activeBranch.trim().toLowerCase() !== mainBranchName.trim().toLowerCase();

  const switchBranchMutation = useMutation({
    mutationFn: async (branchName: string | null) => {
      const { data } = await api.post("/api/v1/branches/switch", { branch_name: branchName });
      return data;
    },
    onSuccess: (data, branchName) => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-profile"] });
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast.success(branchName ? `Operating as: ${branchName}` : `Switched to ${mainBranchName}`);
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });

  return (
    <div className="flex h-screen bg-gradient-to-br from-zinc-50 to-zinc-100/60">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-zinc-200 bg-white shadow-sm">
        <SidebarContent
          session={session}
          navItems={navItems}
          pathname={pathname}
          pendingResetsCount={pendingResetsCount}
          isPhoneMissing={isPhoneMissing}
          activeBranch={activeBranch}
          branches={branches}
          canSwitchBranch={canSwitchBranch}
          isSwitchingBranch={switchBranchMutation.isPending}
          onSwitchBranch={(name) => switchBranchMutation.mutate(name)}
          onOpenProfile={() => setProfileModalOpen(true)}
          onOpenChangePassword={() => setPasswordModalOpen(true)}
        />
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="flex md:hidden items-center justify-between border-b border-zinc-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Menu className="h-5 w-5" />
                  {pendingResetsCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SidebarContent
                  session={session}
                  navItems={navItems}
                  pathname={pathname}
                  pendingResetsCount={pendingResetsCount}
                  isPhoneMissing={isPhoneMissing}
                  activeBranch={activeBranch}
                  branches={branches}
                  canSwitchBranch={canSwitchBranch}
                  isSwitchingBranch={switchBranchMutation.isPending}
                  onSwitchBranch={(name) => {
                    switchBranchMutation.mutate(name);
                    setMobileOpen(false);
                  }}
                  onOpenProfile={() => {
                    setMobileOpen(false);
                    setProfileModalOpen(true);
                  }}
                  onOpenChangePassword={() => {
                    setMobileOpen(false);
                    setPasswordModalOpen(true);
                  }}
                  onNavigate={() => setMobileOpen(false)}
                />
              </SheetContent>
            </Sheet>
            <span className="font-heading font-bold text-zinc-900 capitalize truncate">
              {shopName}
            </span>
          </div>

          {canSwitchBranch && branches.length > 1 && (
            <div className="shrink-0">
              <BranchSwitcher
                activeBranch={activeBranch}
                branches={branches}
                canSwitch={canSwitchBranch}
                isPending={switchBranchMutation.isPending}
                onSwitch={(name) => switchBranchMutation.mutate(name)}
              />
            </div>
          )}
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* Switched Branch Notification Banner */}
          {isSwitchedBranch && (
            <div className="mb-5 bg-gradient-to-r from-emerald-900 via-teal-900 to-green-950 text-white rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md border border-emerald-700/50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-white/10 text-emerald-300 flex items-center justify-center shrink-0 border border-white/10">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
                      Active Operating Context
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/25 text-emerald-200 border border-emerald-400/30">
                      Branch Mode
                    </span>
                  </div>
                  <p className="text-sm font-bold text-white mt-0.5 truncate">
                    Operating as: <span className="underline decoration-emerald-400 underline-offset-4">{activeBranch}</span>
                  </p>
                  <p className="text-[11px] text-emerald-200/80 mt-0.5">
                    All sales, restocks, and records will be tagged under this branch until you switch back.
                  </p>
                </div>
              </div>

              <Button
                size="sm"
                onClick={() => switchBranchMutation.mutate(null)}
                disabled={switchBranchMutation.isPending}
                className="bg-white/15 hover:bg-white/25 text-white border border-white/20 text-xs h-8 px-3.5 rounded-xl shrink-0 cursor-pointer transition-all shadow-xs"
              >
                <ArrowLeftRight className="h-3.5 w-3.5 mr-1.5" />
                Return to {mainBranchName}
              </Button>
            </div>
          )}

          {isPhoneMissing && (
            <div className="mb-5 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200/90 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200">
                  <AlertTriangle className="h-5 w-5 text-amber-700" />
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-900">
                    Action Required: Phone Number Missing
                  </p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Your profile is missing a phone number. Please add it to secure your account and receive SMS alerts.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => setProfileModalOpen(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 px-3 rounded-xl shadow-xs shrink-0 cursor-pointer"
              >
                Add Phone Number
              </Button>
            </div>
          )}
          {children}
        </main>
      </div>

      <ChangePasswordModal
        open={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />
      <WorkerProfileModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        onOpenChangePassword={() => setPasswordModalOpen(true)}
      />
    </div>
  );
}
