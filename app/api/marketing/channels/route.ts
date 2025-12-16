/**
 * Marketing Channel Metrics API
 * GET /api/marketing/channels - 채널별 전환율 메트릭스 조회
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/auth/server"
import { getChannelMetrics, getAllChannels } from "@/services/marketing-service"

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

    // 쿼리 파라미터
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("start_date")
    const endDate = searchParams.get("end_date")

    const metrics = await getChannelMetrics(supabase, {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    })

    // 전체 합계 계산
    const totals = {
      leads: metrics.reduce((sum, m) => sum + m.leads, 0),
      tests: metrics.reduce((sum, m) => sum + m.tests, 0),
      enrollments: metrics.reduce((sum, m) => sum + m.enrollments, 0),
      totalBudget: metrics.reduce((sum, m) => sum + (m.totalBudget || 0), 0),
    }

    return NextResponse.json({
      success: true,
      data: metrics,
      totals: {
        ...totals,
        leadToTestRate: totals.leads > 0
          ? Math.round((totals.tests / totals.leads) * 1000) / 10
          : 0,
        testToEnrollRate: totals.tests > 0
          ? Math.round((totals.enrollments / totals.tests) * 1000) / 10
          : 0,
        totalConversionRate: totals.leads > 0
          ? Math.round((totals.enrollments / totals.leads) * 1000) / 10
          : 0,
        costPerLead: totals.totalBudget > 0 && totals.leads > 0
          ? Math.round(totals.totalBudget / totals.leads)
          : null,
        costPerEnrollment: totals.totalBudget > 0 && totals.enrollments > 0
          ? Math.round(totals.totalBudget / totals.enrollments)
          : null,
      },
      channels: getAllChannels(),
    })
  } catch (error) {
    console.error("[API] /api/marketing/channels GET error:", error)
    return NextResponse.json(
      { error: "채널 메트릭스 조회 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}
