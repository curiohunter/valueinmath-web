/**
 * B2B SaaS Feature 1: 퍼널 이벤트 기록 API
 * POST /api/funnel/events - 이벤트 기록
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/auth/server"
import { recordFunnelEvent, type FunnelEventInput } from "@/services/funnel-service"

export async function POST(request: NextRequest) {
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

    // 요청 바디 파싱
    const body = await request.json()

    // 필수 필드 검증
    if (!body.studentId || !body.eventType) {
      return NextResponse.json(
        { error: "studentId와 eventType은 필수입니다" },
        { status: 400 }
      )
    }

    // 유효한 이벤트 타입 검증
    const validEventTypes = [
      'first_contact',
      'consultation_scheduled',
      'consultation_completed',
      'test_scheduled',
      'test_completed',
      'registration_started',
      'registration_completed',
      'dropped_off',
    ]

    if (!validEventTypes.includes(body.eventType)) {
      return NextResponse.json(
        { error: `유효하지 않은 이벤트 타입입니다. 가능한 값: ${validEventTypes.join(', ')}` },
        { status: 400 }
      )
    }

    const input: FunnelEventInput = {
      studentId: body.studentId,
      eventType: body.eventType,
      fromStage: body.fromStage,
      toStage: body.toStage,
      metadata: body.metadata,
      createdBy: employee?.id,
    }

    const result = await recordFunnelEvent(supabase, input)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      eventId: result.eventId,
    })

  } catch (error) {
    console.error("[API] /api/funnel/events error:", error)
    return NextResponse.json(
      { error: "퍼널 이벤트 기록 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}
