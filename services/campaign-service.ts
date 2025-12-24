/**
 * Campaign Service - 통합 마케팅 캠페인 관리
 *
 * 2분류 체계:
 * 1. 홍보 활동 (promo): 현수막, 광고 등 비용 추적 + ROI 계산
 * 2. 고객 이벤트 (event): 추천, 리뷰 등 혜택 지급
 */

import { SupabaseClient } from "@supabase/supabase-js"

// ============ 타입 정의 ============

export type CampaignType = "promo" | "event" | "policy"
export type CampaignStatus = "planned" | "active" | "completed" | "cancelled"
export type RewardType = "cash" | "tuition_discount" | "gift_card" | "other"
export type RewardStatus = "pending" | "paid" | "applied" | "cancelled"
export type RewardAmountType = "fixed" | "percent"
export type PolicyTarget = "sibling" | "dual_subject" | "early_bird" | "long_term" | "custom"

export interface Campaign {
  id: string
  title: string
  description: string | null
  campaign_type: CampaignType
  status: CampaignStatus
  start_date: string
  end_date: string | null
  // 홍보용
  channel: string | null
  cost_amount: number
  reach_count: number
  // 이벤트용
  reward_type: RewardType | null
  reward_amount: number
  reward_amount_type: RewardAmountType // 'fixed' | 'percent'
  reward_description: string | null
  // 정책용
  policy_target: PolicyTarget | null
  // 메타
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CampaignParticipant {
  id: string
  campaign_id: string
  student_id: string
  referrer_student_id: string | null
  referrer_name_snapshot: string | null
  participated_at: string
  reward_amount: number
  reward_amount_type: RewardAmountType // 'fixed' | 'percent'
  reward_status: RewardStatus
  reward_paid_at: string | null
  reward_applied_tuition_id: string | null
  reward_notes: string | null
  student_name_snapshot: string | null
  created_by: string | null
  created_at: string
  // 조인 데이터
  student?: { id: string; name: string }
  campaign?: Campaign
}

export interface CreateCampaignData {
  title: string
  description?: string
  campaign_type: CampaignType
  status?: CampaignStatus
  start_date: string
  end_date?: string
  // 홍보용
  channel?: string
  cost_amount?: number
  reach_count?: number
  // 이벤트용
  reward_type?: RewardType
  reward_amount?: number
  reward_amount_type?: RewardAmountType
  reward_description?: string
  created_by?: string
}

export interface UpdateCampaignData {
  title?: string
  description?: string
  status?: CampaignStatus
  start_date?: string
  end_date?: string
  channel?: string
  cost_amount?: number
  reach_count?: number
  reward_type?: RewardType
  reward_amount?: number
  reward_amount_type?: RewardAmountType
  reward_description?: string
}

export interface DiscountDetail {
  type: "sibling" | "event" | "policy" | "special" | "other"
  amount: number
  amount_type?: RewardAmountType // 'fixed' (금액) | 'percent' (할인율 %)
  campaign_id?: string
  participant_id?: string
  description?: string
}

// ============ 캠페인 CRUD ============

export async function createCampaign(
  supabase: SupabaseClient,
  data: CreateCampaignData
): Promise<{ success: boolean; data?: Campaign; error?: string }> {
  const { data: campaign, error } = await supabase
    .from("marketing_campaigns")
    .insert({
      title: data.title,
      description: data.description || null,
      campaign_type: data.campaign_type,
      status: data.status || "active",
      start_date: data.start_date,
      end_date: data.end_date || null,
      channel: data.channel || null,
      cost_amount: data.cost_amount || 0,
      reach_count: data.reach_count || 0,
      reward_type: data.reward_type || null,
      reward_amount: data.reward_amount || 0,
      reward_amount_type: data.reward_amount_type || "fixed",
      reward_description: data.reward_description || null,
      created_by: data.created_by || null,
    })
    .select()
    .single()

  if (error) {
    console.error("[CampaignService] createCampaign error:", error)
    return { success: false, error: error.message }
  }

  return { success: true, data: campaign }
}

export async function updateCampaign(
  supabase: SupabaseClient,
  id: string,
  data: UpdateCampaignData
): Promise<{ success: boolean; data?: Campaign; error?: string }> {
  const { data: campaign, error } = await supabase
    .from("marketing_campaigns")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("[CampaignService] updateCampaign error:", error)
    return { success: false, error: error.message }
  }

  return { success: true, data: campaign }
}

export async function deleteCampaign(
  supabase: SupabaseClient,
  id: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("marketing_campaigns")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("[CampaignService] deleteCampaign error:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function getCampaigns(
  supabase: SupabaseClient,
  options?: {
    type?: CampaignType
    status?: CampaignStatus
  }
): Promise<{ success: boolean; data?: Campaign[]; error?: string }> {
  let query = supabase
    .from("marketing_campaigns")
    .select("*")
    .order("created_at", { ascending: false })

  if (options?.type) {
    query = query.eq("campaign_type", options.type)
  }

  if (options?.status) {
    query = query.eq("status", options.status)
  }

  const { data, error } = await query

  if (error) {
    console.error("[CampaignService] getCampaigns error:", error)
    return { success: false, error: error.message }
  }

  return { success: true, data: data || [] }
}

export async function getCampaign(
  supabase: SupabaseClient,
  id: string
): Promise<{ success: boolean; data?: Campaign; error?: string }> {
  const { data, error } = await supabase
    .from("marketing_campaigns")
    .select("*")
    .eq("id", id)
    .single()

  if (error) {
    console.error("[CampaignService] getCampaign error:", error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

// ============ 참여자 관리 ============

export async function addParticipant(
  supabase: SupabaseClient,
  campaignId: string,
  studentId: string,
  options?: {
    referrerStudentId?: string
    rewardAmount?: number
    rewardAmountType?: RewardAmountType
    participatedAt?: string
    createdBy?: string
  }
): Promise<{ success: boolean; data?: CampaignParticipant; error?: string }> {
  // 캠페인 정보 조회 (기본 혜택 금액 및 타입)
  const { data: campaign } = await supabase
    .from("marketing_campaigns")
    .select("reward_amount, reward_amount_type")
    .eq("id", campaignId)
    .single()

  // 학생 이름 조회
  const { data: student } = await supabase
    .from("students")
    .select("name")
    .eq("id", studentId)
    .single()

  // 추천인 이름 조회
  let referrerName = null
  if (options?.referrerStudentId) {
    const { data: referrer } = await supabase
      .from("students")
      .select("name")
      .eq("id", options.referrerStudentId)
      .single()
    referrerName = referrer?.name || null
  }

  const { data: participant, error } = await supabase
    .from("campaign_participants")
    .insert({
      campaign_id: campaignId,
      student_id: studentId,
      referrer_student_id: options?.referrerStudentId || null,
      referrer_name_snapshot: referrerName,
      participated_at: options?.participatedAt || new Date().toISOString().split("T")[0],
      reward_amount: options?.rewardAmount ?? campaign?.reward_amount ?? 0,
      reward_amount_type: options?.rewardAmountType ?? campaign?.reward_amount_type ?? "fixed",
      reward_status: "pending",
      student_name_snapshot: student?.name || null,
      created_by: options?.createdBy || null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "이미 참여한 학생입니다" }
    }
    console.error("[CampaignService] addParticipant error:", error)
    return { success: false, error: error.message }
  }

  return { success: true, data: participant }
}

export async function removeParticipant(
  supabase: SupabaseClient,
  participantId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("campaign_participants")
    .delete()
    .eq("id", participantId)

  if (error) {
    console.error("[CampaignService] removeParticipant error:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function updateParticipant(
  supabase: SupabaseClient,
  participantId: string,
  data: {
    reward_status?: RewardStatus
    reward_amount?: number
    reward_amount_type?: RewardAmountType
    participated_at?: string
    reward_notes?: string
  }
): Promise<{ success: boolean; data?: CampaignParticipant; error?: string }> {
  const updateData: any = { ...data }

  // 상태 변경 시 관련 필드 업데이트
  if (data.reward_status === "paid" || data.reward_status === "applied") {
    updateData.reward_paid_at = new Date().toISOString()
  }

  const { data: participant, error } = await supabase
    .from("campaign_participants")
    .update(updateData)
    .eq("id", participantId)
    .select()
    .single()

  if (error) {
    console.error("[CampaignService] updateParticipant error:", error)
    return { success: false, error: error.message }
  }

  return { success: true, data: participant }
}

export async function getParticipants(
  supabase: SupabaseClient,
  campaignId: string
): Promise<{ success: boolean; data?: CampaignParticipant[]; error?: string }> {
  const { data, error } = await supabase
    .from("campaign_participants")
    .select(`
      *,
      student:students!campaign_participants_student_id_fkey(id, name)
    `)
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[CampaignService] getParticipants error:", error)
    return { success: false, error: error.message }
  }

  return { success: true, data: data || [] }
}

export async function getStudentParticipations(
  supabase: SupabaseClient,
  studentId: string,
  status?: RewardStatus
): Promise<{ success: boolean; data?: CampaignParticipant[]; error?: string }> {
  let query = supabase
    .from("campaign_participants")
    .select(`
      *,
      campaign:marketing_campaigns(*)
    `)
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })

  if (status) {
    query = query.eq("reward_status", status)
  }

  const { data, error } = await query

  if (error) {
    console.error("[CampaignService] getStudentParticipations error:", error)
    return { success: false, error: error.message }
  }

  return { success: true, data: data || [] }
}

// ============ 혜택 처리 ============

export async function markRewardPaid(
  supabase: SupabaseClient,
  participantId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("campaign_participants")
    .update({
      reward_status: "paid",
      reward_paid_at: new Date().toISOString(),
    })
    .eq("id", participantId)

  if (error) {
    console.error("[CampaignService] markRewardPaid error:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// 혜택을 '적용됨'으로 표시 (학원비 생성 페이지용 - 임시 데이터에서 사용)
export async function markRewardApplied(
  supabase: SupabaseClient,
  participantId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("campaign_participants")
    .update({
      reward_status: "applied",
      reward_paid_at: new Date().toISOString(),
    })
    .eq("id", participantId)

  if (error) {
    console.error("[CampaignService] markRewardApplied error:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function applyRewardToTuition(
  supabase: SupabaseClient,
  participantId: string,
  tuitionFeeId: string
): Promise<{ success: boolean; error?: string }> {
  // 1. 참여자 정보 조회
  const { data: participant, error: pError } = await supabase
    .from("campaign_participants")
    .select(`
      *,
      campaign:marketing_campaigns(title)
    `)
    .eq("id", participantId)
    .single()

  if (pError || !participant) {
    return { success: false, error: "참여자를 찾을 수 없습니다" }
  }

  if (participant.reward_status === "applied") {
    return { success: false, error: "이미 적용된 혜택입니다" }
  }

  // 2. 학원비 정보 조회 (note, base_amount, total_discount 포함)
  const { data: tuitionFee, error: tError } = await supabase
    .from("tuition_fees")
    .select("discount_details, amount, base_amount, total_discount, note")
    .eq("id", tuitionFeeId)
    .single()

  if (tError || !tuitionFee) {
    return { success: false, error: "학원비를 찾을 수 없습니다" }
  }

  // 3. 할인 금액 계산 (퍼센트 할인 지원)
  const amountType = participant.reward_amount_type || "fixed"
  // 기존 base_amount가 있으면 그것을 기준으로, 없으면 현재 amount 기준
  const baseAmount = tuitionFee.base_amount || tuitionFee.amount
  let discountAmount: number

  if (amountType === "percent") {
    // 퍼센트 할인: base_amount 기준
    discountAmount = Math.round(baseAmount * (participant.reward_amount / 100))
  } else {
    // 고정 금액 할인
    discountAmount = participant.reward_amount
  }

  // 4. discount_details에 추가
  const eventTitle = (participant.campaign as any)?.title || "이벤트"
  const discountDescription = amountType === "percent"
    ? `${eventTitle} (${participant.reward_amount}%)`
    : eventTitle

  const currentDetails: DiscountDetail[] = tuitionFee.discount_details || []
  const newDiscount: DiscountDetail = {
    type: "event",
    amount: discountAmount,
    amount_type: amountType,
    campaign_id: participant.campaign_id,
    participant_id: participantId,
    description: discountDescription,
  }

  // 5. 업데이트할 값 계산
  const newTotalDiscount = (tuitionFee.total_discount || 0) + discountAmount
  const newFinalAmount = baseAmount - newTotalDiscount

  // 6. note 업데이트 (할인 정보 추가)
  const discountText = amountType === "percent"
    ? `${participant.reward_amount}% (${discountAmount.toLocaleString()}원)`
    : `${discountAmount.toLocaleString()}원`
  const notePrefix = tuitionFee.note ? `${tuitionFee.note} / ` : ""
  const newNote = `${notePrefix}${eventTitle} ${discountText} 적용`

  // 7. DB 업데이트
  const { error: updateError } = await supabase
    .from("tuition_fees")
    .update({
      discount_details: [...currentDetails, newDiscount],
      base_amount: baseAmount,
      total_discount: newTotalDiscount,
      amount: newFinalAmount,
      final_amount: newFinalAmount,
      note: newNote,
    })
    .eq("id", tuitionFeeId)

  if (updateError) {
    console.error("[CampaignService] applyRewardToTuition update error:", updateError)
    return { success: false, error: updateError.message }
  }

  // 8. 참여자 상태 업데이트
  const { error: statusError } = await supabase
    .from("campaign_participants")
    .update({
      reward_status: "applied",
      reward_applied_tuition_id: tuitionFeeId,
      reward_paid_at: new Date().toISOString(),
    })
    .eq("id", participantId)

  if (statusError) {
    console.error("[CampaignService] applyRewardToTuition status error:", statusError)
    return { success: false, error: statusError.message }
  }

  return { success: true }
}

export async function getPendingRewards(
  supabase: SupabaseClient,
  options?: { studentId?: string }
): Promise<{ success: boolean; data?: CampaignParticipant[]; error?: string }> {
  let query = supabase
    .from("campaign_participants")
    .select(`
      *,
      student:students!campaign_participants_student_id_fkey(id, name),
      campaign:marketing_campaigns(id, title, reward_type)
    `)
    .eq("reward_status", "pending")
    .order("created_at", { ascending: false })

  if (options?.studentId) {
    query = query.eq("student_id", options.studentId)
  }

  const { data, error } = await query

  if (error) {
    console.error("[CampaignService] getPendingRewards error:", error)
    return { success: false, error: error.message }
  }

  return { success: true, data: data || [] }
}

// ============ 통계 (ROI) ============

export async function getCampaignStats(
  supabase: SupabaseClient,
  campaignId: string
): Promise<{
  success: boolean
  data?: {
    participantCount: number
    pendingCount: number
    paidCount: number
    appliedCount: number
    totalRewardAmount: number
  }
  error?: string
}> {
  const { data, error } = await supabase
    .from("campaign_participants")
    .select("reward_status, reward_amount")
    .eq("campaign_id", campaignId)

  if (error) {
    console.error("[CampaignService] getCampaignStats error:", error)
    return { success: false, error: error.message }
  }

  const stats = {
    participantCount: data?.length || 0,
    pendingCount: data?.filter((p) => p.reward_status === "pending").length || 0,
    paidCount: data?.filter((p) => p.reward_status === "paid").length || 0,
    appliedCount: data?.filter((p) => p.reward_status === "applied").length || 0,
    totalRewardAmount: data?.reduce((sum, p) => sum + (p.reward_amount || 0), 0) || 0,
  }

  return { success: true, data: stats }
}

// 전체 이벤트 통계 (고객이벤트 탭 상단용)
export async function getAllEventStats(
  supabase: SupabaseClient
): Promise<{
  success: boolean
  data?: {
    total: number
    pending: number
    paid: number
    applied: number
  }
  error?: string
}> {
  // 이벤트 타입 캠페인의 모든 참여자 조회
  const { data, error } = await supabase
    .from("campaign_participants")
    .select(`
      reward_status,
      campaign:marketing_campaigns!inner(campaign_type)
    `)
    .eq("campaign.campaign_type", "event")

  if (error) {
    console.error("[CampaignService] getAllEventStats error:", error)
    return { success: false, error: error.message }
  }

  const stats = {
    total: data?.length || 0,
    pending: data?.filter((p) => p.reward_status === "pending").length || 0,
    paid: data?.filter((p) => p.reward_status === "paid").length || 0,
    applied: data?.filter((p) => p.reward_status === "applied").length || 0,
  }

  return { success: true, data: stats }
}

export async function getPromoROI(
  supabase: SupabaseClient,
  dateRange?: { start: string; end: string }
): Promise<{
  success: boolean
  data?: Array<{
    campaign: Campaign
    leadCount: number
    enrollmentCount: number
    costPerLead: number
    costPerEnrollment: number
  }>
  error?: string
}> {
  // 홍보 캠페인 조회
  let query = supabase
    .from("marketing_campaigns")
    .select("*")
    .eq("campaign_type", "promo")

  if (dateRange) {
    query = query.gte("start_date", dateRange.start).lte("start_date", dateRange.end)
  }

  const { data: campaigns, error } = await query

  if (error) {
    console.error("[CampaignService] getPromoROI error:", error)
    return { success: false, error: error.message }
  }

  // TODO: 학생 유입 추적을 위해 students.marketing_campaign_id 연동 필요
  // 현재는 캠페인 기본 정보만 반환
  const roiData = (campaigns || []).map((campaign) => ({
    campaign,
    leadCount: campaign.reach_count || 0, // 임시: reach_count 사용
    enrollmentCount: 0,
    costPerLead: campaign.reach_count > 0 ? (campaign.cost_amount || 0) / campaign.reach_count : 0,
    costPerEnrollment: 0,
  }))

  return { success: true, data: roiData }
}

// ============ 할인 관리 헬퍼 ============

export async function removeDiscountFromTuition(
  supabase: SupabaseClient,
  tuitionFeeId: string,
  participantId: string
): Promise<{ success: boolean; error?: string }> {
  // 1. 학원비 조회 (note, amount, total_discount도 포함)
  const { data: tuitionFee, error: tError } = await supabase
    .from("tuition_fees")
    .select("discount_details, note, amount, base_amount, total_discount")
    .eq("id", tuitionFeeId)
    .single()

  if (tError || !tuitionFee) {
    return { success: false, error: "학원비를 찾을 수 없습니다" }
  }

  // 2. discount_details에서 해당 할인 찾기 및 제거
  const currentDetails: DiscountDetail[] = tuitionFee.discount_details || []
  const removedDiscount = currentDetails.find(
    (d) => d.participant_id === participantId || d.campaign_id === participantId
  )

  if (!removedDiscount) {
    return { success: false, error: "해당 할인을 찾을 수 없습니다" }
  }

  const updatedDetails = currentDetails.filter(
    (d) => d.participant_id !== participantId && d.campaign_id !== participantId
  )

  // 3. 금액 복원 계산
  const discountAmount = removedDiscount.amount || 0
  const newAmount = (tuitionFee.amount || 0) + discountAmount
  const newTotalDiscount = Math.max(0, (tuitionFee.total_discount || 0) - discountAmount)

  // 4. note에서 할인 정보만 정확히 제거 (다른 메모는 유지)
  let newNote = tuitionFee.note || ""
  if (newNote) {
    // 제거할 할인 정보 식별을 위한 키워드 준비
    const discountDesc = removedDiscount.description || ""
    // description에서 기본 제목 추출 (괄호 부분 제거)
    // 예: "형제할인 (10%)" → "형제할인", "동시수강 과학 할인" → "동시수강 과학 할인"
    const baseTitle = discountDesc.replace(/\s*\([^)]*\)\s*$/, '').trim()
    // 할인 금액 포맷 (쉼표 포함)
    const amountFormatted = discountAmount.toLocaleString()

    // 슬래시(/)만 구분자로 사용 (앞뒤 공백 유무 상관없이 처리)
    // 예: "할인 적용 / 기타메모", "할인 적용/기타", "할인 적용 /기타" 모두 처리
    const parts = newNote.split(/\s*\/\s*/)
    const separator = ' / '

    const filteredParts = parts.filter(part => {
      const trimmedPart = part.trim()

      // 빈 문자열은 제거
      if (!trimmedPart) return false

      // "적용"으로 끝나는 할인 관련 메모인지 확인
      if (trimmedPart.endsWith('적용')) {
        // 방법 1: 기본 제목으로 매칭 (예: "동시수강 과학 할인 20,000원 적용")
        if (baseTitle) {
          const escapedTitle = baseTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          // 제목으로 시작하거나 제목을 포함하는 경우
          if (new RegExp(`^${escapedTitle}`, 'i').test(trimmedPart) ||
              trimmedPart.includes(baseTitle)) {
            return false // 해당 할인 제거
          }
        }

        // 방법 2: 할인 금액으로 매칭 (예: "xxx 20,000원 적용")
        if (amountFormatted && trimmedPart.includes(amountFormatted + '원')) {
          return false // 해당 할인 제거
        }
      }

      // 매칭되지 않으면 유지
      return true
    })

    newNote = filteredParts.join(separator).trim()

    // 앞뒤 구분자 정리
    newNote = newNote.replace(/^[\s\/]+|[\s\/]+$/g, '').trim()
  }

  // 5. DB 업데이트
  const { error: updateError } = await supabase
    .from("tuition_fees")
    .update({
      discount_details: updatedDetails,
      amount: newAmount,
      total_discount: newTotalDiscount,
      final_amount: newAmount,
      note: newNote || null,
    })
    .eq("id", tuitionFeeId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // 6. 참여자 상태 되돌리기 (이벤트 할인인 경우에만)
  if (removedDiscount?.participant_id) {
    const { error: statusError } = await supabase
      .from("campaign_participants")
      .update({
        reward_status: "pending",
        reward_applied_tuition_id: null,
        reward_paid_at: null,
      })
      .eq("id", participantId)

    if (statusError) {
      console.warn("참여자 상태 업데이트 실패:", statusError.message)
      // 참여자 업데이트 실패해도 할인 제거는 성공으로 처리
    }
  }

  return { success: true }
}

// ============ 할인 정책 관리 ============

// 할인정책 조회
export async function getPolicies(
  supabase: SupabaseClient,
  options?: { status?: CampaignStatus }
): Promise<{ success: boolean; data?: Campaign[]; error?: string }> {
  let query = supabase
    .from("marketing_campaigns")
    .select("*")
    .eq("campaign_type", "policy")
    .order("created_at", { ascending: false })

  if (options?.status) {
    query = query.eq("status", options.status)
  }

  const { data, error } = await query

  if (error) {
    console.error("[CampaignService] getPolicies error:", error)
    return { success: false, error: error.message }
  }

  return { success: true, data: data || [] }
}

// 학생에게 적용 가능한 정책 필터링
export async function getApplicablePolicies(
  supabase: SupabaseClient,
  studentId: string
): Promise<{ success: boolean; data?: Campaign[]; error?: string }> {
  // 1. 활성 정책 조회
  const { data: policies, error: pError } = await supabase
    .from("marketing_campaigns")
    .select("*")
    .eq("campaign_type", "policy")
    .eq("status", "active")
    .order("created_at", { ascending: false })

  if (pError) {
    console.error("[CampaignService] getApplicablePolicies error:", pError)
    return { success: false, error: pError.message }
  }

  if (!policies || policies.length === 0) {
    return { success: true, data: [] }
  }

  // 2. 학생 정보 조회 (형제 정책 확인용)
  const { data: student, error: sError } = await supabase
    .from("students")
    .select("parent_phone")
    .eq("id", studentId)
    .single()

  if (sError || !student) {
    // 학생 정보가 없으면 일반 정책만 반환
    return {
      success: true,
      data: policies.filter(
        (p) => p.policy_target !== "sibling" && p.policy_target !== "dual_subject"
      ),
    }
  }

  // 3. 형제 정책 적용 가능 여부 확인
  let hasSibling = false
  if (student.parent_phone) {
    const { count } = await supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("parent_phone", student.parent_phone)
      .eq("status", "재원")

    hasSibling = (count || 0) >= 2
  }

  // 4. 동시수강 할인 적용 가능 여부 확인 (수학 + 과학 수강 시)
  let hasDualSubject = false
  const { data: enrolledClasses } = await supabase
    .from("class_students")
    .select("class:classes(name, subject)")
    .eq("student_id", studentId)

  if (enrolledClasses && enrolledClasses.length > 0) {
    const subjects = enrolledClasses
      .map((ec) => {
        const classData = ec.class as unknown as { name: string; subject: string } | null
        return classData?.subject || ""
      })
      .filter(Boolean)

    // 수학 관련 과목: "수학", "수학특강"
    const hasMath = subjects.some((subject) => subject.includes("수학"))
    // 과학 관련 과목: "과학", "과학특강"
    const hasScience = subjects.some((subject) => subject.includes("과학"))
    hasDualSubject = hasMath && hasScience
  }

  // 5. 적용 가능한 정책 필터링
  const applicablePolicies = policies.filter((policy) => {
    if (policy.policy_target === "sibling") {
      return hasSibling
    }
    if (policy.policy_target === "dual_subject") {
      return hasDualSubject
    }
    return true // 다른 정책은 항상 적용 가능
  })

  return { success: true, data: applicablePolicies }
}

// 여러 학생에 대해 적용 가능한 정책을 한번에 조회 (배치 버전 - 성능 최적화)
export async function getApplicablePoliciesBatch(
  supabase: SupabaseClient,
  studentIds: string[]
): Promise<{ success: boolean; data?: Record<string, Campaign[]>; error?: string }> {
  if (studentIds.length === 0) {
    return { success: true, data: {} }
  }

  // 1. 활성 정책 조회 (한 번만)
  const { data: policies, error: pError } = await supabase
    .from("marketing_campaigns")
    .select("*")
    .eq("campaign_type", "policy")
    .eq("status", "active")
    .order("created_at", { ascending: false })

  if (pError) {
    console.error("[CampaignService] getApplicablePoliciesBatch error:", pError)
    return { success: false, error: pError.message }
  }

  if (!policies || policies.length === 0) {
    // 정책이 없으면 모든 학생에게 빈 배열
    const emptyResult: Record<string, Campaign[]> = {}
    studentIds.forEach(id => { emptyResult[id] = [] })
    return { success: true, data: emptyResult }
  }

  // 2. 모든 학생 정보 한번에 조회
  const { data: students } = await supabase
    .from("students")
    .select("id, parent_phone")
    .in("id", studentIds)

  const studentMap = new Map<string, string | null>()
  students?.forEach(s => studentMap.set(s.id, s.parent_phone))

  // 3. 형제 여부 판단을 위해 parent_phone별 재원 학생 수 조회
  const parentPhones = [...new Set(students?.map(s => s.parent_phone).filter(Boolean) || [])]
  const siblingCounts = new Map<string, number>()

  if (parentPhones.length > 0) {
    const { data: siblingData } = await supabase
      .from("students")
      .select("parent_phone")
      .in("parent_phone", parentPhones)
      .eq("status", "재원")

    siblingData?.forEach(s => {
      if (s.parent_phone) {
        siblingCounts.set(s.parent_phone, (siblingCounts.get(s.parent_phone) || 0) + 1)
      }
    })
  }

  // 4. 모든 학생의 수강 과목 한번에 조회
  const { data: allEnrollments } = await supabase
    .from("class_students")
    .select("student_id, class:classes(subject)")
    .in("student_id", studentIds)

  const studentSubjects = new Map<string, Set<string>>()
  allEnrollments?.forEach(e => {
    const subject = (e.class as any)?.subject || ""
    if (subject) {
      if (!studentSubjects.has(e.student_id)) {
        studentSubjects.set(e.student_id, new Set())
      }
      studentSubjects.get(e.student_id)!.add(subject)
    }
  })

  // 5. 각 학생별로 적용 가능한 정책 필터링
  const result: Record<string, Campaign[]> = {}

  for (const studentId of studentIds) {
    const parentPhone = studentMap.get(studentId)
    const hasSibling = parentPhone ? (siblingCounts.get(parentPhone) || 0) >= 2 : false

    const subjects = studentSubjects.get(studentId) || new Set()
    const hasMath = [...subjects].some(s => s.includes("수학"))
    const hasScience = [...subjects].some(s => s.includes("과학"))
    const hasDualSubject = hasMath && hasScience

    result[studentId] = policies.filter(policy => {
      if (policy.policy_target === "sibling") return hasSibling
      if (policy.policy_target === "dual_subject") return hasDualSubject
      return true
    })
  }

  return { success: true, data: result }
}

// 정책을 학원비에 적용 (로컬 discount_details용 - 저장 전 UI 업데이트)
export function calculatePolicyDiscount(
  policy: Campaign,
  baseAmount: number
): { discountAmount: number; discountDetail: DiscountDetail } {
  const amountType = policy.reward_amount_type || "fixed"
  let discountAmount: number

  if (amountType === "percent") {
    discountAmount = Math.round(baseAmount * (policy.reward_amount / 100))
  } else {
    discountAmount = policy.reward_amount
  }

  const discountDetail: DiscountDetail = {
    type: "policy",
    amount: discountAmount,
    amount_type: amountType,
    campaign_id: policy.id,
    description:
      amountType === "percent"
        ? `${policy.title} (${policy.reward_amount}%)`
        : policy.title,
  }

  return { discountAmount, discountDetail }
}

// 정책 생성 헬퍼 (폼 데이터 기반)
export interface CreatePolicyData {
  title: string
  description?: string
  policy_target: PolicyTarget
  reward_amount: number
  reward_amount_type: RewardAmountType
  status?: CampaignStatus
  created_by?: string
}

export async function createPolicy(
  supabase: SupabaseClient,
  data: CreatePolicyData
): Promise<{ success: boolean; data?: Campaign; error?: string }> {
  const { data: policy, error } = await supabase
    .from("marketing_campaigns")
    .insert({
      title: data.title,
      description: data.description || null,
      campaign_type: "policy",
      status: data.status || "active",
      start_date: new Date().toISOString().split("T")[0],
      reward_type: "tuition_discount",
      reward_amount: data.reward_amount,
      reward_amount_type: data.reward_amount_type,
      policy_target: data.policy_target,
      created_by: data.created_by || null,
    })
    .select()
    .single()

  if (error) {
    console.error("[CampaignService] createPolicy error:", error)
    return { success: false, error: error.message }
  }

  return { success: true, data: policy }
}

// 정책 업데이트
export interface UpdatePolicyData {
  title?: string
  description?: string
  policy_target?: PolicyTarget
  reward_amount?: number
  reward_amount_type?: RewardAmountType
  status?: CampaignStatus
}

export async function updatePolicy(
  supabase: SupabaseClient,
  id: string,
  data: UpdatePolicyData
): Promise<{ success: boolean; data?: Campaign; error?: string }> {
  const { data: policy, error } = await supabase
    .from("marketing_campaigns")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("campaign_type", "policy")
    .select()
    .single()

  if (error) {
    console.error("[CampaignService] updatePolicy error:", error)
    return { success: false, error: error.message }
  }

  return { success: true, data: policy }
}

// 정책 삭제
export async function deletePolicy(
  supabase: SupabaseClient,
  id: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("marketing_campaigns")
    .delete()
    .eq("id", id)
    .eq("campaign_type", "policy")

  if (error) {
    console.error("[CampaignService] deletePolicy error:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// 정책을 기존 학원비에 적용 (이력 페이지용 - DB 직접 업데이트)
export async function applyPolicyToTuition(
  supabase: SupabaseClient,
  policyId: string,
  tuitionFeeId: string
): Promise<{ success: boolean; error?: string }> {
  // 1. 정책 정보 조회
  const { data: policy, error: pError } = await supabase
    .from("marketing_campaigns")
    .select("*")
    .eq("id", policyId)
    .eq("campaign_type", "policy")
    .single()

  if (pError || !policy) {
    return { success: false, error: "정책을 찾을 수 없습니다" }
  }

  // 2. 학원비 정보 조회 (note 포함)
  const { data: tuitionFee, error: tError } = await supabase
    .from("tuition_fees")
    .select("discount_details, amount, base_amount, total_discount, note")
    .eq("id", tuitionFeeId)
    .single()

  if (tError || !tuitionFee) {
    return { success: false, error: "학원비를 찾을 수 없습니다" }
  }

  // 3. 이미 적용된 정책인지 확인
  const currentDetails: DiscountDetail[] = tuitionFee.discount_details || []
  const alreadyApplied = currentDetails.some((d) => d.campaign_id === policyId)

  if (alreadyApplied) {
    return { success: false, error: "이미 적용된 할인 정책입니다" }
  }

  // 4. 할인 금액 계산
  const amountType = policy.reward_amount_type || "fixed"
  // 기존 base_amount가 있으면 그것을 기준으로, 없으면 현재 amount 기준
  const baseAmount = tuitionFee.base_amount || tuitionFee.amount
  let discountAmount: number

  if (amountType === "percent") {
    discountAmount = Math.round(baseAmount * (policy.reward_amount / 100))
  } else {
    discountAmount = policy.reward_amount
  }

  // 5. 새 discount_detail 생성
  const policyTitle = policy.title || "할인정책"
  const discountDescription = amountType === "percent"
    ? `${policyTitle} (${policy.reward_amount}%)`
    : policyTitle

  const newDiscount: DiscountDetail = {
    type: "policy",
    amount: discountAmount,
    amount_type: amountType,
    campaign_id: policyId,
    description: discountDescription,
  }

  // 6. 업데이트할 값 계산
  const newTotalDiscount = (tuitionFee.total_discount || 0) + discountAmount
  const newFinalAmount = baseAmount - newTotalDiscount

  // 7. note 업데이트 (할인 정보 추가)
  const discountText = amountType === "percent"
    ? `${policy.reward_amount}% (${discountAmount.toLocaleString()}원)`
    : `${discountAmount.toLocaleString()}원`
  const notePrefix = tuitionFee.note ? `${tuitionFee.note} / ` : ""
  const newNote = `${notePrefix}${policyTitle} ${discountText} 적용`

  // 8. DB 업데이트
  const { error: updateError } = await supabase
    .from("tuition_fees")
    .update({
      discount_details: [...currentDetails, newDiscount],
      base_amount: baseAmount,
      total_discount: newTotalDiscount,
      amount: newFinalAmount,
      final_amount: newFinalAmount,
      note: newNote,
    })
    .eq("id", tuitionFeeId)

  if (updateError) {
    console.error("[CampaignService] applyPolicyToTuition update error:", updateError)
    return { success: false, error: updateError.message }
  }

  return { success: true }
}
