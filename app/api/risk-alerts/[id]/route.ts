/**
 * B2B SaaS Feature 2: 개별 알림 상태 변경 API
 * POST /api/risk-alerts/:id/acknowledge - 알림 확인
 * POST /api/risk-alerts/:id/resolve - 알림 해결
 * POST /api/risk-alerts/:id/dismiss - 알림 무시
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/auth/server"
import { updateAlertStatus } from "@/services/risk-batch-service"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    // 현재 직원 ID 조회
    const { data: employee } = await supabase
      .from("employees")
      .select("id")
      .eq("auth_id", user.id)
      .eq("status", "재직")
      .single()

    if (!employee) {
      return NextResponse.json(
        { error: "직원 정보를 찾을 수 없습니다" },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { action, note } = body

    // 유효한 액션인지 확인
    const validActions = ['acknowledge', 'resolve', 'dismiss']
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `유효하지 않은 액션입니다. 가능한 값: ${validActions.join(', ')}` },
        { status: 400 }
      )
    }

    const result = await updateAlertStatus(
      supabase,
      id,
      action,
      employee.id,
      note
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `알림이 ${action === 'acknowledge' ? '확인' : action === 'resolve' ? '해결' : '무시'} 처리되었습니다.`,
    })

  } catch (error) {
    console.error("[API] /api/risk-alerts/[id] error:", error)
    return NextResponse.json(
      { error: "알림 상태 변경 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}
