import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isAuthenticated = !!req.auth
  const { pathname } = req.nextUrl
  const isPublicReceiptPage = /^\/receipts\/[^/]+$/.test(pathname)

  if (!isAuthenticated && pathname !== "/login" && !isPublicReceiptPage) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (isAuthenticated && pathname === "/login") {
    return NextResponse.redirect(new URL("/", req.url))
  }
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
