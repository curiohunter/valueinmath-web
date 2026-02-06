// 후기 출처
export type ReviewSource =
  | "naver_place"  // 네이버 플레이스
  | "naver_blog"   // 네이버 블로그
  | "kakao"        // 카카오맵
  | "google"       // 구글 리뷰
  | "direct"       // 학원에서 직접 수집
  | "survey"       // 만족도 조사
  | "portal"       // 학부모 포털에서 작성

export const REVIEW_SOURCES: { value: ReviewSource; label: string }[] = [
  { value: "naver_place", label: "네이버 플레이스" },
  { value: "naver_blog", label: "네이버 블로그" },
  { value: "kakao", label: "카카오맵" },
  { value: "google", label: "구글 리뷰" },
  { value: "direct", label: "직접 수집" },
  { value: "survey", label: "만족도 조사" },
  { value: "portal", label: "학부모 포털" },
]

// 작성자 유형
export type ReviewerType = "parent" | "student" | "anonymous"

export const REVIEWER_TYPES: { value: ReviewerType; label: string }[] = [
  { value: "parent", label: "학부모" },
  { value: "student", label: "학생" },
  { value: "anonymous", label: "익명" },
]

// 후기 하이라이트 (AI 분석 또는 수동 태그)
export interface ReviewHighlights {
  keywords?: string[]
  sentiment?: "positive" | "neutral" | "negative"
  mentioned_subjects?: string[]
  mentioned_grades?: string[]
}

// 후기 타입
export interface Review {
  id: string

  // 후기 출처
  source: ReviewSource

  // 후기 내용
  reviewer_name: string | null
  reviewer_type: ReviewerType | null
  rating: number | null
  title: string | null
  content: string

  // 연결 정보
  student_id: string | null

  // 원본 정보 (외부 후기인 경우)
  source_url: string | null
  source_review_id: string | null
  original_date: string | null

  // 활용 정보
  is_featured: boolean
  is_verified: boolean
  can_use_marketing: boolean

  // 후기 특성
  highlights: ReviewHighlights

  // 활용 이력
  used_in_posts: string[]
  used_count: number

  // 메타
  collected_by: string | null
  collected_at: string
  created_at: string
  updated_at: string

  // 조인된 데이터
  student?: {
    name: string
    school: string | null
    grade: string | null
  }
  collector?: {
    name: string
  }
}

// 후기 생성/수정 폼 데이터
export interface ReviewFormData {
  source: ReviewSource
  reviewer_name?: string
  reviewer_type?: ReviewerType
  rating?: number
  title?: string
  content: string
  student_id?: string
  source_url?: string
  original_date?: string
  is_featured?: boolean
  is_verified?: boolean
  can_use_marketing?: boolean
  highlights?: ReviewHighlights
}

// 필터 옵션
export interface ReviewFilters {
  source?: ReviewSource
  rating?: number
  is_featured?: boolean
  can_use_marketing?: boolean
  search?: string
}
