/**
 * Marketing Activity Detail API
 * GET /api/marketing/activities/[id] - 개별 마케팅 활동 조회
 * PATCH /api/marketing/activities/[id] - 마케팅 활동 수정
 * DELETE /api/marketing/activities/[id] - 마케팅 활동 삭제
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/auth/server"
import {
  getMarketingActivityById,
  updateMarketingActivity,
  deleteMarketingActivity,
  type MarketingChannel,
  type MarketingStatus,
} from "@/services/marketing-service"

// 유효한 채널 목록 (DB marketing_channel ENUM과 일치)
const VALID_CHANNELS: MarketingChannel[] = [
  'blog_naver',
  'blog_other',
  'instagram',
  'youtube',
  'cafe_naver',
  'cafe_other',
  'kakao_channel',
  'paid_ads',
  'seminar',
  'student_event',
  'parent_event',
  'referral',
  'flyer',
  'seasonal_campaign',
  'partnership',
  'other',
]

// DB marketing_status ENUM과 일치
const VALID_STATUSES: MarketingStatus[] = ['planned', 'in_progress', 'completed', 'cancelled']

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const supabase = await createServerClient()
    const { id } = await context.params

    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: "인증이 필요합니다" },
        { status: 401 }
      )
    }

    const activity = await getMarketingActivityById(supabase, id)

    if (!activity) {
      return NextResponse.json(
        { error: "마케팅 활동을 찾을 수 없습니다" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: activity,
    })
  } catch (error) {
    console.error("[API] /api/marketing/activities/[id] GET error:", error)
    return NextResponse.json(
      { error: "마케팅 활동 조회 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const supabase = await createServerClient()
    const { id } = await context.params

    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: "인증이 필요합니다" },
        { status: 401 }
      )
    }

    // 요청 바디 파싱
    const body = await request.json()

    // 채널 유효성 검사 (선택적)
    if (body.channel && !VALID_CHANNELS.includes(body.channel)) {
      return NextResponse.json(
        { error: `유효하지 않은 채널입니다. 가능한 값: ${VALID_CHANNELS.join(', ')}` },
        { status: 400 }
      )
    }

    // 상태 유효성 검사 (선택적)
    if (body.status && !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { error: `유효하지 않은 상태입니다. 가능한 값: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    const result = await updateMarketingActivity(supabase, id, {
      channel: body.channel,
      title: body.title,
      description: body.description,
      activityDate: body.activityDate,
      costAmount: body.costAmount,
      contentUrl: body.contentUrl,
      targetSchoolTypes: body.targetSchoolTypes,
      targetGrades: body.targetGrades,
      reachCount: body.reachCount,
      status: body.status,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error("[API] /api/marketing/activities/[id] PATCH error:", error)
    return NextResponse.json(
      { error: "마케팅 활동 수정 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const supabase = await createServerClient()
    const { id } = await context.params

    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: "인증이 필요합니다" },
        { status: 401 }
      )
    }

    const result = await deleteMarketingActivity(supabase, id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error("[API] /api/marketing/activities/[id] DELETE error:", error)
    return NextResponse.json(
      { error: "마케팅 활동 삭제 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}
