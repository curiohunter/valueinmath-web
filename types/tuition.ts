import type { Database } from "./database"

// Database 타입에서 추출
type TuitionFeeRow = Database["public"]["Tables"]["tuition_fees"]["Row"]
type ClassRow = Database["public"]["Tables"]["classes"]["Row"]
type StudentRow = Database["public"]["Tables"]["students"]["Row"]

// 수업 유형 enum (DB 값)
export const CLASS_TYPES = ['정규', '특강', '모의고사비', '입학테스트비'] as const
export type ClassType = typeof CLASS_TYPES[number]

// UI 표시용 라벨 매핑
export const CLASS_TYPE_LABELS: Record<ClassType, string> = {
  '정규': '정규',
  '특강': '특강',
  '모의고사비': '모의고사',
  '입학테스트비': '입학테스트비'
}

// 납부 상태 enum
export const PAYMENT_STATUS = ['미납', '완납', '부분납'] as const
export type PaymentStatus = typeof PAYMENT_STATUS[number]

// 학원비 기본 인터페이스 (DB 테이블 기반)
export interface TuitionFee {
  id: string
  class_id: string | null
  student_id: string | null
  year: number
  month: number
  is_sibling: boolean | null
  class_type: ClassType
  amount: number
  note: string | null
  payment_status: PaymentStatus
  payment_date: string | null
  created_at: string | null
  updated_at: string | null
}

// UI에서 사용할 학원비 행 인터페이스 (조인된 데이터 포함)
export interface TuitionRow {
  id: string
  classId: string
  className: string
  studentId: string
  studentName: string
  year: number
  month: number
  isSibling: boolean
  classType: ClassType
  amount: number
  note: string
  paymentStatus: PaymentStatus
  paymentDate?: string
}

// 학원비 생성/수정을 위한 입력 인터페이스
export interface TuitionFeeInput {
  class_id: string
  student_id: string
  year: number
  month: number
  is_sibling?: boolean
  class_type?: ClassType
  amount: number
  note?: string
  payment_status?: PaymentStatus
  payment_date?: string
}

// 반별 학생 정보
export interface ClassWithStudents {
  id: string
  name: string
  subject: string
  teacher_id?: string | null
  monthly_fee: number | null
  students: StudentInfo[]
}

// 학생 기본 정보
export interface StudentInfo {
  id: string
  name: string
  grade: number | null
  school: string | null
  has_sibling: boolean | null
  status: string
}

// 학원비 필터 인터페이스
export interface TuitionFilters {
  year: number
  month: number
  classId?: string
  studentName?: string
  paymentStatus?: PaymentStatus
  classType?: ClassType
}

// 월별 학원비 통계
export interface TuitionStats {
  totalStudents: number
  totalAmount: number
  paidCount: number
  unpaidCount: number
  partialPaidCount: number
  collectionRate: number // 징수율 (%)
  avgAmount: number
  siblingDiscountCount: number
}

// 학원비 요약 정보
export interface TuitionSummary {
  yearMonth: string
  stats: TuitionStats
  classList: {
    classId: string
    className: string
    studentCount: number
    totalAmount: number
    collectedAmount: number
  }[]
}

// API 응답 타입
export interface TuitionApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// 일괄 생성을 위한 인터페이스
export interface BulkTuitionGeneration {
  year: number
  month: number
  classIds?: string[] // 특정 반만 생성할 경우
  applyDiscount?: boolean // 형제 할인 적용 여부
}

// 일괄 적용을 위한 인터페이스
export interface BulkApplyData {
  field: 'year' | 'month' | 'classType' | 'amount' | 'paymentStatus'
  value: any
  targetIndices?: number[] // 특정 행만 적용할 경우
}

// 학원비 검색 결과
export interface TuitionSearchResult {
  tuitionFees: TuitionRow[]
  pagination: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
  summary: TuitionStats
}