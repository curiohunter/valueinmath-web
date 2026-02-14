import type { Database } from "@/types/database"

// 학생 기본 타입
export type Student = Database['public']['Tables']['students']['Row']

// 상담 데이터 타입 (학생 + 학교/학년 정보)
export type ConsultationData = Database['public']['Tables']['students']['Row'] & {
  entrance_tests?: any[]
  // student_schools + schools에서 가져온 학교 정보
  school?: string | null
  school_type?: string | null
  grade?: number | null
  current_school_id?: string | null
}

// 학생 정보 요약 (통계 카드용)
export interface StudentInfo {
  name: string
  school_type: string | null
  grade: number | null
  department: string | null
}

// 코호트 월별 데이터 타입
export interface CohortMonthData {
  month: string // "2024-12" 형식
  consultations: number // 신규상담 수
  enrollments: number // 등원 수
  conversionRate: number // 전환율 (%)
  yoyChange: string // YoY 변화 (예: "+5.2%", "-3.1%", "")
}

// 대시보드 통계 타입
export interface DashboardStats {
  activeStudents: number
  activeStudentsByDept: { [key: string]: number }
  activeStudentsChange: string
  consultationsThisMonth: number
  consultationsByDept: { [key: string]: number }
  consultationsYoY: string
  testsThisMonth: number
  testsByDept: { [key: string]: number }
  testConversionRate: string
  newEnrollmentsThisMonth: number
  newEnrollmentsByDept: { [key: string]: number }
  newEnrollmentStudents: StudentInfo[]
  enrollmentConversionRate: string
  withdrawalsThisMonth: number
  withdrawalsByDept: { [key: string]: number }
  withdrawalStudents: StudentInfo[]
  withdrawalsYoY: string
  // 보강 관련
  pendingMakeups: number // 보강 미정
  weeklyScheduledMakeups: number // 7일내 예정
  overdueScheduledMakeups: number // 기한 지난 미완료
  overdueTeachers: string[] // 기한 초과 담당 선생님들
  // 학원비 관련
  currentMonthPaidCount: number // 이번달 완납
  currentMonthUnpaidCount: number // 이번달 미납
  // 투두 관련
  todosByAssignee: { [key: string]: number } // 담당자별 미완료 투두
  totalIncompleteTodos: number // 전체 미완료 투두 수
  // 상담요청 관련
  consultationRequestsUnassigned: number // 미배정 상담요청
  consultationRequestsPending: number // 대기중 상담요청
  consultationRequestsCompleted: number // 완료 상담요청
  // 코호트 기반 전환율 데이터
  cohortData: CohortMonthData[] // 최근 3개월 코호트 데이터 (각 월별 YoY 포함)
}

// DashboardStats 초기값
export const INITIAL_DASHBOARD_STATS: DashboardStats = {
  activeStudents: 0,
  activeStudentsByDept: {},
  activeStudentsChange: "+0%",
  consultationsThisMonth: 0,
  consultationsByDept: {},
  consultationsYoY: "+0%",
  testsThisMonth: 0,
  testsByDept: {},
  testConversionRate: "0%",
  newEnrollmentsThisMonth: 0,
  newEnrollmentsByDept: {},
  newEnrollmentStudents: [],
  enrollmentConversionRate: "0%",
  withdrawalsThisMonth: 0,
  withdrawalsByDept: {},
  withdrawalStudents: [],
  withdrawalsYoY: "+0%",
  pendingMakeups: 0,
  weeklyScheduledMakeups: 0,
  overdueScheduledMakeups: 0,
  overdueTeachers: [],
  currentMonthPaidCount: 0,
  currentMonthUnpaidCount: 0,
  todosByAssignee: {},
  totalIncompleteTodos: 0,
  consultationRequestsUnassigned: 0,
  consultationRequestsPending: 0,
  consultationRequestsCompleted: 0,
  cohortData: []
}
