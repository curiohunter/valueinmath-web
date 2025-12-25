// 퍼널 분석 공통 타입 정의

export interface Bottleneck {
  stage: string
  dropOffRate: number
  avgDaysStuck: number
}

export interface BottleneckDetail {
  stage: string
  studentCount: number
  avgConsultations: number
  avgPhone: number
  avgText: number
  avgVisit: number
  avgDaysSinceLastContact: number | null
  dropoutRate: number
}

export interface StageDuration {
  fromStage: string | null
  toStage: string
  count: number
  avgDays: number
}

export interface LeadSourceMetrics {
  source: string
  firstContacts: number
  tests: number
  enrollments: number
  conversionRate: number
  testRate: number
  testToEnrollRate: number
  avgDaysToEnroll: number | null
  avgConsultations: number | null
  totalCost: number | null
  costPerLead: number | null
  costPerEnrollment: number | null
}

export interface CohortData {
  cohort_month: string
  cohort_date: string
  lead_source?: string
  total_students: number
  test_month_0: number
  test_month_1: number
  test_month_2: number
  test_month_3: number
  test_total: number
  enroll_month_0: number
  enroll_month_1: number
  enroll_month_2: number
  enroll_month_3: number
  enroll_total: number
  final_conversion_rate: number
  avg_days_to_enroll: number | null
  is_ongoing: boolean
}

export interface GradeBreakdown {
  school_type: string
  grade: number
  grade_label: string
  total_count: number
  with_test_count: number
  without_test_count: number
}

export interface EnrolledGradeBreakdown {
  school_type: string
  grade: number
  grade_label: string
  total_count: number
  same_month_count: number
  delayed_count: number
}

export type PeriodFilter = "6months" | "1year" | "all"

export type SortField = "source" | "firstContacts" | "tests" | "enrollments" | "conversionRate" | "testRate" | "testToEnrollRate" | "avgDaysToEnroll" | "avgConsultations" | "totalCost"
export type SortDirection = "asc" | "desc"

// 심층 분석 타입
export interface LeadSourceBottleneck {
  leadSource: string
  stage: string
  totalCount: number
  testCount: number
  enrollCount: number
  enrollAfterTestCount: number
  directEnrollCount: number
  dropOffRate: number
  avgConsultations: number
  avgDaysStuck: number
}

export interface ConsultationEffect {
  consultationType: string
  method: string
  count: number
  toTestRate: number
  toEnrollRate: number
}

export interface AIHurdlePattern {
  hurdle: string
  label: string
  count: number
  dropOffRate: number
  avgDaysStuck: number
  suggestedAction: string
}

// 코호트 요약 통계
export interface CohortSummary {
  recentAvgRate: number
  prevAvgRate: number
  ongoingCount: number
  avgDaysToEnroll: number | null
  bestCohort: CohortData | null
  worstCohort: CohortData | null
}

// 차트 데이터 포인트
export interface ChartDataPoint {
  month: string
  fullMonth: string
  year: string
  전환율: number
  총원: number
  등록: number
  isOngoing: boolean
  yoyChange: number | null
  prevYearRate: number | undefined
  // 작년 비교 데이터
  prevYear총원: number | null
  prevYear등록: number | null
  prevYear전환율: number | null
}
