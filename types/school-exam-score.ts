export interface SchoolExamScore {
  id: string
  school_exam_id: string | null
  student_id: string
  school_id: string | null
  school_type: "중학교" | "고등학교"  // legacy, fallback용
  grade: 1 | 2 | 3
  semester: 1 | 2
  school_name: string  // legacy, fallback용
  exam_year: number
  exam_type: "중간고사" | "기말고사"
  subject: string
  score: number | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string

  // Joined data
  student?: {
    name: string
    status: string
  }
  school?: {
    id: string
    name: string
    school_type: string
  }
  school_exam?: {
    pdf_file_path: string | null
  }
}

export interface SchoolExamScoreFilters {
  search: string
  school_type: "all" | "중학교" | "고등학교"
  grade: "all" | "1" | "2" | "3"
  semester: "all" | "1" | "2"
  exam_type: "all" | "중간고사" | "기말고사"
  exam_year: "all" | string
  school_name: string
  subject: string
}

export interface SchoolExamScoreFormData {
  student_id: string
  school_id: string
  grade: 1 | 2 | 3
  semester: 1 | 2
  exam_year: number
  exam_type: "중간고사" | "기말고사"
  school_exam_id?: string | null
  scores: {
    subject: string
    score: number | null
  }[]
  notes?: string
}

export interface School {
  id: string
  name: string
  school_type: string
  short_name?: string | null
}
