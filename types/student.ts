export type StudentStatus = "재원" | "퇴원" | "휴원" | "미등록" | "신규상담"
export type Department = "고등관" | "중등관" | "영재관"
export type SchoolType = "초등학교" | "중학교" | "고등학교"
export type LeadSource =
  | "블로그"
  | "입소문"
  | "전화상담"
  | "원외학부모추천"
  | "원내학부모추천"
  | "원내친구추천"
  | "원외친구추천"
  | "오프라인"
  | "형제"
  | "문자메세지"
  | "부원장"
  | "맘까페"
  | "홈페이지"

export type CreatedByType = "employee" | "self_service" | "import"

export interface Student {
  id: string
  name: string
  student_phone: string | null
  parent_phone: string | null
  payment_phone: string | null
  status: StudentStatus
  department: Department | null
  school: string | null
  school_type: SchoolType | null
  grade: number | null
  has_sibling: boolean
  lead_source: LeadSource | null
  created_by_type: CreatedByType
  start_date: string | null
  end_date: string | null
  first_contact_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // B2B SaaS Foundation - Soft Delete
  is_active: boolean
  left_at: string | null
  left_reason: string | null
}

export interface StudentFilters {
  search: string
  department: Department | "all"
  status: StudentStatus | "all"
  school_type: SchoolType | "all"
  grade: number | "all"
}
