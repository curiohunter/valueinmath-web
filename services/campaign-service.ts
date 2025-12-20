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

  // 2. 학원비 정보 조회
  const { data: tuitionFee, error: tError } = await supabase
    .from("tuition_fees")
    .select("discount_details, amount")
    .eq("id", tuitionFeeId)
    .single()

  if (tError || !tuitionFee) {
    return { success: false, error: "학원비를 찾을 수 없습니다" }
  }

  // 3. 할인 금액 계산 (퍼센트 할인 지원)
  const amountType = participant.reward_amount_type || "fixed"
  let discountAmount: number

  if (amountType === "percent") {
    // 퍼센트 할인: 현재 학원비 * (할인율 / 100)
    discountAmount = Math.round(tuitionFee.amount * (participant.reward_amount / 100))
  } else {
    // 고정 금액 할인
    discountAmount = participant.reward_amount
  }

  // 4. discount_details에 추가
  const currentDetails: DiscountDetail[] = tuitionFee.discount_details || []
  const newDiscount: DiscountDetail = {
    type: "event",
    amount: discountAmount,
    amount_type: amountType,
    campaign_id: participant.campaign_id,
    participant_id: participantId,
    description: amountType === "percent"
      ? `${(participant.campaign as any)?.title || "이벤트"} (${participant.reward_amount}%)`
      : (participant.campaign as any)?.title || "이벤트 할인",
  }

  const { error: updateError } = await supabase
    .from("tuition_fees")
    .update({
      discount_details: [...currentDetails, newDiscount],
    })
    .eq("id", tuitionFeeId)

  if (updateError) {
    console.error("[CampaignService] applyRewardToTuition update error:", updateError)
    return { success: false, error: updateError.message }
  }

  // 4. 참여자 상태 업데이트
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
  // 1. 학원비 조회
  const { data: tuitionFee, error: tError } = await supabase
    .from("tuition_fees")
    .select("discount_details")
    .eq("id", tuitionFeeId)
    .single()

  if (tError || !tuitionFee) {
    return { success: false, error: "학원비를 찾을 수 없습니다" }
  }

  // 2. discount_details에서 해당 할인 제거
  const currentDetails: DiscountDetail[] = tuitionFee.discount_details || []
  const updatedDetails = currentDetails.filter(
    (d) => d.participant_id !== participantId
  )

  const { error: updateError } = await supabase
    .from("tuition_fees")
    .update({ discount_details: updatedDetails })
    .eq("id", tuitionFeeId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // 3. 참여자 상태 되돌리기
  const { error: statusError } = await supabase
    .from("campaign_participants")
    .update({
      reward_status: "pending",
      reward_applied_tuition_id: null,
      reward_paid_at: null,
    })
    .eq("id", participantId)

  if (statusError) {
    return { success: false, error: statusError.message }
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
      data: policies.filter((p) => p.policy_target !== "sibling"),
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

  // 4. 적용 가능한 정책 필터링
  const applicablePolicies = policies.filter((policy) => {
    if (policy.policy_target === "sibling") {
      return hasSibling
    }
    return true // 다른 정책은 항상 적용 가능
  })

  return { success: true, data: applicablePolicies }
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
