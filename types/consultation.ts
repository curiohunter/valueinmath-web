import type { Database } from './database';
import type { ConsultationOutcomeType } from './b2b-saas';

// Enum types from database
export type ConsultationType = Database['public']['Enums']['consultation_type_enum'];
export type ConsultationMethod = Database['public']['Enums']['consultation_method_enum'];
export type ConsultationStatus = Database['public']['Enums']['consultation_status_enum'];

// B2B SaaS Foundation - Re-export outcome type
export type { ConsultationOutcomeType } from './b2b-saas';

// Base consultation type from database
export type ConsultationRow = Database['public']['Tables']['consultations']['Row'];
export type ConsultationInsert = Database['public']['Tables']['consultations']['Insert'];
export type ConsultationUpdate = Database['public']['Tables']['consultations']['Update'];

// AI 분석 태그 타입
export type ConsultationHurdle =
  // 퍼널용 (신규상담, 입테유도, 입테후상담, 등록유도)
  | 'schedule_conflict' | 'competitor_comparison' | 'student_refusal'
  | 'distance' | 'timing_defer' | 'price' | 'none'
  // 재원생용 (정기상담, 입학후상담, 퇴원상담)
  | 'emotional_distress' | 'peer_relationship' | 'curriculum_dissatisfaction'
  | 'lack_of_attention' | 'academic_stagnation';

export type ConsultationReadiness = 'high' | 'medium' | 'low';
export type ConsultationDecisionMaker = 'parent' | 'student' | 'both';
export type ConsultationSentiment = 'very_positive' | 'positive' | 'neutral' | 'negative';

// 이탈 위험도 (재원생용)
export type ConsultationChurnRisk = 'critical' | 'high' | 'medium' | 'low' | 'none';

// Extended consultation type with relationships
export interface Consultation extends ConsultationRow {
  student?: Database['public']['Tables']['students']['Row'];
  counselor?: Database['public']['Tables']['employees']['Row'];
  calendar_event?: Database['public']['Tables']['calendar_events']['Row'];
  next_calendar_event?: Database['public']['Tables']['calendar_events']['Row'];
  // AI 분석 태그
  ai_hurdle?: ConsultationHurdle | null;
  ai_readiness?: ConsultationReadiness | null;
  ai_decision_maker?: ConsultationDecisionMaker | null;
  ai_sentiment?: ConsultationSentiment | null;
  ai_churn_risk?: ConsultationChurnRisk | null;
  ai_analyzed_at?: string | null;
}

// Form data type for creating/updating consultations
export interface ConsultationFormData {
  student_id: string;
  type: ConsultationType;
  method: ConsultationMethod;
  date: string;
  counselor_id: string;
  content?: string;
  status: ConsultationStatus;
  next_action?: string;
  next_date?: string;
  student_name_snapshot?: string;
  counselor_name_snapshot?: string;
  // B2B SaaS Foundation - Outcome tracking
  outcome?: ConsultationOutcomeType;
  outcome_date?: string;
  outcome_notes?: string;
}

// Filter options for consultation list
export interface ConsultationFilters {
  type?: ConsultationType | 'all';
  method?: ConsultationMethod | 'all';
  status?: ConsultationStatus | 'all';
  counselor_id?: string | 'all';
  student_name?: string;
  date_from?: string;
  date_to?: string;
}

// Statistics type for dashboard
export interface ConsultationStats {
  totalThisMonth: number;
  newInquiries: number;
  testConversionRate: number; // 입학테스트 전환율
  enrollmentConversionRate: number; // 등록 전환율
  scheduledToday: number;
  completedThisMonth: number;
  byType: Record<ConsultationType, number>;
  byCounselor: Record<string, number>;
}

// Consultation modal props
export interface ConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentInfo?: {
    studentId: string;
    studentName: string;
    school?: string;
    schoolType?: string;
    grade?: number;
  };
  editingConsultation?: Consultation | null;
  onSuccess?: () => void;
}

// Helper functions for date/time formatting in KST
export const formatDateToKST = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getKoreanDate = (): string => {
  const now = new Date();
  const koreanTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  return koreanTime.toISOString().slice(0, 10);
};

export const formatDateTimeToKST = (date: Date, hour: string, minute: string): string => {
  const dateStr = formatDateToKST(date);
  return `${dateStr}T${hour}:${minute}:00`;
};

// 상담 페이지 통계 타입
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
  consultationRequestsTotal: number;      // 상담요청 전체
  consultationRequestsPending: number;    // 상담요청 대기중
  consultationRequestsCompleted: number;  // 상담요청 완료
}