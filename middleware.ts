import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import type { User } from "@supabase/supabase-js"

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

  // Create Supabase client with proper cookie handling
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options
          })
          res.cookies.set({
            name,
            value,
            ...options
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options
          })
          res.cookies.set({
            name,
            value: '',
            ...options
          })
        },
      },
    }
  )
  
  // Use getUser() instead of getSession() for server validation
  const { data: { user }, error } = await supabase.auth.getUser()
  
  // Handle auth errors (rate limit, invalid token)
  if (error) {
    // Ignore cookie parsing errors (Supabase internal issue)
    if (!error.message?.includes('Failed to parse cookie')) {
      console.error('Auth error in middleware:', error.message)
    }
  }

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
  if (isProtectedRoute && !user) {
    const redirectUrl = new URL("/login", request.url)
    redirectUrl.searchParams.set("redirect", path)
    return NextResponse.redirect(redirectUrl)
  }

  // Special handling for pending-approval page
  if (path === "/pending-approval") {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url))
    }
    return res
  }

  // Check user approval status for protected routes
  if (user && isProtectedRoute) {
    // Cache user info to avoid multiple DB calls
    const { data: profile } = await supabase
      .from("profiles")
      .select("approval_status, name")
      .eq("id", user.id)
      .single()

    if (!profile || !profile.name || profile.name.trim() === "" || profile.approval_status !== "approved") {
      return NextResponse.redirect(new URL("/pending-approval", request.url))
    }

    // Admin-only routes
    if (path === "/employees" || path.startsWith("/employees/")) {
      const { data: employee } = await supabase
        .from("employees")
        .select("position")
        // @ts-ignore
        .eq("auth_id", user.id)
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