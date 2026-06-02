import { auth } from "@/auth"
import { NextResponse } from "next/server"

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

  // Block workers from admin routes
  if (pathname.startsWith("/dashboard/admin") && role !== "admin" && role !== "super_admin") {
    return NextResponse.redirect(new URL("/dashboard/worker", req.url))
  }

  // Block regular admins from super_admin-only routes
  const superAdminOnlyRoutes = ["/dashboard/admin/register", "/dashboard/admin/shops"]
  if (superAdminOnlyRoutes.some((r) => pathname.startsWith(r)) && role !== "super_admin") {
    return NextResponse.redirect(new URL("/dashboard/admin", req.url))
  }
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
