import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import type { Database } from "@/types/database"

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get("code")
    const next = requestUrl.searchParams.get("next") ?? "/pending-approval"

    if (!code) {
      return NextResponse.redirect(new URL("/login?error=인증 코드가 없습니다", requestUrl.origin))
    }

    // Store cookies to be set
    const cookiesToSet: Array<{ name: string; value: string; options: any }> = []
    
    // Create Supabase client with proper cookie handling for Next.js 15
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            // Store cookies to be set later
            cookiesToSet.push({
              name,
              value,
              options: {
                ...options,
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
              }
            })
          },
          remove(name: string, options: any) {
            cookiesToSet.push({
              name,
              value: '',
              options: {
                ...options,
                maxAge: 0,
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
              }
            })
          },
        },
      }
    )

    // Exchange code for session - this will set the necessary cookies
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Auth callback error:', error)
      
      // Rate limit 에러 처리
      if (error.status === 429 || error.message?.includes('rate limit')) {
        return NextResponse.redirect(
          new URL("/login?error=너무 많은 로그인 시도가 있었습니다. 5분 후 다시 시도해주세요.", requestUrl.origin)
        )
      }
      
      // 이미 사용된 코드 에러 처리
      if (error.message?.includes('code challenge') || error.message?.includes('already used')) {
        return NextResponse.redirect(
          new URL("/login?error=이미 사용된 인증 코드입니다. 다시 로그인해주세요.", requestUrl.origin)
        )
      }
      
      return NextResponse.redirect(new URL("/login?error=인증 코드 교환에 실패했습니다", requestUrl.origin))
    }

    // Get user to verify session
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('Get user error:', userError)
      return NextResponse.redirect(new URL("/login?error=사용자 정보를 가져올 수 없습니다", requestUrl.origin))
    }

    // Check profile approval status
    const { data: profile } = await supabase
      .from("profiles")
      .select("approval_status")
      .eq("id", user.id)
      .single()
    
    // Determine redirect path based on approval status
    const redirectPath = profile?.approval_status === 'approved' ? '/dashboard' : '/pending-approval'
    
    // Create the final redirect response
    const finalResponse = NextResponse.redirect(new URL(redirectPath, requestUrl.origin))
    
    // Set all the cookies that were collected
    cookiesToSet.forEach(({ name, value, options }) => {
      finalResponse.cookies.set(name, value, options)
    })
    
    return finalResponse
  } catch (error) {
    console.error('Auth callback unexpected error:', error)
    const requestUrl = new URL(request.url)
    return NextResponse.redirect(new URL("/login?error=로그인 처리 중 오류가 발생했습니다", requestUrl.origin))
  }
}