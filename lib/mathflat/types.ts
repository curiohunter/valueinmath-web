// MathFlat 크롤링 시스템 타입 정의

export type CategoryType = '학습지' | '교재' | '오답/심화' | '챌린지';

export interface MathflatRecord {
  studentId: string;
  date: string; // YYYY-MM-DD
  category: CategoryType;
  problemsSolved: number;
  accuracyRate: number;
}

export interface StudentInfo {
  id: string; // Supabase student ID
  name: string;
  mathflatId?: string; // MathFlat 내부 ID (필요 시)
}

export interface StudentData {
  student: StudentInfo;
  records: MathflatRecord[];
}

export interface WeeklySummary {
  studentId: string;
  weekStart: string;
  weekEnd: string;
  totalProblems: number;
  avgAccuracy: number;
  categoryBreakdown: Record<CategoryType, number>;
  notes?: string[];
}

export interface CrawlOptions {
  dateRange?: {
    start: string; // YYYY-MM-DD
    end: string;   // YYYY-MM-DD
  };
  studentIds?: string[]; // 특정 학생만 크롤링
  categories?: CategoryType[]; // 특정 카테고리만 크롤링
  grades?: string[]; // 특정 학년만 크롤링 (예: ['고2'])
}

export interface CrawlResult {
  success: boolean;
  studentsProcessed: number;
  recordsCreated: number;
  errors: Array<{
    studentName: string;
    error: string;
  }>;
  duration: number; // milliseconds
  timestamp: string;
}

export interface SyncLog {
  id?: string;
  syncType: 'manual' | 'scheduled';
  status: 'running' | 'success' | 'failed' | 'partial';
  studentsTotal: number;
  studentsSynced: number;
  studentsFailed: number;
  errorDetails?: any;
  startedAt: string;
  completedAt?: string;
  durationSeconds?: number;
}

// Database types (matching Supabase schema)
export interface DBMathflatRecord {
  id?: string;
  student_id: string;
  date: string;
  category: CategoryType;
  problems_solved: number;
  accuracy_rate: number;
  created_at?: string;
  updated_at?: string;
}

export interface DBWeeklySummary {
  id?: string;
  student_id: string;
  week_start: string;
  week_end: string;
  total_problems: number;
  avg_accuracy: number;
  category_breakdown: Record<CategoryType, number>;
  notes?: string[];
  synced_at?: string;
}

export interface DBSyncLog {
  id?: string;
  sync_type: 'manual' | 'scheduled';
  status: 'running' | 'success' | 'failed' | 'partial';
  students_total: number;
  students_synced: number;
  students_failed: number;
  error_details?: any;
  started_at: string;
  completed_at?: string;
  duration_seconds?: number;
}