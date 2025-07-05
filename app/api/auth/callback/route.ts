import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get("code")
    const next = requestUrl.searchParams.get("next") ?? "/pending-approval"

    if (code) {
      const cookieStore = await cookies()
      
      // response 객체를 먼저 생성
      const response = NextResponse.next()
      
      const supabase = createRouteHandlerClient<Database>({ 
        cookies: () => cookieStore as any // Next.js 15 호환성을 위한 타입 캐스팅
      })

      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (!error && data.session) {
        // 프로필 확인 및 생성
        const user = data.session.user
        
        // Service role로 확실하게 프로필 조회
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        
        if (!supabaseUrl || !serviceRoleKey) {
          return NextResponse.redirect(new URL("/login?error=서버 설정 오류", requestUrl.origin))
        }
        
        const serviceSupabase = createClient(supabaseUrl, serviceRoleKey)
        
        const { data: existingProfile, error: profileError } = await serviceSupabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()
        
        // 승인된 사용자는 바로 대시보드로, 그렇지 않으면 승인 대기 페이지로
        const redirectPath = existingProfile?.approval_status === 'approved' ? '/dashboard' : '/pending-approval'
        
        // 쿠키를 response 객체에 복사
        const finalResponse = NextResponse.redirect(new URL(redirectPath, requestUrl.origin))
        
        // 기존 response의 쿠키를 finalResponse로 복사
        response.cookies.getAll().forEach((cookie) => {
          finalResponse.cookies.set(cookie)
        })
        
        return finalResponse
      } else {
        return NextResponse.redirect(new URL("/login?error=인증 코드 교환에 실패했습니다", requestUrl.origin))
      }
    }

    return NextResponse.redirect(new URL("/login?error=인증 코드가 없습니다", requestUrl.origin))
  } catch (error) {
    const requestUrl = new URL(request.url)
    return NextResponse.redirect(new URL("/login?error=로그인 처리 중 오류가 발생했습니다", requestUrl.origin))
  }
}