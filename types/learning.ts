// 학습 대시보드 관련 타입 정의

/**
 * 전월 대비 트렌드 정보
 */
export type MetricTrend = {
  direction: "up" | "down" | "neutral"
  value: number // 절대값 차이
  percentage?: number // 퍼센트 차이 (선택)
}

/**
 * 알림 수준 (임계값 기반)
 */
export type AlertLevel = "normal" | "warning" | "critical"

// ==========================================
// 학습 기록 페이지 관련 타입 정의
// ==========================================

/**
 * 학습 기록 행 타입
 */
export interface StudyLogRow {
  id?: string;
  tempId?: string;
  classId: string;
  studentId: string;
  name: string;
  date: string;
  attendance: number;
  homework: number;
  focus: number;
  note: string;
  book1: string;
  book1log: string;
  book2: string;
  book2log: string;
  createdBy?: string;
  createdByName?: string;
  lastModifiedBy?: string;
  lastModifiedByName?: string;
  updatedAt?: string;
}

export interface ClassInfo {
  id: string;
  name: string;
  teacher_id: string | null;
}

export interface StudentInfo {
  id: string;
  name: string;
  status: string | null;
  grade?: number | null;
  school_type?: string | null;
}

export interface TeacherInfo {
  id: string;
  name: string;
}

export interface ClassStudent {
  class_id: string;
  student_id: string;
}

export type ModalField = "book1" | "book1log" | "book2" | "book2log" | "note";

// 라벨 상수
export const ATTENDANCE_LABELS: Record<number, string> = {
  5: "출석",
  4: "지각",
  3: "조퇴",
  2: "보강",
  1: "결석"
};

export const HOMEWORK_LABELS: Record<number, string> = {
  5: "100% 마무리",
  4: "90% 이상",
  3: "추가 추적 필요",
  2: "보강필요",
  1: "결석"
};

export const FOCUS_LABELS: Record<number, string> = {
  5: "매우 열의있음",
  4: "대체로 잘참여",
  3: "보통",
  2: "조치필요",
  1: "결석"
};

// 점수 색상 스타일 함수 (노션 스타일)
export const getScoreColor = (score: number): string => {
  switch (score) {
    case 1: return "bg-red-100 text-red-600 border-red-200";
    case 2: return "bg-orange-100 text-orange-600 border-orange-200";
    case 3: return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case 4: return "bg-blue-100 text-blue-600 border-blue-200";
    case 5: return "bg-green-100 text-green-700 border-green-200";
    default: return "bg-gray-100 text-gray-400 border-gray-200";
  }
};

// 한국 시간대(KST) 기준으로 오늘 날짜 가져오기
export const getKoreanDate = (): string => {
  const now = new Date();
  const koreanTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  return koreanTime.toISOString().slice(0, 10);
};
