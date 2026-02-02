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
  progress_id_list: string[] | null;
  title: string | null;
  subtitle: string | null;
  chapter: string | null;
  page: string | null;
  assigned_count: number | null;
  correct_count: number | null;
  wrong_count: number | null;
  correct_rate: number | null;
  is_homework: boolean;
  homework_id: string | null;
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
  title: string | null;
  page: string | null;
  completed: boolean | null;
  score: number | null;
}

// 문제 결과 데이터
export interface ProblemResult {
  id: string;
  homework_id: string | null;
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

// 자율학습 요약 (CHALLENGE 계열만)
export interface SelfStudySummary {
  total: number;
  correctRate: number;
  categories: Record<SelfStudyCategory, number>;
}

// 학생별 학습 요약 (숙제 + 자율학습 통합)
export interface StudentLearingSummary {
  studentName: string;
  mathflatStudentId: string;
  // 숙제 관련
  homeworks: StudentHomework[];
  totalCompletionRate: number;
  totalCorrectRate: number;
  // 자율학습 관련
  selfStudy: SelfStudySummary;
  // 취약 개념
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
  // 추가: 자율학습 통계
  totalSelfStudyProblems: number;
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
