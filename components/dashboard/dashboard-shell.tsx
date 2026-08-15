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

function getNavItems(role: string): NavItem[] {
  const workerItems: NavItem[] = [
    { label: "New Transaction", href: "/dashboard/worker", icon: ReceiptText },
    { label: "Pending Orders", href: "/dashboard/worker/pending", icon: Clock },
    {
      label: "Transactions",
      href: "/dashboard/worker/transactions",
      icon: ClipboardList,
    },
    { label: "Clients", href: "/dashboard/worker/clients", icon: Contact },
  ];
  const adminItems: NavItem[] = [
    { label: "Overview", href: "/dashboard/admin", icon: LayoutDashboard },
    { label: "Transactions", href: "/dashboard/admin/new", icon: ReceiptText },
    { label: "Pending Orders", href: "/dashboard/admin/pending", icon: Clock },
    { label: "Inventory", href: "/dashboard/admin/inventory", icon: Package },
    {
      label: "View Transactions",
      href: "/dashboard/admin/transactions",
      icon: ClipboardList,
    },
    {
      label: "Financial Reports",
      href: "/dashboard/admin/reports",
      icon: TrendingUp,
    },
    { label: "Categories", href: "/dashboard/admin/categories", icon: Tags },
    { label: "Clients", href: "/dashboard/admin/clients", icon: Contact },
    { label: "Send SMS", href: "/dashboard/admin/broadcast", icon: Megaphone },
    { label: "Workers", href: "/dashboard/admin/workers", icon: Users },
  ];
  const superAdminItems: NavItem[] = [
    ...adminItems.filter((item) => ![
      "/dashboard/admin",
      "/dashboard/admin/inventory",
      "/dashboard/admin/new",
      "/dashboard/admin/pending",
      "/dashboard/admin/transactions",
    ].includes(item.href)),
    { label: "Shops", href: "/dashboard/admin/shops", icon: LayoutDashboard },
    { label: "Admin", href: "/dashboard/admin/register", icon: ShieldCheck },
  ];
  if (role === "super_admin") return superAdminItems;
  if (role === "admin") return adminItems;
  return workerItems;
}

// Deterministic hue from the shop name, so a shop without a logo still gets
// a distinct, consistent brand color instead of a generic gray placeholder.
function nameToHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

function ShopIdentity({ session }: { session: Session }) {
  const shopName = (session.user.worker_shop_name || "Shop").replace(/_/g, " "); // noqa
  const shopImage = session.user.worker_shop_image;
  const hue = nameToHue(shopName);
  const initial = shopName.trim().charAt(0).toUpperCase();

  return (
    <div className="px-5 py-5 bg-gradient-to-br from-green-800 to-green-950 text-white"> {/* noqa */}
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
          <p className="font-heading font-bold text-[15px] leading-tight truncate capitalize"> {/* noqa */}
            {shopName}
          </p>
          <p className="text-[11px] text-green-200/70 tracking-wide">FJ Pay POS</p> {/* noqa */}
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

      {/* Nav */}
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
                className={cn("h-4 w-4 shrink-0", isActive ? "text-green-700" : "text-zinc-400")} // noqa
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Separator />

      {/* User */}
      <div className="px-4 py-4 space-y-3">
        <div className="px-3">
          <p className="text-sm font-medium text-zinc-900 truncate">
            {session.user.worker_name}
          </p>
          <p className="text-xs text-zinc-500 capitalize">
            {session.user.worker_role?.replace("_", " ")}
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
  const navItems = getNavItems(session.user.worker_role);
  const shopName = (session.user.worker_shop_name || "Shop").replace(/_/g, " "); // noqa

  return (
    <div className="flex h-screen bg-gradient-to-br from-zinc-50 to-zinc-100/60">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-zinc-200 bg-white shadow-sm"> {/* noqa */}
        <SidebarContent
          session={session}
          navItems={navItems}
          pathname={pathname}
        />
      </aside>

      {/* Mobile */}
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
          <span className="font-heading font-bold text-zinc-900 capitalize truncate"> {/* noqa */}
            {shopName}
          </span>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
