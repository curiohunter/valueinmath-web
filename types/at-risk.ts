// Type definitions for at-risk student tracking system

export interface RiskFactor {
  attendanceAvg: number;      // 출석 평균 (1-5)
  homeworkAvg: number;        // 숙제 평균 (1-5)
  focusAvg: number;          // 집중도 평균 (1-5)
  testScore: number | null;   // 시험 점수 평균
  missingTests: number;       // 미응시 시험 수
}

export interface AtRiskStudent {
  studentId: string;
  studentName: string;
  className: string;
  teacherId: string;
  teacherName: string;
  department?: string;
  riskLevel: 'high' | 'medium' | 'low';
  factors: RiskFactor;
  totalScore: number;
}

export interface TeacherGroup {
  teacherId: string;
  teacherName: string;
  students: AtRiskStudent[];
}

export interface AtRiskSnapshot {
  id?: string;
  snapshot_date: string;
  student_id: string;
  student_name: string;
  teacher_id: string;
  teacher_name: string;
  class_names: string;
  department: string | null;
  risk_level: 'high' | 'medium' | 'low';
  total_score: number;
  attendance_avg: number | null;
  homework_avg: number | null;
  focus_avg: number | null;
  test_score: number | null;
  missing_tests: number;
  created_at?: string;
}

export interface MonthlyComparison {
  month1: {
    year: number;
    month: number;
    total: number;
    byRiskLevel: {
      high: number;
      medium: number;
      low: number;
    };
  };
  month2: {
    year: number;
    month: number;
    total: number;
    byRiskLevel: {
      high: number;
      medium: number;
      low: number;
    };
  };
  studentChanges: Array<{
    studentId: string;
    studentName: string;
    month1RiskLevel: string;
    month2RiskLevel: string;
    scoreChange: number;
  }>;
}

export interface ConsultationPageStats {
  newStudentsThisMonth: number;           // 이번달 신규생
  newStudentsByDept: Record<string, number>; // 부서별 신규생
  newStudentsByDeptNames: Record<string, string[]>; // 부서별 신규생 이름 리스트
  consultationsThisMonth: number;         // 이번달 신규상담 수
  consultationsByDept: Record<string, number>; // 부서별 신규상담 수
  testConversionByDept: Record<string, number>; // 부서별 입학테스트 전환율
  testConversionTotal: { consultations: number; tests: number }; // 전체 상담 대비 테스트 수
  enrollmentConversionByDept: Record<string, number>; // 부서별 신규등원 전환율
  enrollmentConversionTotal: { consultations: number; enrollments: number }; // 전체 상담 대비 등원 수
  atRiskCount: number;                    // 고위험 학생 수
  atRiskByDept: Record<string, number>;   // 부서별 위험 학생 수
}