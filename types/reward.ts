/**
 * 마케팅/보상/학원비 통합 시스템 타입 정의
 */

// 보상 역할
export type RewardRole = 'referrer' | 'referee' | 'participant'

// 보상 유형
export type RewardType = 'cash' | 'tuition_discount' | 'gift_card' | 'free_class' | 'other'

// 금액 유형
export type AmountType = 'fixed' | 'percent'

// 보상 상태
export type RewardStatus = 'pending' | 'paid' | 'applied' | 'cancelled'

// 할인 유형
export type DiscountType = 'sibling' | 'marketing' | 'referral' | 'special' | 'other'

// 보상 템플릿 (마케팅 활동별 보상 설정)
export interface RewardTemplate {
  id: string
  marketing_activity_id: string
  role: RewardRole
  reward_type: RewardType
  amount_type: AmountType
  reward_amount: number  // fixed: 원, percent: % 값
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// 보상 템플릿 생성 데이터
export interface CreateRewardTemplateData {
  marketing_activity_id: string
  role: RewardRole
  reward_type: RewardType
  amount_type?: AmountType
  reward_amount: number
  description?: string
  is_active?: boolean
}

// 보상 (실제 발생한 보상 내역)
export interface Reward {
  id: string
  student_id: string
  marketing_activity_id: string | null
  referral_id: string | null
  participant_id: string | null
  role: RewardRole
  reward_type: RewardType
  amount_type: AmountType
  reward_amount: number  // 최대 한도
  description: string | null
  status: RewardStatus
  paid_at: string | null
  paid_by: string | null
  applied_tuition_fee_id: string | null
  applied_at: string | null
  notes: string | null
  student_name_snapshot: string | null
  activity_title_snapshot: string | null
  created_at: string
  created_by: string | null
  updated_at: string
  // 조인 데이터
  student?: { id: string; name: string; status?: string }
  marketing_activity?: { id: string; title: string }
  referral?: { id: string; referrer_name_snapshot: string; referred_name_snapshot: string }
}

// 보상 생성 데이터
export interface CreateRewardData {
  student_id: string
  marketing_activity_id?: string
  referral_id?: string
  participant_id?: string
  role: RewardRole
  reward_type: RewardType
  amount_type?: AmountType
  reward_amount: number
  description?: string | null
  notes?: string | null
  student_name_snapshot?: string | null
  activity_title_snapshot?: string | null
}

// 학원비 할인 내역
export interface TuitionDiscount {
  id: string
  tuition_fee_id: string
  discount_type: DiscountType
  discount_amount: number  // 실제 적용 금액 (Truth Source)
  discount_percentage: number | null
  reward_id: string | null
  description: string | null
  created_at: string
  created_by: string | null
  // 조인 데이터
  reward?: Reward
}

// 할인 생성 데이터
export interface CreateTuitionDiscountData {
  tuition_fee_id: string
  discount_type: DiscountType
  discount_amount: number
  discount_percentage?: number
  reward_id?: string
  description?: string
}

// 보상 통계
export interface RewardStats {
  totalRewards: number
  pendingCount: number
  paidCount: number
  appliedCount: number
  cancelledCount: number
  totalCashAmount: number
  totalTuitionDiscount: number
  byRewardType: Record<RewardType, number>
  byRole: Record<RewardRole, number>
}

// 미지급 보상 필터 옵션
export interface PendingRewardsFilter {
  thisMonth?: boolean
  recentMonths?: number
  activityId?: string
  studentId?: string
  rewardType?: RewardType
}

// 라벨 매핑
export const REWARD_ROLE_LABELS: Record<RewardRole, string> = {
  referrer: '추천인',
  referee: '피추천인',
  participant: '참가자',
}

export const REWARD_TYPE_LABELS: Record<RewardType, string> = {
  cash: '현금',
  tuition_discount: '학원비 할인',
  gift_card: '상품권',
  free_class: '무료 수업',
  other: '기타',
}

export const AMOUNT_TYPE_LABELS: Record<AmountType, string> = {
  fixed: '정액',
  percent: '퍼센트',
}

export const REWARD_STATUS_LABELS: Record<RewardStatus, string> = {
  pending: '대기',
  paid: '지급완료',
  applied: '적용완료',
  cancelled: '취소',
}

export const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
  sibling: '형제 할인',
  marketing: '마케팅 할인',
  referral: '추천 할인',
  special: '특별 할인',
  other: '기타',
}

// 보상 상태 색상
export function getRewardStatusColor(status: RewardStatus): string {
  switch (status) {
    case 'pending':
      return 'bg-yellow-50 text-yellow-700 border-yellow-200'
    case 'paid':
      return 'bg-green-50 text-green-700 border-green-200'
    case 'applied':
      return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'cancelled':
      return 'bg-gray-50 text-gray-500 border-gray-200'
    default:
      return 'bg-gray-50 text-gray-500 border-gray-200'
  }
}

// 보상 역할 색상
export function getRewardRoleColor(role: RewardRole): string {
  switch (role) {
    case 'referrer':
      return 'bg-purple-50 text-purple-700 border-purple-200'
    case 'referee':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200'
    case 'participant':
      return 'bg-cyan-50 text-cyan-700 border-cyan-200'
    default:
      return 'bg-gray-50 text-gray-500 border-gray-200'
  }
}

// 금액 포맷팅 헬퍼
export function formatRewardAmount(amount: number, amountType: AmountType): string {
  if (amountType === 'percent') {
    return `${amount}%`
  }
  return `${amount.toLocaleString()}원`
}
