import type { Database } from "./database"
import type { Student } from "./student"

// Database 타입에서 추출
type StudyLogRow = Database["public"]["Tables"]["study_logs"]["Row"]
type TestLogRow = Database["public"]["Tables"]["test_logs"]["Row"]

// 학생 기본 정보 (Student 타입 기반)
export interface StudentInfo {
  id: string
  name: string
  department: string | null
  grade: number | null
  school: string | null
}

// 수업 기록 요약 (study_logs 기반)
export interface StudyLogSummary {
  id: string
  date: string
  class_id: string | null
  book1: string | null
  book1log: string | null
  book2: string | null
  book2log: string | null
  attendance_status: number | null  // 1-5 점수
  homework: number | null          // 1-5 점수  
  focus: number | null             // 1-5 점수
  note: string | null
}

// 시험 기록 요약 (test_logs 기반)
export interface TestLogSummary {
  id: string
  date: string
  class_id: string | null
  test_type: string | null         // "학교기출유사", "내신대비" 등
  test: string | null              // 시험명
  test_score: number | null        // 점수
  note: string | null              // 비고 (결석 등)
}

// 월별 통계 집계
export interface MonthlyStats {
  // 출석 관련
  avgAttendance: number           // 평균 출석 점수 (1-5)
  attendanceRate: number          // 출석률 (%)
  
  // 학습 태도 관련
  avgHomework: number             // 평균 과제 수행도 (1-5)
  avgFocus: number                // 평균 집중도 (1-5)
  
  // 시험 관련
  avgTestScore: number            // 평균 시험 점수
  testScoreImprovement: number    // 점수 향상도 (전월 대비)
  
  // 수업 관련
  totalClasses: number            // 총 수업 횟수
  totalTests: number              // 총 시험 횟수
  
  // 교재 진도
  booksUsed: string[]             // 사용한 교재 목록
  progressNotes: string[]         // 진도 기록
}

// 월별 보고서 데이터
export interface MonthlyReportData {
  student: StudentInfo
  year: number
  month: number
  studyLogs: StudyLogSummary[]
  testLogs: TestLogSummary[]
  monthlyStats: MonthlyStats
  specialNotes: string[]          // 특이사항 모음
  teacherComment?: string         // 교사 총평
}

// 보고서 생성을 위한 옵션
export interface ReportGenerationOptions {
  studentId: string
  year: number
  month: number
  includeCharts?: boolean
  format?: 'text' | 'html'
}

// Analytics 필터 인터페이스
export interface AnalyticsFilters {
  studentId: string | "all"
  year: number
  month: number
  dateRange?: {
    start: string
    end: string
  }
}

// 차트 데이터 타입
export interface ChartDataPoint {
  date: string
  value: number
  label?: string
}

export interface TestScoreChart {
  data: ChartDataPoint[]
  average: number
  trend: 'improving' | 'declining' | 'stable'
}

export interface ProgressChart {
  subject: string
  book: string
  progress: number      // 0-100 퍼센트
  chapters: string[]
}

// API 응답 타입
export interface AnalyticsApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// 수업 진도 추적을 위한 타입
export interface BookProgress {
  bookName: string
  chapters: string[]
  currentChapter: string
  completedChapters: number
  totalChapters: number
  progressPercentage: number
}

// 성적 분석을 위한 타입
export interface ScoreAnalysis {
  subject: string
  scores: number[]
  average: number
  highest: number
  lowest: number
  improvement: number
  weakAreas: string[]
  strongAreas: string[]
}