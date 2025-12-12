/**
 * B2B SaaS Feature 1: 퍼널 서비스
 * 리드 퍼널 이벤트 기록 및 전환율 분석
 */

import { SupabaseClient } from '@supabase/supabase-js'
import type { FunnelEventType, FunnelStage } from '@/types/b2b-saas'

// ============================================
// 타입 정의
// ============================================

export interface FunnelMetrics {
  period: string
  consultations: number
  tests: number
  enrollments: number
  consultationToTestRate: number  // %
  testToEnrollmentRate: number    // %
  avgDaysToTest: number
  avgDaysToEnroll: number
}

export interface FunnelBottleneck {
  stage: string
  dropOffRate: number
  avgDaysStuck: number
}

export interface FunnelEventInput {
  studentId: string
  eventType: FunnelEventType
  fromStage?: string
  toStage?: string
  metadata?: Record<string, unknown>
  createdBy?: string
}

// ============================================
// 퍼널 이벤트 기록
// ============================================

export async function recordFunnelEvent(
  supabase: SupabaseClient,
  input: FunnelEventInput
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
    // 1. 이전 이벤트 조회하여 days_since_previous 계산
    const { data: lastEvent } = await supabase
      .from('funnel_events')
      .select('event_date')
      .eq('student_id', input.studentId)
      .order('event_date', { ascending: false })
      .limit(1)
      .single()

    let daysSincePrevious: number | null = null
    if (lastEvent?.event_date) {
      const lastDate = new Date(lastEvent.event_date)
      const now = new Date()
      daysSincePrevious = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
    }

    // 2. 퍼널 이벤트 기록
    const { data, error } = await supabase
      .from('funnel_events')
      .insert({
        student_id: input.studentId,
        event_type: input.eventType,
        from_stage: input.fromStage,
        to_stage: input.toStage,
        days_since_previous: daysSincePrevious,
        metadata: input.metadata || {},
        created_by: input.createdBy,
      })
      .select('id')
      .single()

    if (error) throw error

    // 3. 학생의 funnel_stage 업데이트 (해당하는 경우)
    const stageMapping: Record<string, FunnelStage> = {
      'first_contact': '신규상담',
      'consultation_completed': '신규상담',
      'test_scheduled': '테스트예정',
      'test_completed': '테스트완료',
      'registration_started': '등록유도',
      'registration_completed': '등록완료',
    }

    const newStage = stageMapping[input.eventType]
    if (newStage) {
      await supabase
        .from('students')
        .update({
          funnel_stage: newStage,
          funnel_stage_updated_at: new Date().toISOString(),
        })
        .eq('id', input.studentId)
    }

    return { success: true, eventId: data.id }
  } catch (error) {
    console.error('[FunnelService] recordFunnelEvent error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// ============================================
// 퍼널 메트릭스 조회
// ============================================

export async function getFunnelMetrics(
  supabase: SupabaseClient,
  period: '1month' | '3months' | '6months' | '1year' = '3months'
): Promise<FunnelMetrics> {
  const periodDays = {
    '1month': 30,
    '3months': 90,
    '6months': 180,
    '1year': 365,
  }

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - periodDays[period])

  // 상담 완료 수
  const { count: consultations } = await supabase
    .from('funnel_events')
    .select('*', { count: 'exact', head: true })
    .in('event_type', ['consultation_completed', 'first_contact'])
    .gte('event_date', startDate.toISOString())

  // 테스트 완료 수
  const { count: tests } = await supabase
    .from('funnel_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'test_completed')
    .gte('event_date', startDate.toISOString())

  // 등록 완료 수
  const { count: enrollments } = await supabase
    .from('funnel_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'registration_completed')
    .gte('event_date', startDate.toISOString())

  // 평균 소요 일수 계산
  const { data: testEvents } = await supabase
    .from('funnel_events')
    .select('days_since_previous')
    .eq('event_type', 'test_completed')
    .gte('event_date', startDate.toISOString())
    .not('days_since_previous', 'is', null)

  const { data: enrollEvents } = await supabase
    .from('funnel_events')
    .select('days_since_previous')
    .eq('event_type', 'registration_completed')
    .gte('event_date', startDate.toISOString())
    .not('days_since_previous', 'is', null)

  const avgDaysToTest = testEvents?.length
    ? testEvents.reduce((sum, e) => sum + (e.days_since_previous || 0), 0) / testEvents.length
    : 0

  const avgDaysToEnroll = enrollEvents?.length
    ? enrollEvents.reduce((sum, e) => sum + (e.days_since_previous || 0), 0) / enrollEvents.length
    : 0

  const consultationCount = consultations || 0
  const testCount = tests || 0
  const enrollmentCount = enrollments || 0

  return {
    period,
    consultations: consultationCount,
    tests: testCount,
    enrollments: enrollmentCount,
    consultationToTestRate: consultationCount > 0 ? (testCount / consultationCount) * 100 : 0,
    testToEnrollmentRate: testCount > 0 ? (enrollmentCount / testCount) * 100 : 0,
    avgDaysToTest: Math.round(avgDaysToTest * 10) / 10,
    avgDaysToEnroll: Math.round(avgDaysToEnroll * 10) / 10,
  }
}

// ============================================
// 병목 구간 분석
// ============================================

export async function getBottlenecks(
  supabase: SupabaseClient
): Promise<FunnelBottleneck[]> {
  // 각 단계별 학생 수 조회
  const { data: stageCounts } = await supabase
    .from('students')
    .select('funnel_stage')
    .eq('is_active', true)
    .not('funnel_stage', 'is', null)

  if (!stageCounts) return []

  // 단계별 집계
  const counts: Record<string, number> = {}
  stageCounts.forEach(s => {
    const stage = s.funnel_stage as string
    counts[stage] = (counts[stage] || 0) + 1
  })

  // 퍼널 순서
  const funnelOrder: FunnelStage[] = [
    '신규상담', '테스트예정', '테스트완료', '등록유도', '등록완료', '재원'
  ]

  const bottlenecks: FunnelBottleneck[] = []

  for (let i = 0; i < funnelOrder.length - 1; i++) {
    const currentStage = funnelOrder[i]
    const nextStage = funnelOrder[i + 1]
    const currentCount = counts[currentStage] || 0
    const nextCount = counts[nextStage] || 0

    // 이탈률 계산 (현재 단계에서 다음 단계로 넘어가지 못한 비율)
    const dropOffRate = currentCount > 0
      ? ((currentCount - nextCount) / currentCount) * 100
      : 0

    // 평균 체류 일수 (days_in_funnel 활용)
    const { data: stuckStudents } = await supabase
      .from('students')
      .select('days_in_funnel')
      .eq('funnel_stage', currentStage)
      .eq('is_active', true)

    const avgDaysStuck = stuckStudents?.length
      ? stuckStudents.reduce((sum, s) => sum + (s.days_in_funnel || 0), 0) / stuckStudents.length
      : 0

    bottlenecks.push({
      stage: `${currentStage} → ${nextStage}`,
      dropOffRate: Math.round(dropOffRate * 10) / 10,
      avgDaysStuck: Math.round(avgDaysStuck),
    })
  }

  return bottlenecks.sort((a, b) => b.dropOffRate - a.dropOffRate)
}

// ============================================
// 리드 소스별 퍼널 분석
// ============================================

export async function getFunnelByLeadSource(
  supabase: SupabaseClient,
  source: string
): Promise<FunnelMetrics & { source: string }> {
  // 해당 소스의 학생 ID 조회
  const { data: students } = await supabase
    .from('students')
    .select('id')
    .eq('lead_source', source)

  if (!students?.length) {
    return {
      source,
      period: 'all',
      consultations: 0,
      tests: 0,
      enrollments: 0,
      consultationToTestRate: 0,
      testToEnrollmentRate: 0,
      avgDaysToTest: 0,
      avgDaysToEnroll: 0,
    }
  }

  const studentIds = students.map(s => s.id)

  // 이벤트 집계
  const { data: events } = await supabase
    .from('funnel_events')
    .select('event_type, days_since_previous')
    .in('student_id', studentIds)

  if (!events?.length) {
    return {
      source,
      period: 'all',
      consultations: 0,
      tests: 0,
      enrollments: 0,
      consultationToTestRate: 0,
      testToEnrollmentRate: 0,
      avgDaysToTest: 0,
      avgDaysToEnroll: 0,
    }
  }

  const consultations = events.filter(e =>
    ['consultation_completed', 'first_contact'].includes(e.event_type)
  ).length

  const tests = events.filter(e => e.event_type === 'test_completed').length
  const enrollments = events.filter(e => e.event_type === 'registration_completed').length

  const testEvents = events.filter(e =>
    e.event_type === 'test_completed' && e.days_since_previous
  )
  const enrollEvents = events.filter(e =>
    e.event_type === 'registration_completed' && e.days_since_previous
  )

  const avgDaysToTest = testEvents.length
    ? testEvents.reduce((sum, e) => sum + (e.days_since_previous || 0), 0) / testEvents.length
    : 0

  const avgDaysToEnroll = enrollEvents.length
    ? enrollEvents.reduce((sum, e) => sum + (e.days_since_previous || 0), 0) / enrollEvents.length
    : 0

  return {
    source,
    period: 'all',
    consultations,
    tests,
    enrollments,
    consultationToTestRate: consultations > 0 ? (tests / consultations) * 100 : 0,
    testToEnrollmentRate: tests > 0 ? (enrollments / tests) * 100 : 0,
    avgDaysToTest: Math.round(avgDaysToTest * 10) / 10,
    avgDaysToEnroll: Math.round(avgDaysToEnroll * 10) / 10,
  }
}

// ============================================
// 퍼널 체류일수 업데이트 (배치용)
// ============================================

export async function updateFunnelDaysInFunnel(
  supabase: SupabaseClient
): Promise<{ updated: number }> {
  // funnel_stage가 있고 funnel_stage_updated_at이 있는 학생들의 days_in_funnel 업데이트
  const { data: students } = await supabase
    .from('students')
    .select('id, funnel_stage_updated_at')
    .eq('is_active', true)
    .not('funnel_stage', 'is', null)
    .not('funnel_stage_updated_at', 'is', null)

  if (!students?.length) return { updated: 0 }

  let updated = 0
  const now = new Date()

  for (const student of students) {
    const stageDate = new Date(student.funnel_stage_updated_at)
    const daysInFunnel = Math.floor((now.getTime() - stageDate.getTime()) / (1000 * 60 * 60 * 24))

    const { error } = await supabase
      .from('students')
      .update({ days_in_funnel: daysInFunnel })
      .eq('id', student.id)

    if (!error) updated++
  }

  return { updated }
}
