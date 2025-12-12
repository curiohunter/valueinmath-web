/**
 * B2B SaaS Feature 1: 퍼널 메트릭스 API
 * GET /api/funnel/metrics - 전환율 조회
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/auth/server"
import { getFunnelMetrics } from "@/services/funnel-service"

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

    // 쿼리 파라미터에서 기간 추출
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") as "1month" | "3months" | "6months" | "1year" | null

    const metrics = await getFunnelMetrics(
      supabase,
      period || "3months"
    )

    return NextResponse.json({
      success: true,
      data: metrics,
    })

  } catch (error) {
    console.error("[API] /api/funnel/metrics error:", error)
    return NextResponse.json(
      { error: "퍼널 메트릭스 조회 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}
