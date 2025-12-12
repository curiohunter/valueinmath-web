/**
 * B2B SaaS Feature 2: 개별 학생 위험 점수 API
 * GET /api/risk/scores/:studentId - 개별 학생 점수
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/auth/server"
import { getStudentRiskScore } from "@/services/risk-batch-service"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
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

    const { studentId } = await params

    const result = await getStudentRiskScore(supabase, studentId)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    })

  } catch (error) {
    console.error("[API] /api/risk/scores/[studentId] error:", error)
    return NextResponse.json(
      { error: "위험 점수 조회 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}
