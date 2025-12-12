/**
 * B2B SaaS Feature 2: 위험 알림 API
 * GET /api/risk-alerts - 활성 알림 목록
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/auth/server"
import { getActiveAlerts } from "@/services/risk-batch-service"
import type { RiskAlertSeverity } from "@/types/b2b-saas"

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
    const severity = searchParams.get("severity") as RiskAlertSeverity | null
    const limit = searchParams.get("limit")

    const result = await getActiveAlerts(supabase, {
      severity: severity || undefined,
      limit: limit ? parseInt(limit) : undefined,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    })

  } catch (error) {
    console.error("[API] /api/risk-alerts error:", error)
    return NextResponse.json(
      { error: "위험 알림 조회 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}
