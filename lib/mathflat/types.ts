// MathFlat 시스템 타입 정의 (n8n + Supabase 직접 연동)

export type MathflatType = '교재' | '학습지' | '챌린지' | '챌린지오답';

// 데이터베이스 레코드 타입
export interface MathflatRecord {
  id?: string;
  student_id: string;
  student_name: string;
  event_date: string; // YYYY-MM-DD
  mathflat_type: MathflatType;
  book_title: string;
  problem_solved: number;
  correct_count: number;
  wrong_count: number;
  correct_rate: number;
  created_at?: string;
  updated_at?: string;
}

// 학생 정보 타입
export interface StudentInfo {
  id: string;
  name: string;
  school?: string;
  grade?: number;
  class_students?: Array<{
    classes?: {
      id: string;
      name: string;
    }
  }>;
}

// 통계 데이터 타입
export interface MathflatStats {
  rateDifferenceStudents: Array<{
    student_name: string;
    교재_rate: number;
    학습지_rate: number;
    difference: number;
  }>;
  lowTextbookStudents: Array<{
    student_name: string;
    average_rate: number;
    problem_count: number;
  }>;
  topChallengeStudents: Array<{
    student_name: string;
    total_problems: number;
  }>;
  weeklyTopPerformers: Array<{
    student_id: string;
    student_name: string;
    total_problems: number;
    average_rate: number;
  }>;
}

// 필터 옵션 타입
export interface FilterOptions {
  startDate?: string;
  endDate?: string;
  studentIds?: string[];
  mathflatTypes?: MathflatType[];
  bookTitle?: string;
  minCorrectRate?: number;
  maxCorrectRate?: number;
}

// 주간 요약 타입
export interface WeeklySummary {
  student_id: string;
  student_name: string;
  week_start: string;
  week_end: string;
  total_problems: number;
  average_rate: number;
  type_breakdown: Partial<Record<MathflatType, {
    count: number;
    problems: number;
    average_rate: number;
  }>>;
}

// API 응답 타입
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 페이지네이션 타입
export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination?: PaginationInfo;
}