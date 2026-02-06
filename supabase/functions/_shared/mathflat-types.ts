// MathFlat Edge Function 공유 타입 정의

// MathFlat API 응답 타입
export interface MathFlatHomeworkItem {
  studentHomeworkId: number;
  studentBookId: number;
  bookId?: number;
  progressId?: number;
  progressIdList?: number[];
  studentWorkbookId?: number;
  title?: string;
  bookType: 'WORKBOOK' | 'WORKSHEET';
  completed: boolean;
  score?: number;
  page?: string;
  status?: string;
  createDatetime?: string;
  studentId?: string;
  studentName?: string;
}

export interface MathFlatWorkbookProblem {
  workbookProblemId: number;
  problemId: number;
  studentWorkbookProgressId?: number;
  problemTitle?: string;
  problemNumber?: string;
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

export interface MathFlatWorksheetProblem {
  worksheetProblemId: number;
  problemId: number;
  problemTitle?: string;
  problemNumber?: string;
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

export interface MathFlatWorkItem {
  bookType: 'WORKBOOK' | 'WORKSHEET';
  bookId: number;
  type: 'CHALLENGE' | 'SUPPLEMENTARY_WRONG_CHALLENGE' | 'CUSTOM';
  title: string;
  subtitle?: string;
  chapter?: string;
  selfLearnings?: MathFlatWorkItem[];
  components: Array<{
    status?: string;
    updateDatetime: string;
    assignedCount: number;
    correctCount: number;
    wrongCount: number;
    bookType: 'WORKBOOK' | 'WORKSHEET';
    studentBookId: number;
    studentName: string;
    studentWorkbookId?: number;
    page?: string;
    progressIdList?: number[];
  }>;
}

export interface MathFlatStudent {
  id: string;
  name: string;
  schoolName?: string;
  grade?: number;
  status?: 'ACTIVE' | 'INACTIVE';
}

// DB 저장용 타입
export interface DBMathflatDailyWork {
  id?: string;
  mathflat_student_id: string;
  student_name: string;
  work_date: string;
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
  update_datetime?: string;
}

export interface DBMathflatProblemResult {
  id?: string;
  daily_work_id?: string;
  progress_id?: number;
  problem_id: string;
  workbook_problem_id?: string;
  worksheet_problem_id?: string;
  problem_title?: string;
  problem_number?: string;
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

export interface DBMathflatHomework {
  id?: string;
  class_id?: string;
  mathflat_class_id: string;
  mathflat_student_id: string;
  student_name: string;
  homework_date: string;
  book_type: 'WORKBOOK' | 'WORKSHEET';
  book_id?: string;
  student_book_id?: string;
  student_homework_id?: string;
  progress_id_list?: number[];
  worksheet_problem_ids?: number[];
  total_problems?: number;
  title?: string;
  page?: string;
  completed?: boolean;
  score?: number;
}

export interface TargetClassInfo {
  id: string;
  name: string;
  mathflatClassId: string;
  dayOfWeek: string;
}

// 수집 옵션/결과 타입
export interface DailyWorkCollectionOptions {
  targetDate: Date;
  studentIds?: string[];
  collectProblemDetails?: boolean;
  maxDurationMs?: number;
}

export interface DailyWorkCollectionResult {
  success: boolean;
  targetDate: string;
  totalStudents: number;
  totalWorkCount: number;
  totalProblemCount?: number;
  remainingDailyWorks?: number;
  batchesProcessed?: number;
  errors: string[];
  startedAt: string;
  completedAt: string;
  durationMs: number;
}

export interface HomeworkCollectionOptions {
  collectionType: 'first';
  targetDate: Date;
  classIds?: string[];
  homeworkDate?: Date;
}

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

export interface ProcessedClassResult {
  classId: string;
  className: string;
  mathflatClassId: string;
  studentCount: number;
  homeworkCount: number;
  problemCount: number;
  error?: string;
}
