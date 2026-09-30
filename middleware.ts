import { auth } from "@/auth"
import { NextResponse } from "next/server"

function getFirstAllowedWorkerRoute(perms: Record<string, boolean>): string {
  if (perms.can_sell) return "/dashboard/worker"
  if (perms.can_manage_orders) return "/dashboard/worker/pending"
  if (perms.view_own_transactions || perms.view_all_transactions) return "/dashboard/worker/transactions"
  if (perms.can_add_inventory || perms.can_update_stock) return "/dashboard/worker/inventory"
  if (perms.can_see_clients) return "/dashboard/worker/clients"
  if (perms.can_manage_expenses) return "/dashboard/worker/expenses"
  if (perms.can_sms_own_branch || perms.can_sms_all_branches) return "/dashboard/worker/broadcast"
  return "/dashboard/unauthorized"
}

export default auth((req) => {
  const isAuthenticated = !!req.auth
  const { pathname } = req.nextUrl
  const isPublicReceiptPage = /^\/receipts\/[^/]+$/.test(pathname)
  const role = req.auth?.user?.worker_role

  if (!isAuthenticated && pathname !== "/login" && !isPublicReceiptPage) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (isAuthenticated && pathname === "/login") {
    return NextResponse.redirect(new URL("/", req.url))
  }

  if (pathname === "/dashboard/unauthorized") {
    return NextResponse.next()
  }

  const isAdminRole = ["admin", "super_admin", "owner", "manager"].includes(role || "")
  const perms = ((req.auth?.user?.permissions as unknown) || {}) as Record<string, boolean>

  // Block non-admin staff from admin routes
  if (pathname.startsWith("/dashboard/admin") && !isAdminRole) {
    return NextResponse.redirect(new URL(getFirstAllowedWorkerRoute(perms), req.url))
  }

  // Block non-super_admin from super_admin-only routes
  const superAdminOnlyRoutes = ["/dashboard/admin/register", "/dashboard/admin/shops"]
  if (superAdminOnlyRoutes.some((r) => pathname.startsWith(r)) && role !== "super_admin") {
    return NextResponse.redirect(new URL("/dashboard/admin", req.url))
  }

  // Granular worker permission guards
  if (pathname.startsWith("/dashboard/worker") && !isAdminRole) {
    // 1. Inventory route
    if (pathname.startsWith("/dashboard/worker/inventory")) {
      if (!perms.can_add_inventory && !perms.can_update_stock) {
        return NextResponse.redirect(new URL(getFirstAllowedWorkerRoute(perms), req.url))
      }
    }
    // 2. Pending orders route
    else if (pathname.startsWith("/dashboard/worker/pending")) {
      if (!perms.can_manage_orders) {
        return NextResponse.redirect(new URL(getFirstAllowedWorkerRoute(perms), req.url))
      }
    }
    // 3. Transactions route
    else if (pathname.startsWith("/dashboard/worker/transactions")) {
      if (!perms.view_own_transactions && !perms.view_all_transactions) {
        return NextResponse.redirect(new URL(getFirstAllowedWorkerRoute(perms), req.url))
      }
    }
    // 4. Clients route
    else if (pathname.startsWith("/dashboard/worker/clients")) {
      if (!perms.can_see_clients) {
        return NextResponse.redirect(new URL(getFirstAllowedWorkerRoute(perms), req.url))
      }
    }
    // 5. Broadcast (SMS) route
    else if (pathname.startsWith("/dashboard/worker/broadcast")) {
      if (!perms.can_sms_own_branch && !perms.can_sms_all_branches) {
        return NextResponse.redirect(new URL(getFirstAllowedWorkerRoute(perms), req.url))
      }
    }
    // 6. Expenses route
    else if (pathname.startsWith("/dashboard/worker/expenses")) {
      if (!perms.can_manage_expenses) {
        return NextResponse.redirect(new URL(getFirstAllowedWorkerRoute(perms), req.url))
      }
    }
    // 6. POS / New Transaction route
    else if (pathname === "/dashboard/worker" || pathname === "/dashboard/worker/") {
      if (!perms.can_sell) {
        const target = getFirstAllowedWorkerRoute(perms)
        if (target !== "/dashboard/worker") {
          return NextResponse.redirect(new URL(target, req.url))
        }
      }
    }
  }
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
