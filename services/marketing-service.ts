/**
 * Marketing Intelligence Service
 * 마케팅 활동 기록 및 채널 전환율 분석
 */

import { SupabaseClient } from '@supabase/supabase-js'

// ============================================
// 타입 정의
// ============================================

// DB marketing_channel ENUM과 일치
export type MarketingChannel =
  | 'blog_naver'
  | 'blog_other'
  | 'instagram'
  | 'youtube'
  | 'cafe_naver'
  | 'cafe_other'
  | 'kakao_channel'
  | 'paid_ads'
  | 'seminar'
  | 'student_event'
  | 'parent_event'
  | 'referral'
  | 'flyer'
  | 'seasonal_campaign'
  | 'partnership'
  | 'other'

// DB marketing_status ENUM과 일치
export type MarketingStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled'

export type AttributionType = 'first_touch' | 'last_touch' | 'ai_inferred' | 'multi_touch'

export interface MarketingActivityInput {
  channel: MarketingChannel
  title: string
  description?: string
  activityDate: string  // DB: activity_date
  costAmount?: number   // DB: cost_amount
  contentUrl?: string   // DB: content_url
  targetSchoolTypes?: string[]  // DB: target_school_types
  targetGrades?: number[]       // DB: target_grades
  reachCount?: number   // DB: reach_count
  status?: MarketingStatus
  createdBy?: string
  // 보상 플래그
  hasTuitionReward?: boolean
  hasCashReward?: boolean
}

export interface MarketingActivity {
  id: string
  channel: MarketingChannel
  title: string
  description: string | null
  activity_date: string
  status: MarketingStatus
  content_url: string | null
  target_school_types: string[] | null
  target_grades: number[] | null
  cost_amount: number | null
  reach_count: number | null
  ai_effectiveness_score: number | null
  ai_insights: Record<string, unknown> | null
  has_tuition_reward: boolean
  has_cash_reward: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface MarketingAttribution {
  id: string
  student_id: string
  activity_id: string | null
  attribution_type: AttributionType
  touched_at: string | null
  converted_at: string | null
  conversion_type: string | null
  source: string
  confidence_score: number | null
  created_at: string
}

export interface ChannelMetrics {
  channel: MarketingChannel
  channelLabel: string
  leads: number
  tests: number
  enrollments: number
  leadToTestRate: number
  testToEnrollRate: number
  totalConversionRate: number
  totalBudget: number | null
  costPerLead: number | null
  costPerEnrollment: number | null
}

// 채널 한글 라벨 매핑
const CHANNEL_LABELS: Record<MarketingChannel, string> = {
  'blog_naver': '네이버 블로그',
  'blog_other': '기타 블로그',
  'instagram': '인스타그램',
  'youtube': '유튜브',
  'cafe_naver': '네이버 카페',
  'cafe_other': '기타 카페',
  'kakao_channel': '카카오 채널',
  'paid_ads': '유료 광고',
  'seminar': '설명회',
  'student_event': '학생 이벤트',
  'parent_event': '학부모 이벤트',
  'referral': '추천',
  'flyer': '전단지/현수막',
  'seasonal_campaign': '시즌 캠페인',
  'partnership': '제휴',
  'other': '기타',
}

// lead_source → channel 매핑 (기존 데이터 호환)
const LEAD_SOURCE_TO_CHANNEL: Record<string, MarketingChannel> = {
  '블로그': 'blog_naver',
  '맘까페': 'cafe_naver',
  '입소문': 'referral',
  '전화상담': 'other',
  '오프라인': 'flyer',
  '원내친구추천': 'referral',
  '원내학부모추천': 'referral',
  '원외친구추천': 'referral',
  '원외학부모추천': 'referral',
  '형제': 'referral',
  '설명회': 'seminar',
  '체험수업': 'student_event',
}

// ============================================
// 마케팅 활동 CRUD
// ============================================

export async function createMarketingActivity(
  supabase: SupabaseClient,
  input: MarketingActivityInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('marketing_activities')
      .insert({
        channel: input.channel,
        title: input.title,
        description: input.description || null,
        activity_date: input.activityDate,
        cost_amount: input.costAmount || null,
        content_url: input.contentUrl || null,
        target_school_types: input.targetSchoolTypes || null,
        target_grades: input.targetGrades || null,
        reach_count: input.reachCount || null,
        status: input.status || 'in_progress',
        created_by: input.createdBy || null,
        has_tuition_reward: input.hasTuitionReward || false,
        has_cash_reward: input.hasCashReward || false,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[MarketingService] createMarketingActivity Supabase error:', JSON.stringify(error, null, 2))
      return { success: false, error: error.message || error.code || 'Database error' }
    }

    return { success: true, id: data.id }
  } catch (error) {
    console.error('[MarketingService] createMarketingActivity error:', JSON.stringify(error, null, 2))
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function updateMarketingActivity(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<MarketingActivityInput>
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: Record<string, unknown> = {}

    if (updates.channel !== undefined) updateData.channel = updates.channel
    if (updates.title !== undefined) updateData.title = updates.title
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.activityDate !== undefined) updateData.activity_date = updates.activityDate
    if (updates.costAmount !== undefined) updateData.cost_amount = updates.costAmount
    if (updates.contentUrl !== undefined) updateData.content_url = updates.contentUrl
    if (updates.targetSchoolTypes !== undefined) updateData.target_school_types = updates.targetSchoolTypes
    if (updates.targetGrades !== undefined) updateData.target_grades = updates.targetGrades
    if (updates.reachCount !== undefined) updateData.reach_count = updates.reachCount
    if (updates.status !== undefined) updateData.status = updates.status
    if (updates.hasTuitionReward !== undefined) updateData.has_tuition_reward = updates.hasTuitionReward
    if (updates.hasCashReward !== undefined) updateData.has_cash_reward = updates.hasCashReward

    const { error } = await supabase
      .from('marketing_activities')
      .update(updateData)
      .eq('id', id)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('[MarketingService] updateMarketingActivity error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function deleteMarketingActivity(
  supabase: SupabaseClient,
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('marketing_activities')
      .delete()
      .eq('id', id)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('[MarketingService] deleteMarketingActivity error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function getMarketingActivities(
  supabase: SupabaseClient,
  options?: {
    channel?: MarketingChannel
    status?: MarketingStatus
    activityDateFrom?: string
    activityDateTo?: string
  }
): Promise<MarketingActivity[]> {
  try {
    let query = supabase
      .from('marketing_activities')
      .select('*')
      .order('activity_date', { ascending: false })

    if (options?.channel) {
      query = query.eq('channel', options.channel)
    }
    if (options?.status) {
      query = query.eq('status', options.status)
    }
    if (options?.activityDateFrom) {
      query = query.gte('activity_date', options.activityDateFrom)
    }
    if (options?.activityDateTo) {
      query = query.lte('activity_date', options.activityDateTo)
    }

    const { data, error } = await query

    if (error) {
      console.error('[MarketingService] getMarketingActivities Supabase error:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('[MarketingService] getMarketingActivities error:', JSON.stringify(error, null, 2))
    return []
  }
}

export async function getMarketingActivityById(
  supabase: SupabaseClient,
  id: string
): Promise<MarketingActivity | null> {
  try {
    const { data, error } = await supabase
      .from('marketing_activities')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('[MarketingService] getMarketingActivityById error:', error)
    return null
  }
}

// ============================================
// 마케팅 어트리뷰션 (학생 연결)
// ============================================

export async function createMarketingAttribution(
  supabase: SupabaseClient,
  input: {
    studentId: string
    activityId?: string
    attributionType: AttributionType
    touchedAt?: string
    convertedAt?: string
    conversionType?: string
    source?: string
    confidenceScore?: number
  }
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('marketing_attributions')
      .insert({
        student_id: input.studentId,
        activity_id: input.activityId || null,
        attribution_type: input.attributionType,
        touched_at: input.touchedAt || new Date().toISOString(),
        converted_at: input.convertedAt || null,
        conversion_type: input.conversionType || 'registration',
        source: input.source || 'manual',
        confidence_score: input.confidenceScore || 1.00,
      })
      .select('id')
      .single()

    if (error) throw error

    return { success: true, id: data.id }
  } catch (error) {
    console.error('[MarketingService] createMarketingAttribution error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function getStudentAttributions(
  supabase: SupabaseClient,
  studentId: string
): Promise<(MarketingAttribution & { activity: MarketingActivity | null })[]> {
  try {
    const { data, error } = await supabase
      .from('marketing_attributions')
      .select(`
        *,
        activity:marketing_activities(*)
      `)
      .eq('student_id', studentId)
      .order('touched_at', { ascending: true })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('[MarketingService] getStudentAttributions error:', error)
    return []
  }
}

// ============================================
// 채널별 전환율 분석
// ============================================

export async function getChannelMetrics(
  supabase: SupabaseClient,
  options?: {
    startDate?: string
    endDate?: string
  }
): Promise<ChannelMetrics[]> {
  try {
    // 기본: 최근 6개월
    const startDate = options?.startDate ||
      new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // 1. 마케팅 활동별 비용 집계
    let activityQuery = supabase
      .from('marketing_activities')
      .select('id, channel, cost_amount')
      .gte('activity_date', startDate)

    if (options?.endDate) {
      activityQuery = activityQuery.lte('activity_date', options.endDate)
    }

    const { data: activities } = await activityQuery

    // 2. 학생 데이터 조회 (lead_source 기반 + marketing_activity_id 기반)
    let studentQuery = supabase
      .from('students')
      .select('id, lead_source, marketing_activity_id, status, start_date, first_contact_date')
      .gte('first_contact_date', startDate)

    if (options?.endDate) {
      studentQuery = studentQuery.lte('first_contact_date', options.endDate)
    }

    const { data: students } = await studentQuery

    // 3. 테스트 완료 학생 ID 조회
    const studentIds = students?.map(s => s.id) || []
    const { data: testEvents } = await supabase
      .from('funnel_events')
      .select('student_id')
      .in('student_id', studentIds)
      .eq('event_type', 'test_completed')

    const testedStudentIds = new Set(testEvents?.map(e => e.student_id) || [])

    // 4. 채널별 집계
    const channelStats: Record<MarketingChannel, {
      leads: number
      tests: number
      enrollments: number
      budget: number
    }> = {} as Record<MarketingChannel, { leads: number; tests: number; enrollments: number; budget: number }>

    // 초기화
    Object.keys(CHANNEL_LABELS).forEach(channel => {
      channelStats[channel as MarketingChannel] = { leads: 0, tests: 0, enrollments: 0, budget: 0 }
    })

    // 활동 비용 집계
    activities?.forEach(activity => {
      const channel = activity.channel as MarketingChannel
      if (channelStats[channel]) {
        channelStats[channel].budget += activity.cost_amount || 0
      }
    })

    // 학생 집계
    students?.forEach(student => {
      let channel: MarketingChannel | null = null

      // marketing_activity_id가 있으면 해당 활동의 채널 사용
      if (student.marketing_activity_id) {
        const activity = activities?.find(a => a.id === student.marketing_activity_id)
        if (activity) {
          channel = activity.channel as MarketingChannel
        }
      }

      // 없으면 lead_source 매핑 사용
      if (!channel && student.lead_source) {
        channel = LEAD_SOURCE_TO_CHANNEL[student.lead_source] || 'other'
      }

      if (channel && channelStats[channel]) {
        channelStats[channel].leads++

        if (testedStudentIds.has(student.id)) {
          channelStats[channel].tests++
        }

        if (student.status === '재원' && student.start_date) {
          channelStats[channel].enrollments++
        }
      }
    })

    // 결과 변환
    const metrics: ChannelMetrics[] = Object.entries(channelStats)
      .filter(([, stats]) => stats.leads > 0 || stats.budget > 0)
      .map(([channel, stats]) => {
        const ch = channel as MarketingChannel
        return {
          channel: ch,
          channelLabel: CHANNEL_LABELS[ch],
          leads: stats.leads,
          tests: stats.tests,
          enrollments: stats.enrollments,
          leadToTestRate: stats.leads > 0 ? Math.round((stats.tests / stats.leads) * 1000) / 10 : 0,
          testToEnrollRate: stats.tests > 0 ? Math.round((stats.enrollments / stats.tests) * 1000) / 10 : 0,
          totalConversionRate: stats.leads > 0 ? Math.round((stats.enrollments / stats.leads) * 1000) / 10 : 0,
          totalBudget: stats.budget > 0 ? stats.budget : null,
          costPerLead: stats.budget > 0 && stats.leads > 0 ? Math.round(stats.budget / stats.leads) : null,
          costPerEnrollment: stats.budget > 0 && stats.enrollments > 0 ? Math.round(stats.budget / stats.enrollments) : null,
        }
      })
      .sort((a, b) => b.leads - a.leads)

    return metrics
  } catch (error) {
    console.error('[MarketingService] getChannelMetrics error:', error)
    return []
  }
}

// ============================================
// 유틸리티 함수
// ============================================

export function getChannelLabel(channel: MarketingChannel): string {
  return CHANNEL_LABELS[channel] || channel
}

export function mapLeadSourceToChannel(leadSource: string): MarketingChannel {
  return LEAD_SOURCE_TO_CHANNEL[leadSource] || 'other'
}

export function getAllChannels(): { value: MarketingChannel; label: string }[] {
  return Object.entries(CHANNEL_LABELS).map(([value, label]) => ({
    value: value as MarketingChannel,
    label,
  }))
}

// ============================================
// 마케팅 활동 참가자 CRUD
// ============================================

export interface MarketingActivityParticipant {
  id: string
  marketing_activity_id: string
  student_id: string
  name_snapshot: string | null
  participated_at: string | null
  created_at: string
  created_by: string | null
  // 조인된 학생 정보
  student?: {
    id: string
    name: string
    school_type: string | null
    grade: number | null
    status: string
  }
}

export async function getActivityParticipants(
  supabase: SupabaseClient,
  activityId: string
): Promise<MarketingActivityParticipant[]> {
  try {
    const { data, error } = await supabase
      .from('marketing_activity_participants')
      .select(`
        *,
        student:students(id, name, school_type, grade, status)
      `)
      .eq('marketing_activity_id', activityId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('[MarketingService] getActivityParticipants error:', error)
    return []
  }
}

export async function addActivityParticipant(
  supabase: SupabaseClient,
  activityId: string,
  studentId: string,
  createdBy?: string,
  participatedAt?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('marketing_activity_participants')
      .insert({
        marketing_activity_id: activityId,
        student_id: studentId,
        created_by: createdBy || null,
        participated_at: participatedAt || new Date().toISOString().split('T')[0],
      })
      .select('id')
      .single()

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: '이미 등록된 학생입니다' }
      }
      throw error
    }

    return { success: true, id: data.id }
  } catch (error) {
    console.error('[MarketingService] addActivityParticipant error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function addActivityParticipants(
  supabase: SupabaseClient,
  activityId: string,
  studentIds: string[],
  createdBy?: string,
  participatedAt?: string
): Promise<{ success: boolean; added: number; errors: string[] }> {
  const errors: string[] = []
  let added = 0

  for (const studentId of studentIds) {
    const result = await addActivityParticipant(supabase, activityId, studentId, createdBy, participatedAt)
    if (result.success) {
      added++
    } else if (result.error) {
      errors.push(result.error)
    }
  }

  return { success: errors.length === 0, added, errors }
}

export async function removeActivityParticipant(
  supabase: SupabaseClient,
  participantId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('marketing_activity_participants')
      .delete()
      .eq('id', participantId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('[MarketingService] removeActivityParticipant error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function getActivityParticipantCount(
  supabase: SupabaseClient,
  activityId: string
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('marketing_activity_participants')
      .select('*', { count: 'exact', head: true })
      .eq('marketing_activity_id', activityId)

    if (error) throw error

    return count || 0
  } catch (error) {
    console.error('[MarketingService] getActivityParticipantCount error:', error)
    return 0
  }
}

// ============================================
// 보상 플래그 관리
// ============================================

/**
 * 보상 템플릿 기반으로 마케팅 활동의 보상 플래그 업데이트
 */
export async function updateActivityRewardFlags(
  supabase: SupabaseClient,
  activityId: string
): Promise<void> {
  try {
    // 해당 활동의 템플릿 조회
    const { data: templates, error: templateError } = await supabase
      .from('reward_templates')
      .select('reward_type')
      .eq('marketing_activity_id', activityId)
      .eq('is_active', true)

    if (templateError) throw templateError

    const hasTuitionReward = templates?.some(t => t.reward_type === 'tuition_discount') || false
    const hasCashReward = templates?.some(t => t.reward_type === 'cash') || false

    // 활동 업데이트
    const { error: updateError } = await supabase
      .from('marketing_activities')
      .update({
        has_tuition_reward: hasTuitionReward,
        has_cash_reward: hasCashReward,
      })
      .eq('id', activityId)

    if (updateError) throw updateError
  } catch (error) {
    console.error('[MarketingService] updateActivityRewardFlags error:', error)
    throw error
  }
}

/**
 * 마케팅 활동에 보상 템플릿이 있는지 확인
 */
export async function hasRewardTemplates(
  supabase: SupabaseClient,
  activityId: string
): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from('reward_templates')
      .select('*', { count: 'exact', head: true })
      .eq('marketing_activity_id', activityId)
      .eq('is_active', true)

    if (error) throw error

    return (count || 0) > 0
  } catch (error) {
    console.error('[MarketingService] hasRewardTemplates error:', error)
    return false
  }
}
