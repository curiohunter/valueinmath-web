import { Database } from "./database"

export type UserRole = "employee" | "parent" | "student"

export interface PortalUser {
  id: string
  name: string | null
  email: string | null
  role: UserRole
  student_id: string | null
  student_name?: string | null
}

export interface StudentOverviewStats {
  attendance_rate: number // 출석률 (%)
  average_score: number // 평균 점수
  total_study_logs: number // 총 학습 일지 수
  total_tests: number // 총 테스트 수
  total_consultations: number // 총 상담 수
  total_makeup_classes: number // 총 보강 수업 수
  mathflat_total_problems: number // 매쓰플랫 총 문제 수
  mathflat_accuracy_rate: number // 매쓰플랫 정답률 (%)
}

export interface StudyLogItem {
  id: string
  date: string
  class_name: string | null
  attendance_status: number | null // 1-5
  homework: number | null // 1-5
  focus: number | null // 1-5
  book1: string | null
  book1log: string | null
  book2: string | null
  book2log: string | null
  note: string | null
}

export interface TestLogItem {
  id: string
  date: string
  class_name: string | null
  test_type: string | null
  test: string | null
  test_score: number | null
  note: string | null
}

export interface SchoolExamScoreItem {
  id: string
  exam_year: number
  semester: number
  exam_type: string
  school_name: string | null
  grade: number
  subject: string
  score: number
  created_at: string
}

export interface MakeupClassItem {
  id: string
  absence_date: string | null
  absence_reason: string | null
  makeup_date: string | null
  makeup_type: string
  status: string
  class_name: string | null
  content: string | null
  notes: string | null
}

export interface ConsultationItem {
  id: string
  date: string
  type: string
  method: string
  status: string
  counselor_name: string | null
  content: string | null
  next_action: string | null
  next_date: string | null
}

export interface MathflatRecordItem {
  id: string
  event_date: string | null
  mathflat_type: string | null
  book_title: string | null
  problem_solved: number | null
  correct_count: number | null
  wrong_count: number | null
  correct_rate: number | null
}

export interface ActivityTimelineItem {
  id: string
  date: string
  type: "study" | "test" | "exam" | "makeup" | "consultation" | "mathflat"
  title: string
  description: string
  icon?: string
  color?: string
}

export interface TuitionFeeItem {
  id: string
  year: number
  month: number
  amount: number
  payment_status: string | null // '완납', '미납', '일부납부'
  class_name: string | null
  is_sibling: boolean | null
  period_start_date: string | null
  period_end_date: string | null
}

export interface ClassInfo {
  id: string
  name: string // 반 이름
  subject: string
  teacher_name: string | null // 담당 선생님 이름
  monthly_fee: number | null
}

export interface MonthlyAggregation {
  year: number
  month: number
  // 출석 관련
  attendance_count_5: number // 출석 횟수
  attendance_count_4: number // 지각 횟수
  attendance_count_3: number // 조퇴 횟수
  attendance_count_2: number // 보강 횟수
  attendance_count_1: number // 결석 횟수
  // 숙제 관련
  homework_avg: number // 숙제 평균 점수 (1-5)
  // 집중도 관련
  focus_avg: number // 집중도 평균 점수 (1-5)
  // 기타
  total_study_days: number // 총 학습 일수
  total_tests: number // 총 테스트 수
  average_score: number // 평균 시험 점수
}

export interface MathflatStats {
  textbook_accuracy: number // 교재 정답률 (%)
  textbook_problems: number // 교재 문제 수
  worksheet_accuracy: number // 학습지 정답률 (%)
  worksheet_problems: number // 학습지 문제 수
  challenge_accuracy: number // 챌린지 정답률 (%)
  challenge_problems: number // 챌린지 문제 수
}

export interface MonthlyMathflatStats {
  year: number
  month: number
  stats: MathflatStats
}

export interface PortalData {
  student: {
    id: string
    name: string
    grade: number | null
    school: string | null
    status: string
  }
  classes: ClassInfo[] // 학생이 등록된 반 목록 - 신규 추가
  stats: StudentOverviewStats
  recent_activities: ActivityTimelineItem[]
  study_logs: StudyLogItem[]
  test_logs: TestLogItem[]
  school_exam_scores: SchoolExamScoreItem[]
  makeup_classes: MakeupClassItem[]
  consultations: ConsultationItem[]
  mathflat_records: MathflatRecordItem[]
  tuition_fees: TuitionFeeItem[]
  monthly_aggregations: MonthlyAggregation[]
  monthly_mathflat_stats: MonthlyMathflatStats[] // 월별 매쓰플랫 통계
}
