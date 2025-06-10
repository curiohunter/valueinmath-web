import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  // 현재 URL 경로
  const path = request.nextUrl.pathname

  // 응답 객체 생성
  const res = NextResponse.next()

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
    "/chat",
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

  // 2. 인증이 필요한 경로에 접근하려는데 로그인되지 않은 경우
  const isAuthRequired = authRequiredPaths.some((authPath) => path === authPath || path.startsWith(`${authPath}/`))

  if (isAuthRequired && !session) {
    const redirectUrl = new URL("/login", request.url)
    redirectUrl.searchParams.set("redirect", path)
    return NextResponse.redirect(redirectUrl)
  }

  // 기본 응답
  return res
}

// 미들웨어가 실행될 경로 지정 - 인증이 필요한 경로와 루트 경로만 포함
export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/students/:path*",
    "/employees/:path*",
    "/chat/:path*",
    "/schedule/:path*",
    "/learning/:path*",
    "/analytics/:path*",
    "/settings/:path*",
    "/admin/:path*",
  ],
}
