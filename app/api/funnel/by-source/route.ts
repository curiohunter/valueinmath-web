/**
 * B2B SaaS Feature 1: 리드 소스별 퍼널 분석 API
 * GET /api/funnel/by-source - 리드 소스별 전환율 (합계 포함)
 * GET /api/funnel/by-source?source=블로그 - 특정 소스만 조회
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/auth/server"
import { getAllLeadSourceMetrics, getFunnelByLeadSource } from "@/services/funnel-service"

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

    // 특정 소스 지정 시 단일 조회
    if (source) {
      const metrics = await getFunnelByLeadSource(supabase, source)
      return NextResponse.json({
        success: true,
        data: metrics,
      })
    }

    // 소스 미지정 시 모든 리드 소스별 집계 (DB에서 한 번에)
    const allMetrics = await getAllLeadSourceMetrics(supabase)

    // 합계 계산
    const totals = allMetrics.reduce(
      (acc, m) => {
        acc.firstContacts += m.firstContacts
        acc.tests += m.tests
        acc.enrollments += m.enrollments
        if (m.avgDaysToEnroll !== null) {
          acc.totalDays += m.avgDaysToEnroll * m.enrollments
          acc.daysCount += m.enrollments
        }
        if (m.avgConsultations !== null) {
          acc.totalConsultations += m.avgConsultations * m.enrollments
          acc.consultationsCount += m.enrollments
        }
        return acc
      },
      { firstContacts: 0, tests: 0, enrollments: 0, totalDays: 0, daysCount: 0, totalConsultations: 0, consultationsCount: 0 }
    )

    const summary = {
      source: '합계',
      firstContacts: totals.firstContacts,
      tests: totals.tests,
      enrollments: totals.enrollments,
      conversionRate: totals.firstContacts > 0
        ? Math.round((totals.enrollments / totals.firstContacts) * 1000) / 10
        : 0,
      testRate: totals.firstContacts > 0
        ? Math.round((totals.tests / totals.firstContacts) * 1000) / 10
        : 0,
      avgDaysToEnroll: totals.daysCount > 0
        ? Math.round(totals.totalDays / totals.daysCount)
        : null,
      avgConsultations: totals.consultationsCount > 0
        ? Math.round((totals.totalConsultations / totals.consultationsCount) * 10) / 10
        : null,
    }

    return NextResponse.json({
      success: true,
      data: allMetrics,
      summary,
    })

  } catch (error) {
    console.error("[API] /api/funnel/by-source error:", error)
    return NextResponse.json(
      { error: "리드 소스별 분석 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}
