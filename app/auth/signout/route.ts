import { createServerClient } from "@/lib/auth/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createServerClient()

  // Sign out from Supabase
  await supabase.auth.signOut()

  // Redirect to login page
  return NextResponse.redirect(new URL("/login", request.url))
}

export async function GET(request: Request) {
  // Support GET for form action fallback
  const supabase = await createServerClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL("/login", request.url))
}
