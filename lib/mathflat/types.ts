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

// ============================================
// MathFlat API 타입 (숙제 수집 크론잡용)
// ============================================

// MathFlat 로그인 응답
export interface MathFlatLoginResponse {
  token: string;
  refreshToken?: string;
}

// MathFlat 반 학생 정보
export interface MathFlatClassStudent {
  studentId: number;
  name: string;
  schoolName?: string;
  grade?: number;
}

// MathFlat 숙제 목록 응답 (student-history/homework)
export interface MathFlatHomeworkItem {
  studentHomeworkId: number;
  studentBookId: number;
  bookId?: number;
  progressId?: number;
  progressIdList?: number[];       // WORKBOOK의 경우 여러 진행 ID
  studentWorkbookId?: number;      // WORKBOOK 전용
  title?: string;
  bookType: 'WORKBOOK' | 'WORKSHEET';
  homeworkStartDate?: string;
  homeworkEndDate?: string;
  completed: boolean;
  score?: number;
  totalCount?: number;
  correctCount?: number;
  wrongCount?: number;
  page?: string;                   // "9~11,13~20"
  status?: string;                 // PROGRESS, INCOMPLETE, COMPLETE
  createDatetime?: string;         // "2026-01-30T10:49:24"
  // 반별 숙제 조회 시 포함되는 학생 정보
  studentId?: string;              // "I1225276" 형식 (학생별 조회 시)
  studentName?: string;            // 학생 이름 (반별 조회 시)
}

// MathFlat 교재 문제 상세 (student-workbook)
export interface MathFlatWorkbookProblem {
  workbookProblemId: number;
  problemId: number;
  problemTitle?: string;   // 문제 섹션 (예: 유형 한 걸음)
  problemNumber?: string;  // 문제 번호 (예: 대표 문제 1)
  conceptId?: number;
  conceptName?: string;
  topicId?: number;
  subTopicId?: number;
  level?: number;
  type?: string;
  tagTop?: string;
  correctAnswer?: string;
  userAnswer?: string;
  result: 'CORRECT' | 'WRONG' | 'NONE';
  totalUsed?: number;
  correctTimes?: number;
  wrongTimes?: number;
  answerRate?: number;
  problemImageUrl?: string;
  solutionImageUrl?: string;
}

// MathFlat 학습지 문제 상세 (student-worksheet)
export interface MathFlatWorksheetProblem {
  worksheetProblemId: number;
  problemId: number;
  problemTitle?: string;   // 문제 섹션
  problemNumber?: string;  // 문제 번호
  conceptId?: number;
  conceptName?: string;
  topicId?: number;
  subTopicId?: number;
  level?: number;
  type?: string;
  tagTop?: string;
  correctAnswer?: string;
  userAnswer?: string;
  result: 'CORRECT' | 'WRONG' | 'NONE';
  totalUsed?: number;
  correctTimes?: number;
  wrongTimes?: number;
  answerRate?: number;
  problemImageUrl?: string;
  solutionImageUrl?: string;
}

// 숙제 수집 옵션
export interface HomeworkCollectionOptions {
  collectionType: 'first' | 'second' | 'third';
  targetDate: Date;  // KST 기준
  classIds?: string[];  // 특정 반만 수집 (테스트용)
}

// 숙제 수집 결과
export interface HomeworkCollectionResult {
  success: boolean;
  collectionType: 'first' | 'second' | 'third';
  targetDate: string;
  processedClasses: ProcessedClassResult[];
  totalHomeworkCount: number;
  totalProblemCount: number;
  errors: string[];
  startedAt: string;
  completedAt: string;
  durationMs: number;
}

// 반별 처리 결과
export interface ProcessedClassResult {
  classId: string;
  className: string;
  mathflatClassId: string;
  previousClassDate?: string;  // 2차 수집 시 업데이트한 이전 수업일
  studentCount: number;
  homeworkCount: number;
  problemCount: number;
  error?: string;
}

// DB 저장용 타입 (mathflat_homework)
export interface DBMathflatHomework {
  id?: string;
  class_id?: string;
  mathflat_class_id: string;
  mathflat_student_id: string;
  student_name: string;
  homework_date: string;  // YYYY-MM-DD
  book_type: 'WORKBOOK' | 'WORKSHEET';
  book_id?: string;
  student_book_id?: string;
  student_homework_id?: string;
  title?: string;
  page?: string;  // 교재 페이지 범위 (예: "9~11,13~20")
  completed?: boolean;
  score?: number;
}

// DB 저장용 타입 (mathflat_problem_results)
export interface DBMathflatProblemResult {
  id?: string;
  daily_work_id?: string;    // FK to mathflat_daily_work (모든 풀이 연결)
  homework_id?: string;      // FK to mathflat_homework (숙제인 경우만)
  problem_id: string;
  workbook_problem_id?: string;
  worksheet_problem_id?: string;
  problem_title?: string;    // 문제 섹션 (예: 유형 한 걸음)
  problem_number?: string;   // 문제 번호 (예: 대표 문제 1)
  concept_id?: string;
  concept_name?: string;
  topic_id?: string;
  sub_topic_id?: string;
  level?: number;
  type?: string;
  tag_top?: string;
  correct_answer?: string;
  user_answer?: string;
  result?: 'CORRECT' | 'WRONG' | 'NONE' | 'UNKNOWN';
  total_used?: number;
  correct_times?: number;
  wrong_times?: number;
  answer_rate?: number;
  problem_image_url?: string;
  solution_image_url?: string;
}

// 대상 반 정보
export interface TargetClassInfo {
  id: string;
  name: string;
  mathflatClassId: string;
  dayOfWeek: string;
}

// ============================================
// 일일 풀이 수집 타입 (n8n 대체)
// ============================================

// MathFlat 일일 풀이 API 응답 (student-history/work)
export interface MathFlatWorkItem {
  bookType: 'WORKBOOK' | 'WORKSHEET';
  bookId: number;
  type: 'CHALLENGE' | 'SUPPLEMENTARY_WRONG_CHALLENGE' | 'CUSTOM';
  title: string;
  subtitle?: string;
  chapter?: string;
  elements?: number[];
  studentNumber?: number;
  autoScorable?: boolean;
  selfLearnings?: MathFlatWorkItem[];  // 오답 챌린지 재풀이
  components: Array<{
    status?: string;  // COMPLETE, PROGRESS 등
    updateDatetime: string;  // "2026-02-01T14:38:46"
    assignedCount: number;
    correctCount: number;
    wrongCount: number;
    bookType: 'WORKBOOK' | 'WORKSHEET';
    studentBookId: number;
    studentName: string;
    // WORKBOOK 전용
    studentWorkbookId?: number;
    page?: string;
    progressIdList?: number[];
  }>;
}

// MathFlat 학생 정보 (students API)
export interface MathFlatStudent {
  id: string;  // "I123456" 형식
  name: string;
  schoolName?: string;
  grade?: number;
  status?: 'ACTIVE' | 'INACTIVE';
}

// DB 저장용 타입 (mathflat_daily_work)
export interface DBMathflatDailyWork {
  id?: string;
  mathflat_student_id: string;
  student_name: string;
  work_date: string;  // YYYY-MM-DD
  work_type: 'WORKBOOK' | 'WORKSHEET';
  category: 'CHALLENGE' | 'CHALLENGE_WRONG' | 'CUSTOM';
  book_id?: string;
  student_book_id?: string;
  student_workbook_id?: string;
  progress_id_list?: number[];
  title?: string;
  subtitle?: string;
  chapter?: string;
  page?: string;
  assigned_count: number;
  correct_count: number;
  wrong_count: number;
  correct_rate: number;
  is_homework?: boolean;
  homework_id?: string;
  update_datetime?: string;
}

// 일일 풀이 수집 옵션
export interface DailyWorkCollectionOptions {
  targetDate: Date;  // KST 기준
  studentIds?: string[];  // 특정 학생만 수집 (테스트용)
  collectProblemDetails?: boolean;  // 오답 상세 수집 여부 (기본: true)
  maxWrongProblems?: number;  // 배치당 최대 오답 수집 개수 (기본: 100)
}

// 일일 풀이 수집 결과
export interface DailyWorkCollectionResult {
  success: boolean;
  targetDate: string;
  totalStudents: number;
  totalWorkCount: number;
  matchedHomeworkCount: number;
  totalProblemCount?: number;  // 수집된 오답 수
  remainingDailyWorks?: number;  // 남은 daily_work 건수 (배치 처리용)
  errors: string[];
  startedAt: string;
  completedAt: string;
  durationMs: number;
}