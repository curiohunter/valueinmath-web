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

    // 심층 분석 데이터 조회
    const [byLeadSourceRes, consultationEffectsRes, aiHurdlePatternsRes] = await Promise.all([
      supabase.rpc('get_bottleneck_by_lead_source'),
      supabase.rpc('get_consultation_effect_analysis'),
      supabase.rpc('get_ai_hurdle_patterns'),
    ])

    // 리드소스별 병목 데이터 변환
    const byLeadSource = (byLeadSourceRes.data || []).map((d: {
      lead_source: string
      stage: string
      total_count: number
      test_count: number
      enroll_count: number
      enroll_after_test_count: number
      direct_enroll_count: number
      drop_off_rate: string
      avg_consultations: string
      avg_days_stuck: string
    }) => ({
      leadSource: d.lead_source,
      stage: d.stage,
      totalCount: d.total_count,
      testCount: d.test_count,
      enrollCount: d.enroll_count,
      enrollAfterTestCount: d.enroll_after_test_count,
      directEnrollCount: d.direct_enroll_count,
      dropOffRate: parseFloat(d.drop_off_rate || '0'),
      avgConsultations: parseFloat(d.avg_consultations || '0'),
      avgDaysStuck: parseFloat(d.avg_days_stuck || '0'),
    }))

    // 상담 효과 데이터 변환
    const consultationEffects = (consultationEffectsRes.data || []).map((d: {
      consultation_type: string
      method: string
      consultation_count: number
      to_test_rate: string
      to_enroll_rate: string
    }) => ({
      consultationType: d.consultation_type,
      method: d.method,
      count: d.consultation_count,
      toTestRate: parseFloat(d.to_test_rate || '0'),
      toEnrollRate: parseFloat(d.to_enroll_rate || '0'),
    }))

    // AI 장애요인 패턴 데이터 변환
    const aiHurdlePatterns = (aiHurdlePatternsRes.data || []).map((d: {
      hurdle: string
      label: string
      hurdle_count: number
      drop_off_rate: string
      avg_days_stuck: string
      suggested_action: string
    }) => ({
      hurdle: d.hurdle,
      label: d.label,
      count: d.hurdle_count,
      dropOffRate: parseFloat(d.drop_off_rate || '0'),
      avgDaysStuck: parseFloat(d.avg_days_stuck || '0'),
      suggestedAction: d.suggested_action,
    }))

    return NextResponse.json({
      success: true,
      data: bottlenecks,
      details: stageDetails,
      successPattern,
      stageDurations: stageDurationData,
      // 심층 분석 데이터
      byLeadSource,
      consultationEffects,
      aiHurdlePatterns,
    })

  } catch (error) {
    console.error("[API] /api/funnel/bottlenecks error:", error)
    return NextResponse.json(
      { error: "병목 분석 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}
