import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/auth/server"
import { oauth2Client } from "@/lib/google/client"
import { google } from "googleapis"
import type { Database } from "@/types/database"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get("code")
    const error = searchParams.get("error")

    // OAuth 에러 처리
    if (error) {
      console.error("OAuth error:", error)
      return NextResponse.redirect(new URL(`/auth/error?error=${error}`, request.url))
    }

    if (!code) {
      return NextResponse.redirect(new URL("/auth/error?error=missing_code", request.url))
    }

    // 현재 사용자 인증 확인
    const supabase = await createServerClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.redirect(new URL("/auth/error?error=unauthorized", request.url))
    }

    // Authorization code를 토큰으로 교환
    const { tokens } = await oauth2Client.getToken(code)
    
    if (!tokens.access_token) {
      throw new Error("No access token received")
    }

    // OAuth 클라이언트에 토큰 설정
    oauth2Client.setCredentials(tokens)

    // 사용자 정보 조회 (토큰 설정 후)
    let userInfo = null
    try {
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
      userInfo = await oauth2.userinfo.get()
    } catch (userInfoError) {
      console.warn("사용자 정보 조회 실패 (토큰은 정상):", userInfoError)
      // 사용자 정보 조회가 실패해도 토큰이 있으면 계속 진행
    }

    // 밸류인 전용 Google Calendar 연동: 환경변수에 토큰 저장
    // 실제 운영 환경에서는 이 토큰들을 안전한 곳에 저장해야 합니다
    console.log("Google OAuth 토큰 획득 성공:", {
      email: userInfo?.data?.email || "정보 없음",
      access_token: tokens.access_token?.substring(0, 20) + "...",
      refresh_token: tokens.refresh_token ? "있음" : "없음",
      expires_at: tokens.expiry_date
    })

    // 개발 모드에서는 토큰 정보를 로그로 출력
    if (process.env.NODE_ENV === 'development') {
      console.log("\n=== Google OAuth 토큰 정보 ===")
      console.log("다음 값들을 .env.local에 추가하세요:")
      console.log(`GOOGLE_ACCESS_TOKEN=${tokens.access_token}`)
      if (tokens.refresh_token) {
        console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`)
      }
      if (tokens.expiry_date) {
        console.log(`GOOGLE_TOKEN_EXPIRES_AT=${new Date(tokens.expiry_date).toISOString()}`)
      }
      console.log("===============================\n")
    }

    // 프로필 업데이트 (연동 상태 기록)
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        updated_at: new Date().toISOString()
      } as any) // 데이터베이스 타입 복잡성으로 인한 타입 캐스팅
      // @ts-ignore - Supabase 타입 복잡성 해결을 위한 임시 처리
      .eq("id", session.user.id)

    if (updateError) {
      console.error("프로필 업데이트 실패:", updateError)
    }

    // 성공 시 스케줄 페이지로 리다이렉트
    return NextResponse.redirect(new URL("/schedule", request.url))

  } catch (error) {
    console.error("OAuth 콜백 처리 중 오류:", error)
    console.error("에러 상세:", error instanceof Error ? error.message : String(error))
    console.error("에러 스택:", error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.redirect(
      new URL("/auth/error?error=callback_failed", request.url)
    )
  }
}