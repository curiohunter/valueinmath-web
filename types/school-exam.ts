export type SchoolType = "중학교" | "고등학교"
export type ExamType = "중간고사" | "기말고사"

export interface SchoolExam {
  id: string
  school_id: string | null
  school_type: SchoolType
  grade: 1 | 2 | 3
  semester: 1 | 2
  school_name: string
  exam_year: number
  exam_type: ExamType
  is_collected: boolean
  is_uploaded_to_mathflat: boolean
  pdf_file_path: string | null
  pdf_file_size: number | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface SchoolExamFilters {
  search: string
  school_type: SchoolType | "all"
  grade: 1 | 2 | 3 | "all"
  semester: 1 | 2 | "all"
  exam_type: ExamType | "all"
  exam_year: number | "all"
  is_collected: boolean | "all"
  is_uploaded_to_mathflat: boolean | "all"
}

export interface SchoolExamFormData {
  school_id: string | null
  school_type: SchoolType
  grade: 1 | 2 | 3
  semester: 1 | 2
  school_name: string
  exam_year: number
  exam_type: ExamType
  is_collected: boolean
  is_uploaded_to_mathflat: boolean
  notes: string
  pdf_file?: File
}
