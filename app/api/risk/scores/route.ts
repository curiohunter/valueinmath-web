/**
 * B2B SaaS Feature 2: 위험 점수 API
 * GET /api/risk/scores - 전체 위험 점수 목록
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/auth/server"
import { getAllRiskScores } from "@/services/risk-batch-service"
import type { RiskLevel } from "@/types/b2b-saas"

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
    const riskLevel = searchParams.get("level") as RiskLevel | null
    const limit = searchParams.get("limit")
    const offset = searchParams.get("offset")

    const result = await getAllRiskScores(supabase, {
      riskLevel: riskLevel || undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
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
      count: result.count,
    })

  } catch (error) {
    console.error("[API] /api/risk/scores error:", error)
    return NextResponse.json(
      { error: "위험 점수 조회 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}
