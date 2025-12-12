/**
 * B2B SaaS Feature 1: 퍼널 병목 분석 API
 * GET /api/funnel/bottlenecks - 병목 구간 조회
 */

import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/auth/server"
import { getBottlenecks } from "@/services/funnel-service"

export async function GET() {
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

    const bottlenecks = await getBottlenecks(supabase)

    return NextResponse.json({
      success: true,
      data: bottlenecks,
    })

  } catch (error) {
    console.error("[API] /api/funnel/bottlenecks error:", error)
    return NextResponse.json(
      { error: "병목 분석 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}
