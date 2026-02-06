// 이미지 카테고리
export type ImageCategory =
  | "classroom"   // 수업 현장
  | "event"       // 이벤트/행사
  | "achievement" // 성과/성적
  | "daily"       // 일상
  | "material"    // 교재/자료
  | "facility"    // 시설

export const IMAGE_CATEGORIES: { value: ImageCategory; label: string }[] = [
  { value: "classroom", label: "수업 현장" },
  { value: "event", label: "이벤트/행사" },
  { value: "achievement", label: "성과/성적" },
  { value: "daily", label: "일상" },
  { value: "material", label: "교재/자료" },
  { value: "facility", label: "시설" },
]

// 콘텐츠 이미지 타입
export interface ContentImage {
  id: string

  // 파일 정보
  storage_path: string
  storage_bucket: string
  original_filename: string | null
  file_size: number | null
  mime_type: string | null
  width: number | null
  height: number | null

  // 분류
  category: ImageCategory

  // 메타데이터
  title: string | null
  caption: string | null
  alt_text: string | null
  taken_at: string | null

  // 태그
  tags: string[]

  // 학생 연결 (프라이버시)
  student_ids: string[]
  privacy_consent: boolean

  // 사용 추적
  used_count: number
  last_used_at: string | null

  // 메타
  uploaded_by: string | null
  created_at: string

  // 조인된 데이터
  uploader?: {
    name: string
  }
  public_url?: string
}

// 업로드 폼 데이터
export interface ContentImageUploadData {
  category: ImageCategory
  title?: string
  caption?: string
  tags?: string[]
  taken_at?: string
  privacy_consent?: boolean
}

// 필터 옵션
export interface ContentImageFilters {
  category?: ImageCategory
  tags?: string[]
  privacy_consent?: boolean
  search?: string
}
