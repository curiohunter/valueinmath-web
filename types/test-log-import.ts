// 테스트 로그 스마트 가져오기 관련 타입 정의

export type SourceType = 'manual' | 'mathflat_worksheet' | 'kmm' | 'school_exam';

export interface ImportCandidate {
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  date: string;
  test: string;
  testType: string;
  testScore: number | null;
  note: string;
  sourceType: Exclude<SourceType, 'manual'>;
  sourceId: string;
  selected: boolean;
  alreadyImported: boolean;
}

// 학습지(WORKSHEET) 그룹핑용
export interface WorksheetGroup {
  title: string;
  date: string;
  count: number;
  items: WorksheetItem[];
  expanded: boolean;
}

export interface WorksheetItem {
  id: string;
  mathflatStudentId: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  title: string;
  subtitle: string | null;
  workDate: string;
  assignedCount: number;
  correctCount: number;
  wrongCount: number;
  correctRate: number;
  alreadyImported: boolean;
}

// KMM 경시대회 결과
export interface KmmResult {
  id: string;
  yearMonth: string;
  mathflatStudentId: string;
  studentId: string | null;
  studentName: string;
  schoolType: string;
  grade: string;
  score: number | null;
  correctCount: number;
  wrongCount: number;
  status: string;
  tier: string | null;
  alreadyImported: boolean;
}

// 기출문제 시험 정보
export interface SchoolExamInfo {
  id: string;
  schoolName: string;
  schoolType: string;
  grade: number;
  semester: number;
  examType: string;
  examYear: number;
}

// 기출문제 학생별 점수 입력
export interface SchoolExamStudentScore {
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  testScore: number | null;
  note: string;
}

// test_logs INSERT용
export interface TestLogInsertData {
  class_id: string | null;
  student_id: string;
  date: string;
  test: string | null;
  test_type: string | null;
  test_score: number | null;
  note: string | null;
  created_by: string | null;
  student_name_snapshot: string | null;
  class_name_snapshot: string | null;
  source_type: SourceType;
  source_id: string | null;
}

// source 뱃지 표시용
export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  manual: '수동',
  mathflat_worksheet: '학습지',
  kmm: 'KMM',
  school_exam: '기출',
};

export const SOURCE_TYPE_COLORS: Record<SourceType, string> = {
  manual: 'bg-gray-100 text-gray-600',
  mathflat_worksheet: 'bg-blue-100 text-blue-700',
  kmm: 'bg-orange-100 text-orange-700',
  school_exam: 'bg-purple-100 text-purple-700',
};
