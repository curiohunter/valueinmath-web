/**
 * Marketing Activities API
 * GET /api/marketing/activities - 마케팅 활동 목록 조회
 * POST /api/marketing/activities - 마케팅 활동 생성
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/auth/server"
import {
  createMarketingActivity,
  getMarketingActivities,
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
    const channel = searchParams.get("channel") as MarketingChannel | null
    const status = searchParams.get("status") as MarketingStatus | null
    const activityDateFrom = searchParams.get("activity_date_from")
    const activityDateTo = searchParams.get("activity_date_to")

    // 유효성 검사
    if (channel && !VALID_CHANNELS.includes(channel)) {
      return NextResponse.json(
        { error: `유효하지 않은 채널입니다. 가능한 값: ${VALID_CHANNELS.join(', ')}` },
        { status: 400 }
      )
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `유효하지 않은 상태입니다. 가능한 값: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    const activities = await getMarketingActivities(supabase, {
      channel: channel || undefined,
      status: status || undefined,
      activityDateFrom: activityDateFrom || undefined,
      activityDateTo: activityDateTo || undefined,
    })

    return NextResponse.json({
      success: true,
      data: activities,
      count: activities.length,
    })
  } catch (error) {
    console.error("[API] /api/marketing/activities GET error:", error)
    return NextResponse.json(
      { error: "마케팅 활동 목록 조회 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

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
    if (!body.channel) {
      return NextResponse.json(
        { error: "channel은 필수입니다" },
        { status: 400 }
      )
    }

    if (!body.title) {
      return NextResponse.json(
        { error: "title은 필수입니다" },
        { status: 400 }
      )
    }

    if (!body.activityDate) {
      return NextResponse.json(
        { error: "activityDate은 필수입니다" },
        { status: 400 }
      )
    }

    // 채널 유효성 검사
    if (!VALID_CHANNELS.includes(body.channel)) {
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

    const result = await createMarketingActivity(supabase, {
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
      createdBy: employee?.id,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      id: result.id,
    })
  } catch (error) {
    console.error("[API] /api/marketing/activities POST error:", error)
    return NextResponse.json(
      { error: "마케팅 활동 생성 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}
