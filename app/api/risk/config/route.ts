/**
 * B2B SaaS Feature 2: 위험 설정 API
 * GET /api/risk/config - 설정 조회
 * PUT /api/risk/config - 설정 변경
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/auth/server"
import { getRiskConfig, updateRiskConfig } from "@/services/risk-batch-service"

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

    const result = await getRiskConfig(supabase)

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
    console.error("[API] /api/risk/config GET error:", error)
    return NextResponse.json(
      { error: "설정 조회 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
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

    const body = await request.json()
    const { configKey, configValue } = body

    if (!configKey || configValue === undefined) {
      return NextResponse.json(
        { error: "configKey와 configValue는 필수입니다" },
        { status: 400 }
      )
    }

    // 유효한 설정 키인지 확인
    const validKeys = ['score_weights', 'thresholds', 'alert_triggers', 'analysis_period_days']
    if (!validKeys.includes(configKey)) {
      return NextResponse.json(
        { error: `유효하지 않은 설정 키입니다. 가능한 값: ${validKeys.join(', ')}` },
        { status: 400 }
      )
    }

    const result = await updateRiskConfig(
      supabase,
      configKey,
      configValue,
      employee.id
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "설정이 업데이트되었습니다.",
    })

  } catch (error) {
    console.error("[API] /api/risk/config PUT error:", error)
    return NextResponse.json(
      { error: "설정 변경 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}
