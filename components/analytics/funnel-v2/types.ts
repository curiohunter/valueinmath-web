/**
 * Funnel Action Center v2 Types
 * 퍼널 액션 센터 타입 정의
 */

// ============================================
// 학생 팔로업 데이터
// ============================================

export type ActionPriority = 'urgent' | 'high' | 'medium' | 'low'

export interface StudentFollowup {
  id: string
  name: string
  school: string | null
  school_type: string | null
  grade: number | null
  parent_phone: string | null
  student_phone: string | null
  lead_source: string | null
  funnel_stage: string | null
  status: string | null
  first_contact_date: string | null

  // 상담 통계
  last_consultation_date: string | null
  days_since_last_contact: number | null
  total_consultations: number
  phone_count: number
  text_count: number
  visit_count: number
  last_counselor_name: string | null

  // AI 분석 결과 (마지막 상담 기준)
  ai_hurdle: string | null
  ai_readiness: string | null
  ai_decision_maker: string | null
  ai_sentiment: string | null

  // 권장 액션
  recommended_action: string
  recommended_reason: string
  recommended_contact: string
  action_priority: ActionPriority

  // 추가 필드
  next_contact_due_date: string | null
  can_call_now: boolean
}

export interface FollowupData {
  success: boolean
  total: number
  students: StudentFollowup[]
  summary: {
    urgent: number
    high: number
    medium: number
    low: number
  }
}

// ============================================
// 타임라인 데이터
// ============================================

export interface TimelineItem {
  type: 'consultation' | 'entrance_test'
  date: string
  data: ConsultationData | EntranceTestData
}

export interface ConsultationData {
  id: string
  consultationType: string
  method: string | null
  content: string | null
  status: string | null
  nextAction: string | null
  nextDate: string | null
  counselorName: string
  aiHurdle: string | null
  aiReadiness: string | null
  aiDecisionMaker: string | null
  aiSentiment: string | null
  aiAnalyzed: boolean
}

export interface EntranceTestData {
  id: string
  studentId: string
  test1Level: string | null
  test2Level: string | null
  test1Score: number | null
  test2Score: number | null
  testResult: string | null
  status: string | null
  recommendedClass: string | null
  notes: string | null
}

// ============================================
// AI 제안 데이터
// ============================================

export interface AISuggestion {
  recommendedChannel: 'phone' | 'text' | 'kakao' | 'visit'
  recommendedTiming: string
  keyMessage: string
  script: string
  confidence: number
  reasoning: string
}

export interface AISuggestionResponse {
  success: boolean
  suggestion: AISuggestion
  cost: {
    tokensIn: number
    tokensOut: number
    estimatedCostUsd: number
  }
}

export interface AISuggestionCache {
  suggestion: AISuggestion
  cachedAt: number
  studentContext: string
}

// ============================================
// UI 색상 상수 (Single Source of Truth)
// ============================================

export const URGENCY_COLORS = {
  urgent: {
    bg: 'bg-red-50',
    text: 'text-red-600',
    dot: '#FF4D4F',
    border: 'border-red-200',
    days: '30일 이상',
    label: '즉시 연락',
  },
  high: {
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    dot: '#FAAD14',
    border: 'border-orange-200',
    days: '14-30일',
    label: '금주 내 연락',
  },
  medium: {
    bg: 'bg-green-50',
    text: 'text-green-600',
    dot: '#52C41A',
    border: 'border-green-200',
    days: '7-14일',
    label: '다음 주 내',
  },
  low: {
    bg: 'bg-gray-50',
    text: 'text-gray-500',
    dot: '#BFBFBF',
    border: 'border-gray-200',
    days: '7일 미만',
    label: '정기 팔로업',
  },
} as const

// ============================================
// 액션 우선순위 계산
// ============================================

export function getActionPriority(student: {
  days_since_last_contact: number | null
  ai_readiness: string | null
  ai_sentiment: string | null
}): ActionPriority {
  const { days_since_last_contact, ai_readiness, ai_sentiment } = student
  const days = days_since_last_contact ?? 0

  // 30일 이상 → urgent
  if (days >= 30) return 'urgent'

  // 14-30일 + 준비도 높음 → urgent (놓치면 안됨)
  if (days >= 14 && ai_readiness === 'high') return 'urgent'

  // 14-30일 → high
  if (days >= 14) return 'high'

  // 7-14일 + 부정적 분위기 → high (이탈 우려)
  if (days >= 7 && ai_sentiment === 'negative') return 'high'

  // 7-14일 → medium
  if (days >= 7) return 'medium'

  // 7일 미만 → low
  return 'low'
}

// ============================================
// 채널 아이콘
// ============================================

export const CHANNEL_ICONS = {
  phone: '📞',
  text: '💬',
  kakao: '💛',
  visit: '🤝',
} as const

// ============================================
// AI 제안 캐시 관련
// ============================================

export const AI_CACHE_TTL_MS = 60 * 60 * 1000 // 1시간

export function isCacheValid(cache: AISuggestionCache): boolean {
  return Date.now() - cache.cachedAt < AI_CACHE_TTL_MS
}

export function isCacheStale(cache: AISuggestionCache): boolean {
  return Date.now() - cache.cachedAt >= AI_CACHE_TTL_MS
}

export function getCacheKey(studentId: string): string {
  return `ai_suggestion_${studentId}`
}

export function getStudentContextHash(student: StudentFollowup): string {
  // 상담 추가 시 캐시 무효화를 위한 컨텍스트 해시
  return `${student.id}_${student.total_consultations}_${student.last_consultation_date}`
}
