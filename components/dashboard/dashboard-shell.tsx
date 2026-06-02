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
    {
      label: "Transactions",
      href: "/dashboard/worker/transactions",
      icon: ClipboardList,
    },
  ];
  const adminItems: NavItem[] = [
    { label: "Overview", href: "/dashboard/admin", icon: LayoutDashboard },
    { label: "Transactions", href: "/dashboard/admin/new", icon: ReceiptText },
    { label: "Inventory", href: "/dashboard/admin/inventory", icon: Package },
    {
      label: "View Transactions",
      href: "/dashboard/admin/transactions",
      icon: ClipboardList,
    },
    { label: "Workers", href: "/dashboard/admin/workers", icon: Users },
  ];
  const superAdminItems: NavItem[] = [
    ...adminItems.filter((item) => ![
      "/dashboard/admin",
      "/dashboard/admin/inventory",
      "/dashboard/admin/new",
      "/dashboard/admin/transactions",
    ].includes(item.href)),
    { label: "Shops", href: "/dashboard/admin/shops", icon: LayoutDashboard },
    { label: "Admin", href: "/dashboard/admin/register", icon: ShieldCheck },
  ];
  if (role === "super_admin") return superAdminItems;
  if (role === "admin") return adminItems;
  return workerItems;
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
      {/* Logo */}
      <div className="px-6 py-5">
        <span className="text-xl font-bold text-green-600">FJ pay</span>
      </div>

      <Separator />

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-green-50 text-green-700"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
              )}
            >
              <Icon
                className={cn("h-4 w-4", isActive ? "text-green-600" : "")}
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
            {session.user.worker_role}
          </p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
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

  return (
    <div className="flex h-screen bg-zinc-50">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-zinc-200 bg-white">
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
          <span className="text-lg font-bold text-green-600">FJ Pay</span>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
