import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const res = NextResponse.next()

  // Skip static assets and API routes
  if (
    path.startsWith('/_next') || 
    path.startsWith('/api') || 
    path.includes('.') || 
    path.startsWith('/static') ||
    path.startsWith('/favicon')
  ) {
    return res
  }

  const supabase = createMiddlewareClient({ req: request, res })
  const { data: { session } } = await supabase.auth.getSession()

  // Public routes that don't require authentication
  const publicRoutes = ["/", "/login", "/signup", "/reset-password"]
  const isPublicRoute = publicRoutes.includes(path)

  // Protected routes that require authentication
  const authRequiredPaths = [
    "/dashboard",
    "/students", 
    "/employees",
    "/schedule",
    "/learning",
    "/analytics",
    "/settings",
    "/admin",
    "/agent",
  ]
  const isProtectedRoute = authRequiredPaths.some(authPath => 
    path === authPath || path.startsWith(`${authPath}/`)
  )

  // Redirect unauthenticated users from protected routes
  if (isProtectedRoute && !session) {
    const redirectUrl = new URL("/login", request.url)
    redirectUrl.searchParams.set("redirect", path)
    return NextResponse.redirect(redirectUrl)
  }

  // Special handling for pending-approval page
  if (path === "/pending-approval") {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url))
    }
    return res
  }

  // Check user approval status for protected routes
  if (session && isProtectedRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("approval_status, name")
      .eq("id", session.user.id)
      .single()

    if (!profile || !profile.name || profile.name.trim() === "" || profile.approval_status !== "approved") {
      return NextResponse.redirect(new URL("/pending-approval", request.url))
    }

    // Admin-only routes
    if (path === "/employees" || path.startsWith("/employees/")) {
      const { data: employee } = await supabase
        .from("employees")
        .select("position")
        .eq("auth_id", session.user.id)
        .single()
      
      if (!employee || (employee.position !== "원장" && employee.position !== "부원장")) {
        return NextResponse.redirect(new URL("/dashboard", request.url))
      }
    }
  }

  return res
}

export const config = {
  matcher: [
    "/",
    "/pending-approval",
    "/dashboard/:path*",
    "/students/:path*",
    "/employees/:path*",
    "/schedule/:path*",
    "/learning/:path*",
    "/analytics/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/agent/:path*",
  ],
}