/**
 * B2B SaaS Foundation Types
 * 수강 이력 추적, Soft Delete, 상담 결과 타입 정의
 */

// ============================================
// Phase 1: 수강 이력 (Enrollment History)
// ============================================

export type EnrollmentActionType =
  | 'enrolled'      // 수강 시작
  | 'transferred'   // 반 이동
  | 'withdrawn'     // 수강 중단
  | 'class_closed'  // 반 폐강

export interface ClassEnrollmentHistory {
  id: string
  student_id: string | null
  class_id: string | null
  action_type: EnrollmentActionType
  action_date: string

  // Transfer tracking
  from_class_id: string | null
  to_class_id: string | null

  // Snapshots (FK 삭제 후에도 보존)
  student_name_snapshot: string
  class_name_snapshot: string | null
  from_class_name_snapshot: string | null
  to_class_name_snapshot: string | null

  // Metadata
  reason: string | null
  notes: string | null
  created_by: string | null
  created_by_name_snapshot: string | null
  created_at: string
}

// ============================================
// Phase 2: Soft Delete Extensions
// ============================================

export interface SoftDeleteStudent {
  is_active: boolean
  left_at: string | null
  left_reason: string | null
}

export interface SoftDeleteClass {
  is_active: boolean
  closed_at: string | null
  closed_reason: string | null
}

// ============================================
// Phase 3: 상담 결과 (Consultation Outcome)
// ============================================

export type ConsultationOutcomeType =
  | 'enrolled'        // 등록 완료
  | 'test_scheduled'  // 테스트 예정
  | 'deferred'        // 보류
  | 'rejected'        // 거절됨
  | 'lost'            // 이탈
  | 'ongoing'         // 진행 중

export interface ConsultationOutcome {
  outcome: ConsultationOutcomeType | null
  outcome_date: string | null
  outcome_notes: string | null
}

// ============================================
// Feature 1: 퍼널 이벤트 (준비용)
// ============================================

export type FunnelEventType =
  | 'first_contact'
  | 'consultation_scheduled'
  | 'consultation_completed'
  | 'test_scheduled'
  | 'test_completed'
  | 'registration_started'
  | 'registration_completed'
  | 'dropped_off'

export type FunnelStage =
  | '신규상담'
  | '테스트예정'
  | '테스트완료'
  | '등록유도'
  | '등록완료'
  | '재원'

export interface FunnelEvent {
  id: string
  student_id: string
  event_type: FunnelEventType
  from_stage: string | null
  to_stage: string | null
  event_date: string
  days_since_previous: number | null
  metadata: Record<string, unknown>
  created_by: string | null
  created_at: string
}

// ============================================
// Feature 2: 위험 분석 (준비용)
// ============================================

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'none'
export type ScoreTrend = 'improving' | 'stable' | 'declining' | 'critical_decline'

export interface StudentRiskScore {
  id: string
  student_id: string

  // 4축 점수 (0-100, 높을수록 안전)
  attendance_score: number
  achievement_score: number
  interaction_score: number
  sentiment_score: number

  // 종합
  total_risk_score: number  // 0-100 (높을수록 위험)
  risk_level: RiskLevel

  // 트렌드
  score_trend: ScoreTrend
  previous_score: number | null
  score_change: number | null

  // 분석 기간
  analysis_period_start: string
  analysis_period_end: string
  data_points: number

  // 배치 메타데이터
  last_calculated_at: string
  calculation_batch_id: string | null
}

export type RiskAlertType =
  | 'score_threshold_crossed'
  | 'rapid_decline'
  | 'attendance_pattern'
  | 'performance_drop'
  | 'engagement_drop'

export type RiskAlertSeverity = 'critical' | 'high' | 'medium'
export type RiskAlertStatus = 'active' | 'acknowledged' | 'resolved' | 'dismissed'

export interface RiskAlert {
  id: string
  student_id: string
  alert_type: RiskAlertType
  severity: RiskAlertSeverity

  title: string
  message: string
  trigger_data: Record<string, unknown>

  status: RiskAlertStatus
  acknowledged_by: string | null
  acknowledged_at: string | null
  resolved_by: string | null
  resolved_at: string | null
  resolution_note: string | null

  created_at: string
}

// ============================================
// 설정 타입
// ============================================

export interface RiskConfigWeights {
  attendance: number
  achievement: number
  interaction: number
  sentiment: number
}

export interface RiskConfigThresholds {
  critical: number
  high: number
  medium: number
  low: number
}

export interface RiskConfigAlertTriggers {
  score_drop_percent: number
  consecutive_absences: number
  test_score_drop: number
}

export interface RiskConfig {
  id: string
  config_key: string
  config_value: RiskConfigWeights | RiskConfigThresholds | RiskConfigAlertTriggers | number
  description: string | null
  updated_by: string | null
  updated_at: string
}

// ============================================
// UI용 색상 상수
// ============================================

export const RISK_COLORS = {
  critical: { bg: 'bg-red-50', text: 'text-red-600', chart: '#ef4444' },
  high: { bg: 'bg-orange-50', text: 'text-orange-600', chart: '#f97316' },
  medium: { bg: 'bg-amber-50', text: 'text-amber-600', chart: '#eab308' },
  low: { bg: 'bg-blue-50', text: 'text-blue-600', chart: '#3b82f6' },
  none: { bg: 'bg-green-50', text: 'text-green-600', chart: '#22c55e' },
} as const

export const FUNNEL_COLORS = {
  first_contact: '#8b5cf6',
  consultation: '#3b82f6',
  test: '#06b6d4',
  registration: '#22c55e',
  enrolled: '#10b981',
} as const

// ============================================
// Marketing Intelligence System (Phase 1)
// ============================================

// DB marketing_channel ENUM과 일치
export type MarketingChannel =
  | 'blog_naver'
  | 'blog_other'
  | 'instagram'
  | 'youtube'
  | 'cafe_naver'
  | 'cafe_other'
  | 'cafe_mom'
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

export type InsightType = 'recommendation' | 'warning' | 'trend' | 'anomaly'

export type InsightPriority = 'high' | 'medium' | 'low'

export interface MarketingActivity {
  id: string
  channel: MarketingChannel
  title: string
  description: string | null
  start_date: string
  end_date: string | null
  budget: number | null
  actual_cost: number | null
  target_audience: string | null
  status: MarketingStatus
  metadata: Record<string, unknown>
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface MarketingAttribution {
  id: string
  student_id: string
  marketing_activity_id: string
  attribution_type: AttributionType
  touch_order: number
  interaction_date: string
  confidence_score: number | null
  notes: string | null
  created_at: string
}

export interface MarketingInsight {
  id: string
  insight_type: InsightType
  priority: InsightPriority
  title: string
  description: string | null
  related_channel: MarketingChannel | null
  related_activity_id: string | null
  data_snapshot: Record<string, unknown>
  is_read: boolean
  is_dismissed: boolean
  generated_at: string
  expires_at: string | null
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

// 채널 한글 라벨 (DB marketing_channel ENUM과 일치)
export const CHANNEL_LABELS: Record<MarketingChannel, string> = {
  'blog_naver': '네이버 블로그',
  'blog_other': '기타 블로그',
  'instagram': '인스타그램',
  'youtube': '유튜브',
  'cafe_naver': '네이버 카페',
  'cafe_other': '기타 카페',
  'cafe_mom': '맘카페',
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
export const LEAD_SOURCE_TO_CHANNEL: Record<string, MarketingChannel> = {
  '블로그': 'blog_naver',
  '맘까페': 'cafe_naver',
  '입소문': 'referral',
  '전화상담': 'other',
  '오프라인': 'other',
  '원내친구추천': 'referral',
  '원내학부모추천': 'referral',
  '원외친구추천': 'referral',
  '원외학부모추천': 'referral',
  '형제': 'referral',
}
