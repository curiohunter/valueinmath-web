import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get("code")
    const next = requestUrl.searchParams.get("next") ?? "/pending-approval"

    if (code) {
      const cookieStore = await cookies()
      const supabase = createServerComponentClient<Database>({ 
        cookies: () => cookieStore as any // Next.js 15 호환성을 위한 타입 캐스팅
      })

      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (!error && data.session) {
        // 프로필 확인 및 생성
        const user = data.session.user
        
        // Service role로 확실하게 프로필 조회
        const serviceSupabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        
        const { data: existingProfile, error: profileError } = await serviceSupabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()
        
        // 승인된 사용자는 바로 대시보드로, 그렇지 않으면 승인 대기 페이지로
        const redirectPath = existingProfile?.approval_status === 'approved' ? '/dashboard' : '/pending-approval'
        const response = NextResponse.redirect(new URL(redirectPath, requestUrl.origin))
        
        // 세션 쿠키를 명시적으로 설정
        const cookieOptions = {
          name: `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`,
          value: JSON.stringify({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_at: data.session.expires_at,
            token_type: data.session.token_type,
            user: data.session.user
          }),
          path: '/',
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax' as const
        }
        
        response.cookies.set(cookieOptions)
        
        return response
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