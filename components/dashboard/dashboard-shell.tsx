"use client";

import { useState } from "react";
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
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
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
  if (perms.can_sms_own_branch || perms.can_sms_all_branches) {
    items.push({ label: "Send SMS", href: "/dashboard/worker/broadcast", icon: Megaphone });
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

function ShopIdentity({ session }: { session: Session }) {
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
        <div className="min-w-0">
          <p className="font-heading font-bold text-[15px] leading-tight truncate capitalize">
            {shopName}
          </p>
          <p className="text-[11px] text-green-200/80 tracking-wide font-medium flex items-center gap-1">
            {session.user.worker_branch_name ? (
              <span className="truncate">{session.user.worker_branch_name}</span>
            ) : (
              <span>Main Branch</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function SidebarContent({
  session,
  navItems,
  pathname,
  onNavigate,
}: {
  session: Session;
  navItems: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <ShopIdentity session={session} />

      <nav className="flex-1 min-h-0 overflow-y-auto space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-green-50 text-green-800 font-semibold"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
              )}
            >
              <Icon
                className={cn("h-4 w-4 shrink-0", isActive ? "text-green-700" : "text-zinc-400")}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Separator />

      <div className="px-4 py-4 space-y-3">
        <div className="px-3">
          <p className="text-sm font-medium text-zinc-900 truncate">
            {session.user.worker_name}
          </p>
          <p className="text-xs text-zinc-500 capitalize">
            {/* Show role_label if set, otherwise fall back to worker_role */}
            {(session.user as { role_label?: string }).role_label || session.user.worker_role?.replace("_", " ")}
          </p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-full px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
        <p className="px-3 text-[10px] text-zinc-300">Powered by FJ Pay</p>
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = getNavItems(session.user);
  const shopName = (session.user.worker_shop_name || "Shop").replace(/_/g, " ");

  return (
    <div className="flex h-screen bg-gradient-to-br from-zinc-50 to-zinc-100/60">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-zinc-200 bg-white shadow-sm">
        <SidebarContent
          session={session}
          navItems={navItems}
          pathname={pathname}
        />
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="flex md:hidden items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SidebarContent
                session={session}
                navItems={navItems}
                pathname={pathname}
                onNavigate={() => setMobileOpen(false)}
              />
            </SheetContent>
          </Sheet>
          <span className="font-heading font-bold text-zinc-900 capitalize truncate">
            {shopName}
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
