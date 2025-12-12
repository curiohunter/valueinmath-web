/**
 * B2B SaaS Feature 1: 퍼널 체류일수 업데이트 API
 * POST /api/funnel/update-days - 배치 업데이트 (Cron Job용)
 */

import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/auth/server"
import { updateFunnelDaysInFunnel } from "@/services/funnel-service"

export async function POST() {
  try {
    const supabase = await createServerClient()

    // 인증 확인 (Cron Job에서는 service_role 사용 필요)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: "인증이 필요합니다" },
        { status: 401 }
      )
    }

    const result = await updateFunnelDaysInFunnel(supabase)

    return NextResponse.json({
      success: true,
      updated: result.updated,
      message: `${result.updated}명의 학생 퍼널 체류일수가 업데이트되었습니다.`,
    })

  } catch (error) {
    console.error("[API] /api/funnel/update-days error:", error)
    return NextResponse.json(
      { error: "퍼널 체류일수 업데이트 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}
