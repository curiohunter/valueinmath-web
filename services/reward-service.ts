/**
 * 통합 보상 관리 서비스
 * - 보상 템플릿 관리
 * - 보상 생성/조회/지급
 * - 학원비 할인 적용 오케스트레이션
 */

import { SupabaseClient } from "@supabase/supabase-js"
import {
  RewardTemplate,
  CreateRewardTemplateData,
  Reward,
  CreateRewardData,
  TuitionDiscount,
  CreateTuitionDiscountData,
  RewardStats,
  PendingRewardsFilter,
  RewardRole,
  RewardType,
  RewardStatus,
  AmountType,
} from "@/types/reward"

// ============================================
// 보상 템플릿 관리
// ============================================

/**
 * 보상 템플릿 생성
 */
export async function createRewardTemplate(
  supabase: SupabaseClient,
  data: CreateRewardTemplateData
): Promise<RewardTemplate> {
  const { data: result, error } = await supabase
    .from("reward_templates")
    .insert({
      ...data,
      amount_type: data.amount_type || 'fixed',
      is_active: data.is_active ?? true,
    })
    .select()
    .single()

  if (error) {
    console.error("[RewardService] createRewardTemplate error:", error)
    throw error
  }

  return result as RewardTemplate
}

/**
 * 마케팅 활동의 보상 템플릿 조회
 */
export async function getRewardTemplates(
  supabase: SupabaseClient,
  activityId: string
): Promise<RewardTemplate[]> {
  const { data, error } = await supabase
    .from("reward_templates")
    .select("*")
    .eq("marketing_activity_id", activityId)
    .eq("is_active", true)
    .order("role")
    .order("reward_type")

  if (error) {
    console.error("[RewardService] getRewardTemplates error:", error)
    throw error
  }

  return (data || []) as RewardTemplate[]
}

/**
 * 보상 템플릿 수정
 */
export async function updateRewardTemplate(
  supabase: SupabaseClient,
  templateId: string,
  updates: Partial<CreateRewardTemplateData>
): Promise<RewardTemplate> {
  const { data, error } = await supabase
    .from("reward_templates")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", templateId)
    .select()
    .single()

  if (error) {
    console.error("[RewardService] updateRewardTemplate error:", error)
    throw error
  }

  return data as RewardTemplate
}

/**
 * 보상 템플릿 삭제 (soft delete - is_active = false)
 */
export async function deleteRewardTemplate(
  supabase: SupabaseClient,
  templateId: string
): Promise<void> {
  const { error } = await supabase
    .from("reward_templates")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", templateId)

  if (error) {
    console.error("[RewardService] deleteRewardTemplate error:", error)
    throw error
  }
}

/**
 * 마케팅 활동의 보상 템플릿 일괄 저장 (upsert)
 */
export async function saveRewardTemplates(
  supabase: SupabaseClient,
  activityId: string,
  templates: CreateRewardTemplateData[]
): Promise<RewardTemplate[]> {
  // 기존 템플릿 비활성화
  await supabase
    .from("reward_templates")
    .update({ is_active: false })
    .eq("marketing_activity_id", activityId)

  if (templates.length === 0) {
    return []
  }

  // 새 템플릿 삽입
  const { data, error } = await supabase
    .from("reward_templates")
    .upsert(
      templates.map(t => ({
        ...t,
        marketing_activity_id: activityId,
        amount_type: t.amount_type || 'fixed',
        is_active: true,
      })),
      { onConflict: 'marketing_activity_id,role,reward_type' }
    )
    .select()

  if (error) {
    console.error("[RewardService] saveRewardTemplates error:", error)
    throw error
  }

  return (data || []) as RewardTemplate[]
}

// ============================================
// 보상 관리
// ============================================

/**
 * 보상 생성
 */
export async function createReward(
  supabase: SupabaseClient,
  data: CreateRewardData,
  createdBy?: string
): Promise<Reward> {
  const { data: result, error } = await supabase
    .from("rewards")
    .insert({
      ...data,
      amount_type: data.amount_type || 'fixed',
      status: 'pending',
      created_by: createdBy || null,
    })
    .select()
    .single()

  if (error) {
    console.error("[RewardService] createReward error:", error)
    throw error
  }

  return result as Reward
}

/**
 * 추천 완료 시 보상 자동 생성 (idempotent)
 * - 추천인과 피추천인 보상을 동시에 생성
 */
export async function createRewardsForReferral(
  supabase: SupabaseClient,
  referralId: string,
  options?: {
    referrerStudentId: string
    refereeStudentId: string
    activityId?: string
    referrerName?: string
    refereeName?: string
    activityTitle?: string
  }
): Promise<Reward[]> {
  if (!options) {
    // referral 정보 조회
    const { data: referral, error: refError } = await supabase
      .from("student_referrals")
      .select(`
        *,
        referrer_student:referrer_student_id (id, name),
        referred_student:referred_student_id (id, name),
        marketing_activity:marketing_activity_id (id, title)
      `)
      .eq("id", referralId)
      .single()

    if (refError || !referral) {
      console.error("[RewardService] getReferral error:", refError)
      throw refError || new Error("Referral not found")
    }

    const referrerStudent = Array.isArray(referral.referrer_student)
      ? referral.referrer_student[0]
      : referral.referrer_student
    const referredStudent = Array.isArray(referral.referred_student)
      ? referral.referred_student[0]
      : referral.referred_student
    const activity = Array.isArray(referral.marketing_activity)
      ? referral.marketing_activity[0]
      : referral.marketing_activity

    options = {
      referrerStudentId: referral.referrer_student_id,
      refereeStudentId: referral.referred_student_id,
      activityId: referral.marketing_activity_id,
      referrerName: referrerStudent?.name || referral.referrer_name_snapshot,
      refereeName: referredStudent?.name || referral.referred_name_snapshot,
      activityTitle: activity?.title || null,
    }
  }

  const rewards: Reward[] = []

  // 마케팅 활동이 있으면 템플릿에서 보상 정보 가져오기
  if (options.activityId) {
    const templates = await getRewardTemplates(supabase, options.activityId)

    for (const template of templates) {
      const studentId = template.role === 'referrer'
        ? options.referrerStudentId
        : template.role === 'referee'
          ? options.refereeStudentId
          : null

      if (!studentId) continue

      try {
        const reward = await createReward(supabase, {
          student_id: studentId,
          marketing_activity_id: options.activityId,
          referral_id: referralId,
          role: template.role,
          reward_type: template.reward_type,
          amount_type: template.amount_type,
          reward_amount: template.reward_amount,
          description: template.description,
          student_name_snapshot: template.role === 'referrer'
            ? options.referrerName
            : options.refereeName,
          activity_title_snapshot: options.activityTitle,
        })
        rewards.push(reward)
      } catch (error: any) {
        // 중복 생성 시도 시 무시 (idempotency)
        if (error.code === '23505') {
          console.log("[RewardService] Reward already exists, skipping")
          continue
        }
        throw error
      }
    }
  }

  return rewards
}

/**
 * 참가자 보상 자동 생성 (idempotent)
 */
export async function createRewardsForParticipant(
  supabase: SupabaseClient,
  participantId: string,
  options?: {
    studentId: string
    activityId: string
    studentName?: string
    activityTitle?: string
  }
): Promise<Reward[]> {
  if (!options) {
    // participant 정보 조회
    const { data: participant, error: partError } = await supabase
      .from("marketing_activity_participants")
      .select(`
        *,
        student:student_id (id, name),
        activity:marketing_activity_id (id, title)
      `)
      .eq("id", participantId)
      .single()

    if (partError || !participant) {
      console.error("[RewardService] getParticipant error:", partError)
      throw partError || new Error("Participant not found")
    }

    const student = Array.isArray(participant.student)
      ? participant.student[0]
      : participant.student
    const activity = Array.isArray(participant.activity)
      ? participant.activity[0]
      : participant.activity

    options = {
      studentId: participant.student_id,
      activityId: participant.marketing_activity_id,
      studentName: student?.name || participant.name_snapshot,
      activityTitle: activity?.title || null,
    }
  }

  const rewards: Reward[] = []
  const templates = await getRewardTemplates(supabase, options.activityId)
  const participantTemplates = templates.filter(t => t.role === 'participant')

  for (const template of participantTemplates) {
    try {
      const reward = await createReward(supabase, {
        student_id: options.studentId,
        marketing_activity_id: options.activityId,
        participant_id: participantId,
        role: 'participant',
        reward_type: template.reward_type,
        amount_type: template.amount_type,
        reward_amount: template.reward_amount,
        description: template.description,
        student_name_snapshot: options.studentName,
        activity_title_snapshot: options.activityTitle,
      })
      rewards.push(reward)
    } catch (error: any) {
      // 중복 생성 시도 시 무시 (idempotency)
      if (error.code === '23505') {
        console.log("[RewardService] Reward already exists, skipping")
        continue
      }
      throw error
    }
  }

  return rewards
}

/**
 * 보상 단건 조회
 */
export async function getRewardById(
  supabase: SupabaseClient,
  rewardId: string
): Promise<Reward | null> {
  const { data, error } = await supabase
    .from("rewards")
    .select(`
      *,
      student:student_id (id, name, status),
      marketing_activity:marketing_activity_id (id, title)
    `)
    .eq("id", rewardId)
    .single()

  if (error) {
    if (error.code === "PGRST116") return null
    console.error("[RewardService] getRewardById error:", error)
    throw error
  }

  return data as Reward
}

/**
 * 학생별 보상 목록 조회
 */
export async function getStudentRewards(
  supabase: SupabaseClient,
  studentId: string,
  options?: {
    status?: RewardStatus
    type?: RewardType
  }
): Promise<Reward[]> {
  let query = supabase
    .from("rewards")
    .select(`
      *,
      marketing_activity:marketing_activity_id (id, title)
    `)
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })

  if (options?.status) {
    query = query.eq("status", options.status)
  }
  if (options?.type) {
    query = query.eq("reward_type", options.type)
  }

  const { data, error } = await query

  if (error) {
    console.error("[RewardService] getStudentRewards error:", error)
    throw error
  }

  return (data || []) as Reward[]
}

/**
 * 미지급 보상 목록 조회 (with 필터)
 */
export async function getPendingRewards(
  supabase: SupabaseClient,
  filter?: PendingRewardsFilter
): Promise<Reward[]> {
  let query = supabase
    .from("rewards")
    .select(`
      *,
      student:student_id (id, name, status),
      marketing_activity:marketing_activity_id (id, title)
    `)
    .eq("status", "pending")
    .order("created_at", { ascending: false })

  if (filter?.thisMonth) {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    query = query.gte("created_at", startOfMonth.toISOString())
  } else if (filter?.recentMonths) {
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth() - filter.recentMonths, 1)
    query = query.gte("created_at", startDate.toISOString())
  }

  if (filter?.activityId) {
    query = query.eq("marketing_activity_id", filter.activityId)
  }

  if (filter?.studentId) {
    query = query.eq("student_id", filter.studentId)
  }

  if (filter?.rewardType) {
    query = query.eq("reward_type", filter.rewardType)
  }

  const { data, error } = await query

  if (error) {
    console.error("[RewardService] getPendingRewards error:", error)
    throw error
  }

  return (data || []) as Reward[]
}

/**
 * 학생의 미적용 학원비 할인 보상 조회 (학원비 생성 시 드롭다운용)
 */
export async function getPendingTuitionDiscounts(
  supabase: SupabaseClient,
  studentId: string
): Promise<Reward[]> {
  const { data, error } = await supabase
    .from("rewards")
    .select(`
      *,
      marketing_activity:marketing_activity_id (id, title)
    `)
    .eq("student_id", studentId)
    .eq("status", "pending")
    .eq("reward_type", "tuition_discount")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[RewardService] getPendingTuitionDiscounts error:", error)
    throw error
  }

  return (data || []) as Reward[]
}

/**
 * 현금 보상 지급 완료 처리
 */
export async function markRewardAsPaid(
  supabase: SupabaseClient,
  rewardId: string,
  paidBy: string
): Promise<Reward> {
  const { data, error } = await supabase
    .from("rewards")
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      paid_by: paidBy,
      updated_at: new Date().toISOString(),
    })
    .eq("id", rewardId)
    .select()
    .single()

  if (error) {
    console.error("[RewardService] markRewardAsPaid error:", error)
    throw error
  }

  return data as Reward
}

/**
 * 보상 취소
 */
export async function cancelReward(
  supabase: SupabaseClient,
  rewardId: string,
  notes?: string
): Promise<Reward> {
  const { data, error } = await supabase
    .from("rewards")
    .update({
      status: 'cancelled',
      notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", rewardId)
    .select()
    .single()

  if (error) {
    console.error("[RewardService] cancelReward error:", error)
    throw error
  }

  return data as Reward
}

// ============================================
// 학원비 할인 적용 오케스트레이션
// ============================================

/**
 * 보상을 학원비에 적용 (오케스트레이션 함수)
 * - rewards 상태 업데이트
 * - tuition_discounts 레코드 생성
 * - tuition_fees 금액 재계산
 */
export async function applyRewardToTuition(
  supabase: SupabaseClient,
  rewardId: string,
  tuitionFeeId: string,
  actualAmount?: number,
  createdBy?: string
): Promise<{ reward: Reward; discount: TuitionDiscount }> {
  // 1. 보상 정보 조회
  const reward = await getRewardById(supabase, rewardId)
  if (!reward) {
    throw new Error("Reward not found")
  }
  if (reward.status !== 'pending') {
    throw new Error("Reward is not in pending status")
  }
  if (reward.reward_type !== 'tuition_discount') {
    throw new Error("Reward type is not tuition_discount")
  }

  // 2. 학원비 정보 조회
  const { data: tuitionFee, error: feeError } = await supabase
    .from("tuition_fees")
    .select("*")
    .eq("id", tuitionFeeId)
    .single()

  if (feeError || !tuitionFee) {
    throw new Error("Tuition fee not found")
  }

  // 3. 실제 할인 금액 계산
  let discountAmount = actualAmount
  if (!discountAmount) {
    if (reward.amount_type === 'percent') {
      const baseAmount = tuitionFee.base_amount || tuitionFee.amount
      discountAmount = Math.round(baseAmount * (reward.reward_amount / 100))
    } else {
      discountAmount = reward.reward_amount
    }
  }

  // 4. tuition_discounts 레코드 생성
  const { data: discount, error: discountError } = await supabase
    .from("tuition_discounts")
    .insert({
      tuition_fee_id: tuitionFeeId,
      discount_type: reward.role === 'referrer' || reward.role === 'referee' ? 'referral' : 'marketing',
      discount_amount: discountAmount,
      discount_percentage: reward.amount_type === 'percent' ? reward.reward_amount : null,
      reward_id: rewardId,
      description: reward.activity_title_snapshot || reward.description,
      created_by: createdBy || null,
    })
    .select()
    .single()

  if (discountError) {
    console.error("[RewardService] createDiscount error:", discountError)
    throw discountError
  }

  // 5. rewards 상태 업데이트
  const { data: updatedReward, error: rewardError } = await supabase
    .from("rewards")
    .update({
      status: 'applied',
      applied_tuition_fee_id: tuitionFeeId,
      applied_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", rewardId)
    .select()
    .single()

  if (rewardError) {
    console.error("[RewardService] updateReward error:", rewardError)
    throw rewardError
  }

  // 6. tuition_fees 금액 재계산
  await recalculateTuitionAmount(supabase, tuitionFeeId)

  return {
    reward: updatedReward as Reward,
    discount: discount as TuitionDiscount,
  }
}

/**
 * 학원비 할인 금액 재계산
 */
export async function recalculateTuitionAmount(
  supabase: SupabaseClient,
  tuitionFeeId: string
): Promise<void> {
  // 1. 학원비 정보 조회
  const { data: tuitionFee, error: feeError } = await supabase
    .from("tuition_fees")
    .select("*")
    .eq("id", tuitionFeeId)
    .single()

  if (feeError || !tuitionFee) {
    throw new Error("Tuition fee not found")
  }

  // 2. 모든 할인 내역 조회
  const { data: discounts, error: discountsError } = await supabase
    .from("tuition_discounts")
    .select("*")
    .eq("tuition_fee_id", tuitionFeeId)

  if (discountsError) {
    throw discountsError
  }

  // 3. 총 할인 금액 계산
  const totalDiscount = (discounts || []).reduce((sum, d) => sum + (d.discount_amount || 0), 0)

  // 4. 학원비 업데이트
  const baseAmount = tuitionFee.base_amount || tuitionFee.amount
  const finalAmount = Math.max(0, baseAmount - totalDiscount)

  const { error: updateError } = await supabase
    .from("tuition_fees")
    .update({
      base_amount: baseAmount,
      total_discount: totalDiscount,
      final_amount: finalAmount,
    })
    .eq("id", tuitionFeeId)

  if (updateError) {
    console.error("[RewardService] updateTuitionFee error:", updateError)
    throw updateError
  }
}

/**
 * 학원비 할인 내역 조회
 */
export async function getTuitionDiscounts(
  supabase: SupabaseClient,
  tuitionFeeId: string
): Promise<TuitionDiscount[]> {
  const { data, error } = await supabase
    .from("tuition_discounts")
    .select(`
      *,
      reward:reward_id (*)
    `)
    .eq("tuition_fee_id", tuitionFeeId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[RewardService] getTuitionDiscounts error:", error)
    throw error
  }

  return (data || []) as TuitionDiscount[]
}

/**
 * 학원비 할인 삭제 (보상 상태도 되돌림)
 */
export async function removeDiscount(
  supabase: SupabaseClient,
  discountId: string
): Promise<void> {
  // 1. 할인 정보 조회
  const { data: discount, error: getError } = await supabase
    .from("tuition_discounts")
    .select("*")
    .eq("id", discountId)
    .single()

  if (getError || !discount) {
    throw new Error("Discount not found")
  }

  // 2. 보상이 연결되어 있으면 상태 되돌리기
  if (discount.reward_id) {
    await supabase
      .from("rewards")
      .update({
        status: 'pending',
        applied_tuition_fee_id: null,
        applied_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", discount.reward_id)
  }

  // 3. 할인 삭제
  const { error: deleteError } = await supabase
    .from("tuition_discounts")
    .delete()
    .eq("id", discountId)

  if (deleteError) {
    throw deleteError
  }

  // 4. 학원비 금액 재계산
  await recalculateTuitionAmount(supabase, discount.tuition_fee_id)
}

// ============================================
// 통계
// ============================================

/**
 * 보상 통계 조회
 */
export async function getRewardStats(
  supabase: SupabaseClient,
  options?: {
    startDate?: string
    endDate?: string
    activityId?: string
  }
): Promise<RewardStats> {
  let query = supabase
    .from("rewards")
    .select("*")

  if (options?.startDate) {
    query = query.gte("created_at", options.startDate)
  }
  if (options?.endDate) {
    query = query.lte("created_at", options.endDate)
  }
  if (options?.activityId) {
    query = query.eq("marketing_activity_id", options.activityId)
  }

  const { data, error } = await query

  if (error) {
    console.error("[RewardService] getRewardStats error:", error)
    throw error
  }

  const rewards = data || []

  const stats: RewardStats = {
    totalRewards: rewards.length,
    pendingCount: rewards.filter(r => r.status === 'pending').length,
    paidCount: rewards.filter(r => r.status === 'paid').length,
    appliedCount: rewards.filter(r => r.status === 'applied').length,
    cancelledCount: rewards.filter(r => r.status === 'cancelled').length,
    totalCashAmount: rewards
      .filter(r => r.reward_type === 'cash' && r.status === 'paid')
      .reduce((sum, r) => sum + (r.reward_amount || 0), 0),
    totalTuitionDiscount: rewards
      .filter(r => r.reward_type === 'tuition_discount' && r.status === 'applied')
      .reduce((sum, r) => sum + (r.reward_amount || 0), 0),
    byRewardType: {
      cash: rewards.filter(r => r.reward_type === 'cash').length,
      tuition_discount: rewards.filter(r => r.reward_type === 'tuition_discount').length,
      gift_card: rewards.filter(r => r.reward_type === 'gift_card').length,
      free_class: rewards.filter(r => r.reward_type === 'free_class').length,
      other: rewards.filter(r => r.reward_type === 'other').length,
    },
    byRole: {
      referrer: rewards.filter(r => r.role === 'referrer').length,
      referee: rewards.filter(r => r.role === 'referee').length,
      participant: rewards.filter(r => r.role === 'participant').length,
    },
  }

  return stats
}
