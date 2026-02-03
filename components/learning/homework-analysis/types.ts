// 학습 분석 대시보드 타입 정의

// 선생님 정보
export interface TeacherInfo {
  id: string;
  name: string;
  position: string;
}

// 반 정보
export interface ClassInfo {
  id: string;
  name: string;
  mathflat_class_id: string | null;
  teacher_id: string | null;
}

// 반 스케줄
export interface ClassSchedule {
  class_id: string;
  day_of_week: string;
}

// 학습 카테고리 (daily_work.category)
export type LearningCategory =
  | "CHALLENGE"        // 매플 AI 추천 문제 (자율학습)
  | "CHALLENGE_WRONG"  // 오답 챌린지 재풀이 (자율학습)
  | "CUSTOM";          // 강사가 만든 컨텐츠 (교재/학습지 - 숙제)

// 자율학습 카테고리만 (CHALLENGE 계열만 자율)
export type SelfStudyCategory = "CHALLENGE" | "CHALLENGE_WRONG";

// daily_work 테이블 데이터
export interface DailyWorkData {
  id: string;
  mathflat_student_id: string;
  student_name: string;
  work_date: string;
  work_type: string;
  category: LearningCategory;
  book_id: string | null;
  student_book_id: string | null;
  student_workbook_id: string | null;
  progress_id_list: number[] | null;
  title: string | null;
  subtitle: string | null;
  chapter: string | null;
  page: string | null;
  assigned_count: number | null;
  correct_count: number | null;
  wrong_count: number | null;
  correct_rate: number | null;
  update_datetime: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// 기존 숙제 테이블 데이터 (mathflat_homework)
export interface HomeworkData {
  id: string;
  class_id: string | null;
  mathflat_class_id: string;
  mathflat_student_id: string;
  student_name: string;
  homework_date: string;
  book_type: string;
  book_id: string | null;
  student_book_id: string | null;
  student_homework_id: string | null;
  progress_id_list: number[] | null;
  title: string | null;
  page: string | null;
  completed: boolean | null;
  score: number | null;
}

// 문제 결과 데이터 (오답만 저장됨)
export interface ProblemResult {
  id: string;
  daily_work_id: string;
  progress_id: number | null;
  problem_id: string;
  workbook_problem_id: string | null;
  worksheet_problem_id: string | null;
  concept_id: string | null;
  concept_name: string | null;
  topic_id: string | null;
  sub_topic_id: string | null;
  level: number | null;
  type: string | null;
  tag_top: string | null;
  correct_answer: string | null;
  user_answer: string | null;
  result: "CORRECT" | "WRONG" | "NONE" | "UNKNOWN" | null;
  total_used: number | null;
  correct_times: number | null;
  wrong_times: number | null;
  answer_rate: number | null;
  problem_image_url: string | null;
  solution_image_url: string | null;
  problem_title: string | null;
  problem_number: string | null;
}

// daily_work ↔ homework 매핑 데이터
export interface DailyWorkHomeworkMapping {
  id: string;
  daily_work_id: string;
  homework_id: string;
  matched_progress_ids: number[] | null;
  matched_count: number;
}

// 학생 숙제 요약 (개별 숙제)
export interface StudentHomework {
  title: string;
  page: string | null;
  total: number;
  solved: number;
  correct: number;
  wrong: number;
  notSolved: number;
  completionRate: number;
  correctRate: number;
}

// 학생별 숙제 요약
export interface StudentLearingSummary {
  studentName: string;
  mathflatStudentId: string;
  homeworks: StudentHomework[];
  totalCompletionRate: number;
  totalCorrectRate: number;
  weakConcepts: string[];
}

// 공통 오답 문제
export interface CommonWrongProblem {
  problemId: string;
  bookTitle: string | null;
  page: string | null;
  problemTitle: string | null;
  problemNumber: string | null;
  level: number | null;
  wrongCount: number;
  wrongStudents: string[];
  conceptName: string | null;
  problemImageUrl: string | null;
  solutionImageUrl: string | null;
}

// 개념별 약점
export interface ConceptWeakness {
  conceptName: string;
  wrongCount: number;
  wrongStudents: string[];
  relatedProblems: Array<{
    page: string | null;
    problemNumber: string | null;
  }>;
}

// 반별 요약
export interface ClassSummary {
  classId: string;
  className: string;
  students: StudentLearingSummary[];
  commonWrongProblems: CommonWrongProblem[];
  conceptWeaknesses: ConceptWeakness[];
  avgCompletionRate: number;
  avgCorrectRate: number;
  totalStudents: number;
  topWeakConcepts: string[];
}

// 날짜 정보
export interface DateInfo {
  month: number;
  day: number;
  dayOfWeek: string;
}

// 자율학습 카테고리 설정 (CHALLENGE 계열만)
export const SELF_STUDY_CATEGORY_CONFIG: Record<SelfStudyCategory, { label: string; icon: string; color: string; bgColor: string }> = {
  CHALLENGE: {
    label: "AI 추천",
    icon: "🎯",
    color: "text-purple-700",
    bgColor: "bg-purple-100",
  },
  CHALLENGE_WRONG: {
    label: "오답 재풀이",
    icon: "🔄",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
  },
};

// 자율학습인지 확인 (CHALLENGE 계열만 자율)
export function isSelfStudyCategory(category: string): category is SelfStudyCategory {
  return category === "CHALLENGE" || category === "CHALLENGE_WRONG";
}

// 유틸리티 함수: 페이지 번호 추출 (정렬용)
export function extractFirstPage(page: string | null): number {
  if (!page) return 999999;
  const match = page.match(/\d+/);
  return match ? parseInt(match[0], 10) : 999999;
}

// 유틸리티 함수: 문제 번호 추출 (정렬용)
export function extractProblemNumber(problemNumber: string | null): number {
  if (!problemNumber) return 999999;
  const numbers = problemNumber.match(/\d+/g);
  if (!numbers || numbers.length === 0) return 999999;
  if (numbers.length >= 2) {
    return parseFloat(`${numbers[0]}.${numbers[1]}`);
  }
  return parseInt(numbers[0], 10);
}

// 완료율 색상
export function getCompletionColor(rate: number): string {
  if (rate >= 100) return "bg-emerald-500";
  if (rate >= 80) return "bg-blue-500";
  if (rate >= 50) return "bg-amber-500";
  return "bg-red-500";
}

export function getCompletionTextColor(rate: number): string {
  if (rate >= 100) return "text-emerald-600";
  if (rate >= 80) return "text-blue-600";
  if (rate >= 50) return "text-amber-600";
  return "text-red-600";
}

// 정답률 색상
export function getCorrectRateColor(rate: number): string {
  if (rate >= 85) return "text-emerald-600";
  if (rate >= 70) return "text-blue-600";
  if (rate >= 50) return "text-amber-600";
  return "text-red-600";
}

// 오답수 색상 (반 인원 대비 비율)
export function getWrongCountColor(wrongCount: number, totalStudents: number): string {
  const ratio = totalStudents > 0 ? (wrongCount / totalStudents) * 100 : 0;
  if (ratio >= 70) {
    return "bg-rose-600 text-white";
  }
  if (ratio >= 40) {
    return "bg-orange-500 text-white";
  }
  return "bg-yellow-200 text-yellow-700";
}

// 날짜 포맷
export function formatDate(dateStr: string): DateInfo {
  const date = new Date(dateStr);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return {
    month: date.getMonth() + 1,
    day: date.getDate(),
    dayOfWeek: days[date.getDay()],
  };
}

// 요일 문자열 가져오기
export function getDayOfWeek(dateStr: string): string {
  const date = new Date(dateStr);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return days[date.getDay()];
}

// ============================================
// 학생별 분석 페이지 타입
// ============================================

// 개념 데이터 (mathflat_concepts)
export interface ConceptData {
  id: number;
  concept_id: number;
  concept_name: string;
  curriculum_key: string | null;
  big_chapter: string | null;
  middle_chapter: string | null;
  little_chapter: string | null;
  priority: number | null;
}

// 단원 트리 노드
export interface ChapterNode {
  name: string;
  level: "curriculum" | "big" | "middle" | "little" | "concept";
  children?: ChapterNode[];
  conceptCount?: number;
  conceptId?: number; // 개념 ID (concept 레벨에서 사용)
  path: string[]; // 상위 경로 (예: ["공통수학1", "다항식"])
}

// 단원 선택 상태
export interface ChapterSelection {
  curriculum: string | null;
  bigChapters: string[];
  middleChapters: string[];
  littleChapters: string[];
}

// 기간 타입
export type PeriodPreset = 7 | 14 | 30 | 60 | 90 | "all";

export interface PeriodSelection {
  type: "preset" | "custom";
  preset: PeriodPreset;
  customStart: string | null;
  customEnd: string | null;
}

// 학생별 분석 상태
export interface StudentAnalysisState {
  // 범위 선택 (상위, 학생 전환 시에도 유지)
  chapterSelection: ChapterSelection;
  isRangeLocked: boolean;

  // 대상 선택
  selectedClassId: string | null;
  selectedStudentId: string | null;

  // 기간 선택
  period: PeriodSelection;
}

// 초기 상태
export const INITIAL_STUDENT_ANALYSIS_STATE: StudentAnalysisState = {
  chapterSelection: {
    curriculum: null,
    bigChapters: [],
    middleChapters: [],
    littleChapters: [],
  },
  isRangeLocked: false,
  selectedClassId: null,
  selectedStudentId: null,
  period: {
    type: "preset",
    preset: 30,
    customStart: null,
    customEnd: null,
  },
};

// 기간 프리셋 설정
export const PERIOD_PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: 7, label: "7일" },
  { value: 14, label: "14일" },
  { value: 30, label: "30일" },
  { value: 60, label: "60일" },
  { value: 90, label: "90일" },
  { value: "all", label: "전체" },
];

// 과목 목록
export const CURRICULUM_LIST = [
  { key: "공통수학1", label: "공통수학1", color: "bg-blue-500" },
  { key: "공통수학2", label: "공통수학2", color: "bg-emerald-500" },
  { key: "대수", label: "대수", color: "bg-violet-500" },
  { key: "미적분", label: "미적분", color: "bg-amber-500" },
];

// 기간 계산 유틸리티
export function calculatePeriodDates(period: PeriodSelection): {
  startDate: string;
  endDate: string;
} {
  const today = new Date();
  const endDate = today.toISOString().split("T")[0];

  if (period.type === "custom" && period.customStart && period.customEnd) {
    return {
      startDate: period.customStart,
      endDate: period.customEnd,
    };
  }

  if (period.preset === "all") {
    // 1년 전부터
    const startDate = new Date(today);
    startDate.setFullYear(startDate.getFullYear() - 1);
    return {
      startDate: startDate.toISOString().split("T")[0],
      endDate,
    };
  }

  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - period.preset);
  return {
    startDate: startDate.toISOString().split("T")[0],
    endDate,
  };
}
