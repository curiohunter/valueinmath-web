/**
 * 추천 관계 관리 서비스
 * - 추천인/피추천인 관계 관리
 * - 추천 보상 관리
 * - 추천 통계 분석
 */

import { SupabaseClient } from "@supabase/supabase-js"

// 추천 유형
export type ReferralType = '학부모추천' | '학생추천' | '지인추천' | '기타'

// 추천 상태
export type ReferralStatus = '상담중' | '테스트완료' | '등록완료' | '미등록'

// 보상 유형
export type RewardType = '학원비할인' | '현금' | '상품권' | '무료수업' | '기타'

// 추천 데이터 인터페이스
export interface StudentReferral {
  id: string
  referrer_student_id: string | null
  referrer_name_snapshot: string
  referred_student_id: string | null
  referred_name_snapshot: string
  referral_date: string
  referral_type: ReferralType
  referral_status: ReferralStatus
  enrolled_date: string | null
  reward_given: boolean
  reward_type: string | null
  reward_amount: number
  reward_date: string | null
  reward_notes: string | null
  marketing_activity_id: string | null
  notes: string | null
  created_at: string
  created_by: string | null
  updated_at: string
  // 조인된 데이터
  referrer_student?: {
    id: string
    name: string
    status: string
    school_type: string | null
    grade: number | null
  }
  referred_student?: {
    id: string
    name: string
    status: string
    school_type: string | null
    grade: number | null
  }
}

// 추천 생성 폼 데이터
export interface CreateReferralData {
  referrer_student_id: string
  referrer_name_snapshot: string
  referred_student_id: string
  referred_name_snapshot: string
  referral_date: string
  referral_type: ReferralType
  referral_status?: ReferralStatus
  notes?: string
  marketing_activity_id?: string
}

// 추천 수정 데이터
export interface UpdateReferralData {
  referrer_student_id?: string
  referrer_name_snapshot?: string
  referred_student_id?: string
  referred_name_snapshot?: string
  referral_date?: string
  referral_type?: ReferralType
  referral_status?: ReferralStatus
  marketing_activity_id?: string | null
  enrolled_date?: string | null
  // 추천인 보상
  reward_given?: boolean
  reward_type?: RewardType | null
  reward_amount?: number
  reward_date?: string | null
  reward_notes?: string | null
  // 피추천인 보상 (신규)
  referee_reward_given?: boolean
  referee_reward_type?: string | null
  referee_reward_amount?: number
  referee_reward_date?: string | null
  notes?: string
}

// 추천 통계
export interface ReferralStats {
  totalReferrals: number
  enrolledCount: number
  pendingCount: number
  lostCount: number
  successRate: number  // 등록완료 / 전체 * 100
  totalRewardAmount: number
  averageRewardAmount: number
  rewardGivenCount: number
}

// 추천왕 (Top Referrers)
export interface TopReferrer {
  student_id: string
  student_name: string
  student_status: string
  referral_count: number
  enrolled_count: number
  success_rate: number
  total_reward_received: number
}

/**
 * 추천 목록 조회 (with 조인 데이터)
 */
export async function getReferrals(
  supabase: SupabaseClient,
  options?: {
    referrer_student_id?: string
    referred_student_id?: string
    status?: ReferralStatus
    reward_given?: boolean
    limit?: number
  }
): Promise<StudentReferral[]> {
  let query = supabase
    .from("student_referrals")
    .select(`
      *,
      referrer_student:referrer_student_id (
        id, name, status, school_type, grade
      ),
      referred_student:referred_student_id (
        id, name, status, school_type, grade
      )
    `)
    .order("referral_date", { ascending: false })

  if (options?.referrer_student_id) {
    query = query.eq("referrer_student_id", options.referrer_student_id)
  }
  if (options?.referred_student_id) {
    query = query.eq("referred_student_id", options.referred_student_id)
  }
  if (options?.status) {
    query = query.eq("referral_status", options.status)
  }
  if (options?.reward_given !== undefined) {
    query = query.eq("reward_given", options.reward_given)
  }
  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query

  if (error) {
    console.error("[ReferralService] getReferrals error:", error)
    throw error
  }

  return (data || []) as StudentReferral[]
}

/**
 * 단일 추천 조회
 */
export async function getReferralById(
  supabase: SupabaseClient,
  id: string
): Promise<StudentReferral | null> {
  const { data, error } = await supabase
    .from("student_referrals")
    .select(`
      *,
      referrer_student:referrer_student_id (
        id, name, status, school_type, grade
      ),
      referred_student:referred_student_id (
        id, name, status, school_type, grade
      )
    `)
    .eq("id", id)
    .single()

  if (error) {
    if (error.code === "PGRST116") return null
    console.error("[ReferralService] getReferralById error:", error)
    throw error
  }

  return data as StudentReferral
}

/**
 * 추천 생성
 */
export async function createReferral(
  supabase: SupabaseClient,
  data: CreateReferralData,
  createdBy?: string
): Promise<StudentReferral> {
  const insertData = {
    ...data,
    created_by: createdBy || null,
  }

  const { data: result, error } = await supabase
    .from("student_referrals")
    .insert(insertData)
    .select()
    .single()

  if (error) {
    console.error("[ReferralService] createReferral error:", error)
    throw error
  }

  return result as StudentReferral
}

/**
 * 추천 수정
 */
export async function updateReferral(
  supabase: SupabaseClient,
  id: string,
  data: UpdateReferralData
): Promise<StudentReferral> {
  const { data: result, error } = await supabase
    .from("student_referrals")
    .update(data)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("[ReferralService] updateReferral error:", error)
    throw error
  }

  return result as StudentReferral
}

/**
 * 추천 삭제
 */
export async function deleteReferral(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("student_referrals")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("[ReferralService] deleteReferral error:", error)
    throw error
  }
}

/**
 * 보상 지급 처리
 */
export async function giveReward(
  supabase: SupabaseClient,
  id: string,
  rewardData: {
    reward_type: RewardType
    reward_amount: number
    reward_date: string
    reward_notes?: string
  }
): Promise<StudentReferral> {
  return updateReferral(supabase, id, {
    reward_given: true,
    ...rewardData,
  })
}

/**
 * 추천 상태 변경 (등록 확정 등)
 */
export async function updateReferralStatus(
  supabase: SupabaseClient,
  id: string,
  status: ReferralStatus,
  enrolledDate?: string
): Promise<StudentReferral> {
  const updateData: UpdateReferralData = {
    referral_status: status,
  }

  if (status === '등록완료' && enrolledDate) {
    updateData.enrolled_date = enrolledDate
  }

  return updateReferral(supabase, id, updateData)
}

/**
 * 추천 완료 처리 (등록 확정 + 보상 자동 생성)
 * - 상태를 '등록완료'로 변경
 * - 마케팅 활동이 연결되어 있고 보상 템플릿이 있으면 보상 자동 생성
 */
export async function onReferralCompleted(
  supabase: SupabaseClient,
  referralId: string,
  enrolledDate?: string
): Promise<{ referral: StudentReferral; rewardsCreated: number }> {
  // 1. 상태 변경
  const referral = await updateReferralStatus(
    supabase,
    referralId,
    '등록완료',
    enrolledDate || new Date().toISOString().split('T')[0]
  )

  // 2. 마케팅 활동이 연결되어 있으면 보상 생성 시도
  let rewardsCreated = 0
  if (referral.marketing_activity_id) {
    try {
      // reward-service의 createRewardsForReferral 호출
      const { createRewardsForReferral } = await import("@/services/reward-service")
      const rewards = await createRewardsForReferral(supabase, referralId, {
        referrerStudentId: referral.referrer_student_id!,
        refereeStudentId: referral.referred_student_id!,
        activityId: referral.marketing_activity_id,
        referrerName: referral.referrer_name_snapshot,
        refereeName: referral.referred_name_snapshot,
      })
      rewardsCreated = rewards.length
    } catch (error) {
      console.error("[ReferralService] onReferralCompleted - reward creation error:", error)
      // 보상 생성 실패해도 추천 완료 처리는 유지
    }
  }

  return { referral, rewardsCreated }
}

/**
 * 피추천인 보상 지급 처리 (레거시 호환)
 */
export async function giveRefereeReward(
  supabase: SupabaseClient,
  id: string,
  rewardData: {
    reward_type: string
    reward_amount: number
    reward_date: string
  }
): Promise<StudentReferral> {
  return updateReferral(supabase, id, {
    referee_reward_given: true,
    referee_reward_type: rewardData.reward_type,
    referee_reward_amount: rewardData.reward_amount,
    referee_reward_date: rewardData.reward_date,
  })
}

/**
 * 추천 통계 조회
 */
export async function getReferralStats(
  supabase: SupabaseClient,
  options?: {
    startDate?: string
    endDate?: string
  }
): Promise<ReferralStats> {
  let query = supabase
    .from("student_referrals")
    .select("*")

  if (options?.startDate) {
    query = query.gte("referral_date", options.startDate)
  }
  if (options?.endDate) {
    query = query.lte("referral_date", options.endDate)
  }

  const { data, error } = await query

  if (error) {
    console.error("[ReferralService] getReferralStats error:", error)
    throw error
  }

  const referrals = data || []
  const totalReferrals = referrals.length
  const enrolledCount = referrals.filter(r => r.referral_status === '등록완료').length
  const pendingCount = referrals.filter(r => ['상담중', '테스트완료'].includes(r.referral_status)).length
  const lostCount = referrals.filter(r => r.referral_status === '미등록').length

  const rewardedReferrals = referrals.filter(r => r.reward_given)
  const totalRewardAmount = rewardedReferrals.reduce((sum, r) => sum + (r.reward_amount || 0), 0)
  const rewardGivenCount = rewardedReferrals.length

  return {
    totalReferrals,
    enrolledCount,
    pendingCount,
    lostCount,
    successRate: totalReferrals > 0 ? Math.round((enrolledCount / totalReferrals) * 1000) / 10 : 0,
    totalRewardAmount,
    averageRewardAmount: rewardGivenCount > 0 ? Math.round(totalRewardAmount / rewardGivenCount) : 0,
    rewardGivenCount,
  }
}

/**
 * 추천왕 순위 조회 (Top Referrers)
 */
export async function getTopReferrers(
  supabase: SupabaseClient,
  limit: number = 10,
  options?: {
    startDate?: string
    endDate?: string
  }
): Promise<TopReferrer[]> {
  // 모든 추천 데이터 가져오기
  let query = supabase
    .from("student_referrals")
    .select(`
      referrer_student_id,
      referrer_name_snapshot,
      referral_status,
      reward_amount,
      referrer_student:referrer_student_id (
        id, name, status
      )
    `)

  if (options?.startDate) {
    query = query.gte("referral_date", options.startDate)
  }
  if (options?.endDate) {
    query = query.lte("referral_date", options.endDate)
  }

  const { data, error } = await query

  if (error) {
    console.error("[ReferralService] getTopReferrers error:", error)
    throw error
  }

  // 추천인별 집계
  const referrerMap = new Map<string, {
    student_id: string
    student_name: string
    student_status: string
    referral_count: number
    enrolled_count: number
    total_reward_received: number
  }>()

  for (const ref of data || []) {
    const studentId = ref.referrer_student_id
    if (!studentId) continue

    const existing = referrerMap.get(studentId)
    // Supabase join can return array or object - handle both cases
    const rawStudentData = ref.referrer_student
    const studentData = (Array.isArray(rawStudentData) ? rawStudentData[0] : rawStudentData) as { id: string; name: string; status: string } | null

    if (existing) {
      existing.referral_count++
      if (ref.referral_status === '등록완료') {
        existing.enrolled_count++
      }
      existing.total_reward_received += ref.reward_amount || 0
    } else {
      referrerMap.set(studentId, {
        student_id: studentId,
        student_name: studentData?.name || ref.referrer_name_snapshot,
        student_status: studentData?.status || '알 수 없음',
        referral_count: 1,
        enrolled_count: ref.referral_status === '등록완료' ? 1 : 0,
        total_reward_received: ref.reward_amount || 0,
      })
    }
  }

  // 배열로 변환하고 정렬
  const topReferrers: TopReferrer[] = Array.from(referrerMap.values())
    .map(r => ({
      ...r,
      success_rate: r.referral_count > 0
        ? Math.round((r.enrolled_count / r.referral_count) * 1000) / 10
        : 0,
    }))
    .sort((a, b) => b.referral_count - a.referral_count)
    .slice(0, limit)

  return topReferrers
}

/**
 * 특정 학생이 추천한 내역 조회
 */
export async function getReferralsByReferrer(
  supabase: SupabaseClient,
  referrerStudentId: string
): Promise<StudentReferral[]> {
  return getReferrals(supabase, { referrer_student_id: referrerStudentId })
}

/**
 * 특정 학생이 추천받은 내역 조회
 */
export async function getReferralsByReferred(
  supabase: SupabaseClient,
  referredStudentId: string
): Promise<StudentReferral[]> {
  return getReferrals(supabase, { referred_student_id: referredStudentId })
}

/**
 * 보상 미지급 추천 목록 (등록완료 상태)
 */
export async function getPendingRewards(
  supabase: SupabaseClient
): Promise<StudentReferral[]> {
  const { data, error } = await supabase
    .from("student_referrals")
    .select(`
      *,
      referrer_student:referrer_student_id (
        id, name, status, school_type, grade
      ),
      referred_student:referred_student_id (
        id, name, status, school_type, grade
      )
    `)
    .eq("referral_status", "등록완료")
    .eq("reward_given", false)
    .order("enrolled_date", { ascending: true })

  if (error) {
    console.error("[ReferralService] getPendingRewards error:", error)
    throw error
  }

  return (data || []) as StudentReferral[]
}

// 추천 유형 라벨
export const REFERRAL_TYPE_LABELS: Record<ReferralType, string> = {
  '학부모추천': '학부모 추천',
  '학생추천': '학생 추천',
  '지인추천': '지인 추천',
  '기타': '기타',
}

// 추천 상태 라벨
export const REFERRAL_STATUS_LABELS: Record<ReferralStatus, string> = {
  '상담중': '상담 중',
  '테스트완료': '테스트 완료',
  '등록완료': '등록 완료',
  '미등록': '미등록',
}

// 보상 유형 라벨
export const REWARD_TYPE_LABELS: Record<RewardType, string> = {
  '학원비할인': '학원비 할인',
  '현금': '현금',
  '상품권': '상품권',
  '무료수업': '무료 수업',
  '기타': '기타',
}

// 추천 상태 색상
export function getReferralStatusColor(status: ReferralStatus): string {
  switch (status) {
    case '상담중':
      return 'bg-blue-50 text-blue-700 border-blue-200'
    case '테스트완료':
      return 'bg-purple-50 text-purple-700 border-purple-200'
    case '등록완료':
      return 'bg-green-50 text-green-700 border-green-200'
    case '미등록':
      return 'bg-gray-50 text-gray-500 border-gray-200'
    default:
      return 'bg-gray-50 text-gray-500 border-gray-200'
  }
}
