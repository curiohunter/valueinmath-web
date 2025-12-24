/**
 * B2B SaaS Feature 1: 퍼널 병목 분석 API
 * GET /api/funnel/bottlenecks - 병목 구간 조회 (상세 인사이트 포함)
 */

import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/auth/server"
import { getBottlenecks } from "@/services/funnel-service"

export interface BottleneckDetail {
  stage: string
  studentCount: number
  avgConsultations: number
  avgPhone: number
  avgText: number
  avgVisit: number
  avgDaysSinceLastContact: number | null
  dropoutRate: number
}

export interface StageDuration {
  fromStage: string | null
  toStage: string
  count: number
  avgDays: number
}

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

    // 기존 병목 분석
    const bottlenecks = await getBottlenecks(supabase)

    // 상세 인사이트 조회
    const { data: details, error: detailsError } = await supabase.rpc('get_bottleneck_details')

    let stageDetails: BottleneckDetail[] = []
    if (!detailsError && details) {
      stageDetails = details.map((d: {
        stage: string
        student_count: number
        avg_consultations: string | null
        avg_phone: string | null
        avg_text: string | null
        avg_visit: string | null
        avg_days_since_last_contact: string | null
        dropout_rate: string | null
      }) => ({
        stage: d.stage,
        studentCount: d.student_count,
        avgConsultations: parseFloat(d.avg_consultations || '0'),
        avgPhone: parseFloat(d.avg_phone || '0'),
        avgText: parseFloat(d.avg_text || '0'),
        avgVisit: parseFloat(d.avg_visit || '0'),
        avgDaysSinceLastContact: d.avg_days_since_last_contact ? parseFloat(d.avg_days_since_last_contact) : null,
        dropoutRate: parseFloat(d.dropout_rate || '0'),
      }))
    }

    // 등록 성공 패턴 (비교용)
    const successPattern = stageDetails.find(d => d.stage === '등록완료')

    // 구간별 평균 소요일 (funnel_events에서 조회)
    const { data: stageDurations } = await supabase
      .from('funnel_events')
      .select('from_stage, to_stage, days_since_previous')
      .not('days_since_previous', 'is', null)

    // 구간별 집계
    const durationMap = new Map<string, { total: number; count: number }>()
    if (stageDurations) {
      for (const event of stageDurations) {
        const key = `${event.from_stage || 'NULL'}→${event.to_stage}`
        const existing = durationMap.get(key) || { total: 0, count: 0 }
        existing.total += event.days_since_previous || 0
        existing.count += 1
        durationMap.set(key, existing)
      }
    }

    const stageDurationData: StageDuration[] = Array.from(durationMap.entries()).map(([key, value]) => {
      const [from, to] = key.split('→')
      return {
        fromStage: from === 'NULL' ? null : from,
        toStage: to,
        count: value.count,
        avgDays: Math.round((value.total / value.count) * 10) / 10,
      }
    }).sort((a, b) => b.count - a.count)

    return NextResponse.json({
      success: true,
      data: bottlenecks,
      details: stageDetails,
      successPattern,
      stageDurations: stageDurationData,
    })

  } catch (error) {
    console.error("[API] /api/funnel/bottlenecks error:", error)
    return NextResponse.json(
      { error: "병목 분석 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}
