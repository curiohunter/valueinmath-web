import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  // 현재 URL 경로
  const path = request.nextUrl.pathname

  // 응답 객체 생성
  const res = NextResponse.next()

  // 개발 환경에서 오래된 쿠키 정리
  if (process.env.NODE_ENV === 'development') {
    // Supabase auth 쿠키가 깨졌을 가능성이 있는 경우 정리
    const authCookie = request.cookies.get('sb-zeolpqtmlqzskvmhbyct-auth-token')
    if (authCookie && authCookie.value.includes('undefined')) {
      res.cookies.delete('sb-zeolpqtmlqzskvmhbyct-auth-token')
    }
  }

  // Supabase 클라이언트 생성
  const supabase = createMiddlewareClient({ req: request, res })

  // 세션 가져오기
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // 인증이 필요한 경로 목록
  const authRequiredPaths = [
    "/dashboard",
    "/students",
    "/employees",
    "/schedule",
    "/learning",
    "/analytics",
    "/settings",
    "/admin",
  ]

  // 1. 루트 경로 처리 - 랜딩페이지 표시
  if (path === "/") {
    // 루트 경로에서는 랜딩페이지를 보여줌
    return res
  }

  // 2. 승인 대기 페이지는 별도 처리 (무한 리디렉션 방지)
  if (path === "/pending-approval") {
    // 로그인하지 않은 경우에만 로그인 페이지로 리디렉션
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url))
    }
    return res
  }

  // 3. 인증이 필요한 경로에 접근하려는데 로그인되지 않은 경우
  const isAuthRequired = authRequiredPaths.some((authPath) => path === authPath || path.startsWith(`${authPath}/`))

  if (isAuthRequired && !session) {
    const redirectUrl = new URL("/login", request.url)
    redirectUrl.searchParams.set("redirect", path)
    return NextResponse.redirect(redirectUrl)
  }

  // 4. 로그인된 사용자의 승인 상태 확인
  if (session && isAuthRequired) {
    try {
      // 프로필 정보에서 승인 상태 및 이름 확인
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("approval_status, name")
        .eq("id", session.user.id)
        .single()

      // 프로필이 없는 경우 - 승인 대기 페이지로
      if (profileError && profileError.code === 'PGRST116') {
        return NextResponse.redirect(new URL("/pending-approval", request.url))
      }

      if (profile) {
        // 이름이 없는 경우 승인 대기 페이지로 (등록 폼 표시)
        if (!profile.name || profile.name.trim() === "") {
          return NextResponse.redirect(new URL("/pending-approval", request.url))
        }

        // 승인 대기 중인 경우
        if (profile.approval_status === "pending") {
          return NextResponse.redirect(new URL("/pending-approval", request.url))
        }

        // 거부된 경우
        if (profile.approval_status === "rejected") {
          const redirectUrl = new URL("/login", request.url)
          redirectUrl.searchParams.set("error", "계정이 거부되었습니다. 관리자에게 문의하세요.")
          return NextResponse.redirect(redirectUrl)
        }

        // 승인된 경우에만 관리자 페이지 접근 체크
        if (profile.approval_status === "approved") {
          // 관리자 전용 페이지 접근 체크
          const adminOnlyPaths = ["/employees"]
          const isAdminPath = adminOnlyPaths.some(adminPath => 
            path === adminPath || path.startsWith(`${adminPath}/`)
          )
          
          if (isAdminPath) {
            // 직원 정보 확인
            const { data: employee } = await supabase
              .from("employees")
              .select("position")
              .eq("auth_id", session.user.id)
              .single()
            
            // 원장이나 부원장이 아니면 대시보드로 리다이렉트
            if (!employee || (employee.position !== "원장" && employee.position !== "부원장")) {
              return NextResponse.redirect(new URL("/dashboard", request.url))
            }
          }
        } else {
          // 승인되지 않은 상태 - 승인 대기 페이지로
          return NextResponse.redirect(new URL("/pending-approval", request.url))
        }
      }
    } catch (error) {
      // 데이터베이스 오류 시 승인 대기 페이지로 이동
      return NextResponse.redirect(new URL("/pending-approval", request.url))
    }
  }

  // 기본 응답
  return res
}

// 미들웨어가 실행될 경로 지정 - 승인 대기 페이지도 포함
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
  ],
}
