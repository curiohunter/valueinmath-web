import type { StudentInfo } from "./analytics"

// 보고서 상태 enum
export enum ReportStatus {
  NOT_GENERATED = "not_generated",
  GENERATING = "generating", 
  GENERATED = "generated",
  MODIFIED = "modified"
}

// 보고서 상태 라벨 (UI 표시용)
export const ReportStatusLabel: Record<ReportStatus, string> = {
  [ReportStatus.NOT_GENERATED]: "미생성",
  [ReportStatus.GENERATING]: "생성중",
  [ReportStatus.GENERATED]: "생성완료",
  [ReportStatus.MODIFIED]: "수정됨"
}

// 보고서 상태 색상 (Badge 표시용)
export const ReportStatusColor: Record<ReportStatus, "default" | "secondary" | "success" | "warning"> = {
  [ReportStatus.NOT_GENERATED]: "default",
  [ReportStatus.GENERATING]: "secondary",
  [ReportStatus.GENERATED]: "success",
  [ReportStatus.MODIFIED]: "warning"
}

// 보고서 테이블 행 데이터
export interface ReportTableRow {
  // 학생 정보
  studentId: string
  studentName: string
  grade: number | null
  school: string | null
  department: string | null
  className?: string // 반 이름
  
  // 보고서 정보
  reportId?: string
  reportStatus: ReportStatus
  generatedAt?: string
  updatedAt?: string
  
  // 추가 정보
  year: number
  month: number
}

// 보고서 필터
export interface ReportFilters {
  // 반 필터 (다중 선택)
  classIds: string[]
  
  // 학생 검색
  searchTerm: string
  
  // 학교 타입 필터
  schoolType: "all" | "초등학교" | "중학교" | "고등학교"
  
  // 학년 필터
  grade: number | "all"
  
  // 날짜 필터
  year: number
  month: number
}

// 보고서 생성 요청
export interface GenerateReportRequest {
  studentId: string
  year: number
  month: number
}

// 보고서 생성 응답
export interface GenerateReportResponse {
  success: boolean
  reportId?: string
  error?: string
}

// 일괄 생성 진행 상태
export interface BulkGenerateProgress {
  total: number
  completed: number
  failed: number
  inProgress: boolean
  currentStudent?: string
}

// 보고서 상세 데이터
export interface ReportDetail {
  id: string
  studentId: string
  student: StudentInfo
  year: number
  month: number
  reportContent: string
  teacherComment?: string
  monthlyStats?: any // MonthlyStats from analytics
  generatedAt: string
  updatedAt: string
}

// API 응답 타입
export interface ReportsApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

// 보고서 목록 조회 응답
export interface GetReportsResponse {
  reports: ReportTableRow[]
  totalCount: number
  page: number
  pageSize: number
}