/**
 * AI 코멘트 어시스턴트 타입 정의
 */

// ============================================
// 키워드 프로토콜 타입
// ============================================

export type ProtocolCategory =
  | 'greeting'
  | 'progress_level'
  | 'progress_semester'
  | 'progress_stage'
  | 'progress_status'
  | 'attitude_positive'
  | 'attitude_needs_improvement'
  | 'attendance_issue'
  | 'homework_issue'
  | 'methodology'
  | 'achievement'
  | 'future_plan_period'
  | 'future_plan_activity'
  | 'closing'

export type Severity = 'positive' | 'neutral' | 'negative'
export type GradeBand = 'all' | 'elementary' | 'middle' | 'high'

export interface CommentProtocol {
  id: string
  category: ProtocolCategory
  phrase: string
  severity: Severity
  grade_band: GradeBand
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// ============================================
// 학습 메트릭스 타입 (개선된 버전)
// ============================================

export type Trend = 'up' | 'down' | 'flat'

// 현재 월 상세 데이터 - 학습일지
export interface StudyLogDetail {
  date: string              // "11-01" 형식
  attendance: number        // 숫자 코드 (1-5)
  attendanceLabel: string   // "출석", "지각", "결석" 등 레이블
  homework: number          // 숫자 코드 (1-5)
  homeworkLabel: string     // "100% 마무리", "90% 이상" 등 레이블
  focus: number             // 숫자 코드 (1-5)
  focusLabel: string        // "매우 열의있음" 등 레이블
  classContent?: string     // 수업 내용 (book1 + book1log)
  homeworkContent?: string  // 숙제 내용 (book2 + book2log)
}

// 현재 월 상세 데이터 - 테스트
export interface TestLogDetail {
  date: string              // "11-04" 형식
  testName: string          // 테스트명
  testType: string          // "단원테스트", "오답테스트" 등
  score: number             // 점수
}

// 현재 월 상세 데이터
export interface CurrentMonthData {
  year: number
  month: number
  studyLogs: StudyLogDetail[]
  testLogs: TestLogDetail[]
}

// 이전 월 요약 메트릭스
export interface PrevMonthSummary {
  year: number
  month: number
  totalDays: number         // 총 수업일수
  attendanceRate: number    // 출석률 %
  homeworkAvg: number       // 숙제 평균 (1-5)
  focusAvg: number          // 집중도 평균 (1-5)
  testCount: number         // 테스트 횟수
  testAvgScore: number      // 테스트 평균 점수
}

// AI 코멘트 생성용 전체 학습 데이터
export interface StudentLearningData {
  currentMonth: CurrentMonthData
  prevMonth?: PrevMonthSummary
}

// 기존 StudentMetrics (UI 표시용으로 유지)
export interface MonthlyTestMetrics {
  count: number
  avgScore: number
}

export interface MonthlyComparison {
  avgScore: number
  attendanceRate: number
  homeworkCompletionRate: number
}

export interface TrendMetrics {
  score: Trend
  attendance: Trend
  homework: Trend
}

export interface StudentMetrics {
  monthly_tests: MonthlyTestMetrics
  attendanceRate: number
  homeworkCompletionRate: number
  comparison?: {
    prevMonth?: MonthlyComparison
    prev2Month?: MonthlyComparison
  }
  trend?: TrendMetrics
}

// ============================================
// API 요청/응답 타입
// ============================================

export interface SelectedPhrases {
  greeting: string[]
  progress: string[]
  attitude_positive: string[]
  attitude_needs_improvement: string[]
  attendance_issue: string[]
  homework_issue: string[]
  methodology: string[]
  achievement: string[]
  future_plan: string[]
  closing: string[]
}

export type CommentTone = 'balanced' | 'praise' | 'feedback'
export type RegenerationType = 'full' | 'greeting' | 'body' | 'plan' | 'tone_adjust'

export interface GenerateCommentRequest {
  student_id: string
  year: number
  month: number
  selected_phrases: SelectedPhrases
  metrics?: StudentMetrics
  tone?: CommentTone
  regeneration_type?: RegenerationType
  regeneration_count?: number
}

export interface GenerateCommentResponse {
  success: boolean
  data?: {
    generated_content: string
    tokens_used: number
    protocol_version: string
    prompt_hash: string
  }
  error?: string
}

// ============================================
// LLM 로그 타입
// ============================================

export type LLMProvider = 'openai' | 'anthropic' | 'gemini'
export type LogReason = 'first_draft' | 'regenerate' | 'section_regenerate' | 'tone_adjust'

export interface CommentLLMLog {
  id: string
  student_id: string
  teacher_id: string
  year: number
  month: number
  provider: LLMProvider
  model: string
  tokens_input: number
  tokens_output: number
  duration_ms?: number
  price_input_per_million: number
  price_output_per_million: number
  estimated_cost_usd: number
  success: boolean
  error_code?: string
  protocol_version?: string
  prompt_hash?: string
  reason: LogReason
  regeneration_count: number
  created_at: string
}

// ============================================
// UI 컴포넌트 타입
// ============================================

export interface StudentInfo {
  id: string
  name: string
  grade: string
  school?: string
  className?: string
}

export interface ProtocolsByCategory {
  [key: string]: CommentProtocol[]
}

// 추세 계산 임계값 상수
export const TREND_THRESHOLDS = {
  SCORE: 5,        // 성적: ±5점
  ATTENDANCE: 5,   // 출석률: ±5%
  HOMEWORK: 10,    // 과제 수행률: ±10%
} as const
