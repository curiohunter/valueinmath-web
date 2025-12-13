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
  // 2025년 9월 이후 첫상담 학생만 (데이터 완전성 기준)
  // students.status 기준으로 퍼널 단계 판단 (리드소스별과 동일한 기준)
  const { data: students } = await supabase
    .from('students')
    .select('id, status, start_date')
    .gte('first_contact_date', '2025-09-01')

  if (!students?.length) return []

  // status 기준 단계 매핑
  // 1: 첫상담 (신규상담, 테스트예정, 미등록-테스트안봄)
  // 2: 테스트완료 (결과상담대기, 결과상담완료, 등록유도, 미등록-테스트봄)
  // 3: 등록완료 (재원/휴원/퇴원 + start_date 있음)
  const statusToStage: Record<string, number> = {
    '신규상담': 1,
    '테스트예정': 1,
    '결과상담대기': 2,
    '결과상담완료': 2,
    '등록유도': 2,
    '재원': 3,
    '휴원': 3,
    '퇴원': 3,
    '미등록': 1, // 기본값, 테스트 여부에 따라 변경
  }

  // 미등록 학생 중 테스트 완료한 학생 ID 조회 필요
  const studentIds = students.map(s => s.id)
  const { data: testEvents } = await supabase
    .from('funnel_events')
    .select('student_id')
    .in('student_id', studentIds)
    .eq('event_type', 'test_completed')

  const testedStudentIds = new Set(testEvents?.map(e => e.student_id) || [])

  // 각 단계별 도달 학생 수 (해당 단계 이상 도달한 학생 수)
  const stageCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0 }

  students.forEach(s => {
    let maxStage = statusToStage[s.status] || 1

    // 미등록이지만 테스트를 본 경우 stage 2
    if (s.status === '미등록' && testedStudentIds.has(s.id)) {
      maxStage = 2
    }

    // 재원/휴원/퇴원이라도 start_date가 없으면 등록 미완료
    if (maxStage === 3 && !s.start_date) {
      maxStage = 2
    }

    // 해당 단계 이상 도달한 것으로 카운트
    for (let i = 1; i <= maxStage; i++) {
      stageCounts[i]++
    }
  })

  // 퍼널 단계 정의 (실제 비즈니스 흐름)
  const funnelSteps = [
    { level: 1, name: '첫 상담', nextName: '입학테스트' },
    { level: 2, name: '입학테스트', nextName: '등록완료' },
  ]

  const bottlenecks: FunnelBottleneck[] = []

  for (const step of funnelSteps) {
    const currentCount = stageCounts[step.level] || 0
    const nextCount = stageCounts[step.level + 1] || 0

    // 전환율 계산 (현재 단계 도달 학생 중 다음 단계로 진행한 비율)
    const conversionRate = currentCount > 0 ? (nextCount / currentCount) * 100 : 0
    const dropOffRate = 100 - conversionRate

    bottlenecks.push({
      stage: `${step.name} → ${step.nextName}`,
      dropOffRate: Math.round(dropOffRate * 10) / 10,
      avgDaysStuck: 0, // 평균 체류일은 별도 분석 필요
    })
  }

  return bottlenecks.sort((a, b) => b.dropOffRate - a.dropOffRate)
}

// ============================================
// 리드 소스별 퍼널 분석
// ============================================

export interface LeadSourceFunnelMetrics {
  source: string
  firstContacts: number      // 첫 상담 수
  tests: number              // 테스트 완료 수
  enrollments: number        // 등록 완료 수
  conversionRate: number     // 최종 전환율 (첫상담→등록)
  testRate: number           // 테스트 전환율 (첫상담→테스트)
  avgDaysToEnroll: number | null   // 첫상담→등록 평균 소요일
  avgConsultations: number | null  // 등록까지 평균 상담 횟수
}

// 리드 소스 정렬 순서 (연관 있는 것끼리 그룹핑)
const LEAD_SOURCE_ORDER: Record<string, number> = {
  // 온라인 채널
  '블로그': 1,
  '맘까페': 2,
  '입소문': 3,
  // 직접 문의
  '전화상담': 10,
  '오프라인': 11,
  // 원내 추천
  '원내친구추천': 20,
  '원내학부모추천': 21,
  // 원외 추천
  '원외친구추천': 30,
  '원외학부모추천': 31,
  // 기타
  '형제': 40,
}

export async function getAllLeadSourceMetrics(
  supabase: SupabaseClient
): Promise<LeadSourceFunnelMetrics[]> {
  // DB에서 한 번에 집계 (2025년 9월 이후 첫상담 학생 기준)
  const { data, error } = await supabase.rpc('get_lead_source_funnel_metrics')

  if (error) {
    console.error('[FunnelService] getAllLeadSourceMetrics error:', error)
    // Fallback: 기존 방식으로 조회
    return getAllLeadSourceMetricsFallback(supabase)
  }

  if (!data?.length) return []

  // 정렬 및 변환
  const metrics: LeadSourceFunnelMetrics[] = data.map((row: {
    lead_source: string
    first_contacts: number
    tests: number
    enrollments: number
    avg_days_to_enroll: number | null
    avg_consultations: number | null
  }) => ({
    source: row.lead_source,
    firstContacts: row.first_contacts,
    tests: row.tests,
    enrollments: row.enrollments,
    conversionRate: row.first_contacts > 0
      ? Math.round((row.enrollments / row.first_contacts) * 1000) / 10
      : 0,
    testRate: row.first_contacts > 0
      ? Math.round((row.tests / row.first_contacts) * 1000) / 10
      : 0,
    avgDaysToEnroll: row.avg_days_to_enroll,
    avgConsultations: row.avg_consultations,
  }))

  // 정렬
  metrics.sort((a, b) => {
    const orderA = LEAD_SOURCE_ORDER[a.source] ?? 99
    const orderB = LEAD_SOURCE_ORDER[b.source] ?? 99
    return orderA - orderB
  })

  return metrics
}

// RPC 함수가 없을 경우 fallback
async function getAllLeadSourceMetricsFallback(
  supabase: SupabaseClient
): Promise<LeadSourceFunnelMetrics[]> {
  // 리드 소스 목록 조회
  const { data: sources } = await supabase
    .from('students')
    .select('lead_source')
    .not('lead_source', 'is', null)
    .gte('first_contact_date', '2025-09-01')

  if (!sources?.length) return []

  const uniqueSources = [...new Set(sources.map(s => s.lead_source))]
  const results: LeadSourceFunnelMetrics[] = []

  for (const source of uniqueSources) {
    const metrics = await getFunnelByLeadSource(supabase, source)
    results.push(metrics)
  }

  // 정렬
  results.sort((a, b) => {
    const orderA = LEAD_SOURCE_ORDER[a.source] ?? 99
    const orderB = LEAD_SOURCE_ORDER[b.source] ?? 99
    return orderA - orderB
  })

  return results
}

export async function getFunnelByLeadSource(
  supabase: SupabaseClient,
  source: string
): Promise<LeadSourceFunnelMetrics> {
  // 해당 소스의 학생 조회 (첫상담, 등록일 포함)
  // 2025년 9월 이후 첫상담 학생만 (데이터 완전성 기준)
  const { data: students } = await supabase
    .from('students')
    .select('id, first_contact_date, start_date, status')
    .eq('lead_source', source)
    .gte('first_contact_date', '2025-09-01')

  if (!students?.length) {
    return {
      source,
      firstContacts: 0,
      tests: 0,
      enrollments: 0,
      conversionRate: 0,
      testRate: 0,
      avgDaysToEnroll: null,
      avgConsultations: null,
    }
  }

  const studentIds = students.map(s => s.id)

  // 이벤트 집계 (테스트 완료 여부 확인용)
  const { data: events } = await supabase
    .from('funnel_events')
    .select('student_id, event_type')
    .in('student_id', studentIds)

  // 상담 횟수 조회
  const { data: consultations } = await supabase
    .from('consultations')
    .select('student_id')
    .in('student_id', studentIds)

  // 첫상담 수 = 해당 소스의 학생 수 (first_contact_date가 있는 학생)
  const firstContacts = students.filter(s => s.first_contact_date).length

  // 테스트 완료한 고유 학생 수
  const testedStudents = new Set(
    events?.filter(e => e.event_type === 'test_completed').map(e => e.student_id) || []
  )
  const tests = testedStudents.size

  // 등록 완료 = 재원 학생 중 start_date가 있는 학생
  const enrolledStudents = students.filter(s => s.status === '재원' && s.start_date)
  const enrollments = enrolledStudents.length

  // 평균 등록 소요일 계산
  let totalDays = 0
  let enrollCountWithDays = 0
  for (const student of enrolledStudents) {
    if (student.first_contact_date && student.start_date) {
      const firstContact = new Date(student.first_contact_date)
      const startDate = new Date(student.start_date)
      const days = Math.floor(
        (startDate.getTime() - firstContact.getTime()) / (1000 * 60 * 60 * 24)
      )
      if (days >= 0) {
        totalDays += days
        enrollCountWithDays++
      }
    }
  }

  // 등록 학생의 평균 상담 횟수
  let totalConsultations = 0
  let consultationCount = 0
  for (const student of enrolledStudents) {
    const count = consultations?.filter(c => c.student_id === student.id).length || 0
    if (count > 0) {
      totalConsultations += count
      consultationCount++
    }
  }

  return {
    source,
    firstContacts,
    tests,
    enrollments,
    conversionRate: firstContacts > 0 ? Math.round((enrollments / firstContacts) * 1000) / 10 : 0,
    testRate: firstContacts > 0 ? Math.round((tests / firstContacts) * 1000) / 10 : 0,
    avgDaysToEnroll: enrollCountWithDays > 0 ? Math.round(totalDays / enrollCountWithDays) : null,
    avgConsultations: consultationCount > 0 ? Math.round((totalConsultations / consultationCount) * 10) / 10 : null,
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
