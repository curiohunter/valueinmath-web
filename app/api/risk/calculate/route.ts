/**
 * B2B SaaS Feature 2: 위험 점수 배치 계산 API
 * POST /api/risk/calculate - 배치 실행 (Cron Job 또는 수동)
 *
 * ⚠️ 주의: 이 API는 Cron Job 또는 관리자에 의해 수동으로만 실행되어야 합니다.
 * 일반 사용자가 자주 호출하면 성능에 영향을 줄 수 있습니다.
 */

import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/auth/server"
import { runRiskCalculationBatch } from "@/services/risk-batch-service"

export async function POST() {
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

    // 배치 실행
    const result = await runRiskCalculationBatch(supabase)

    return NextResponse.json({
      success: true,
      data: result,
      message: `${result.updated}명의 학생 위험 점수가 계산되었습니다. 알림 ${result.alertsCreated}개 생성.`,
    })

  } catch (error) {
    console.error("[API] /api/risk/calculate error:", error)
    return NextResponse.json(
      { error: "위험 점수 계산 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}
