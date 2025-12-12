/**
 * B2B SaaS Feature 1: 리드 소스별 퍼널 분석 API
 * GET /api/funnel/by-source - 리드 소스별 전환율
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/auth/server"
import { getFunnelByLeadSource } from "@/services/funnel-service"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: "인증이 필요합니다" },
        { status: 401 }
      )
    }

    // 쿼리 파라미터에서 소스 추출
    const { searchParams } = new URL(request.url)
    const source = searchParams.get("source")

    if (!source) {
      return NextResponse.json(
        { error: "리드 소스를 지정해주세요" },
        { status: 400 }
      )
    }

    const metrics = await getFunnelByLeadSource(supabase, source)

    return NextResponse.json({
      success: true,
      data: metrics,
    })

  } catch (error) {
    console.error("[API] /api/funnel/by-source error:", error)
    return NextResponse.json(
      { error: "리드 소스별 분석 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}
