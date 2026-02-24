// 콘텐츠 유형
export type ContentType =
  | "blog"           // 블로그 포스트
  | "instagram_feed" // 인스타 피드
  | "instagram_story"// 인스타 스토리
  | "instagram_reel" // 인스타 릴스
  | "notice"         // 공지사항
  | "newsletter"     // 뉴스레터

export const CONTENT_TYPES: { value: ContentType; label: string; icon: string }[] = [
  { value: "blog", label: "블로그", icon: "📝" },
  { value: "instagram_feed", label: "인스타 피드", icon: "📷" },
  { value: "instagram_story", label: "인스타 스토리", icon: "📱" },
  { value: "instagram_reel", label: "인스타 릴스", icon: "🎬" },
  { value: "notice", label: "공지사항", icon: "📢" },
  { value: "newsletter", label: "뉴스레터", icon: "✉️" },
]

// 콘텐츠 상태
export type ContentStatus = "draft" | "ready" | "published" | "archived"

export const CONTENT_STATUSES: { value: ContentStatus; label: string; color: string }[] = [
  { value: "draft", label: "초안", color: "gray" },
  { value: "ready", label: "발행 준비", color: "yellow" },
  { value: "published", label: "발행됨", color: "green" },
  { value: "archived", label: "보관됨", color: "slate" },
]

// AI 생성 소스 정보
export interface GenerationSource {
  type: "achievement" | "review" | "classroom" | "exam_tip" | "manual"
  student_id?: string
  exam_score_id?: string
  review_id?: string
  improvement?: number
  metadata?: Record<string, unknown>
}

// 콘텐츠 포스트 타입
export interface ContentPost {
  id: string

  // 유형 및 상태
  content_type: ContentType
  status: ContentStatus

  // URL slug (블로그용)
  slug: string | null

  // 콘텐츠 본문
  title: string | null
  body: string | null
  summary: string | null

  // 인스타그램용
  caption: string | null
  hashtags: string[]

  // AI 생성 정보
  ai_generated: boolean
  ai_prompt_used: string | null
  generation_source: GenerationSource | null

  // 이미지/후기 연결
  image_ids: string[]
  cover_image_id: string | null
  review_ids: string[]

  // 발행 정보
  published_at: string | null
  publish_url: string | null

  // 통계
  view_count: number
  like_count: number
  comment_count: number

  // 메타
  created_by: string | null
  created_at: string
  updated_at: string

  // 조인된 데이터
  creator?: {
    name: string
  }
  cover_image?: {
    id: string
    storage_path: string
    title: string | null
  }
}

// 콘텐츠 생성/수정 폼 데이터
export interface ContentPostFormData {
  content_type: ContentType
  status?: ContentStatus
  slug?: string
  title?: string
  body?: string
  summary?: string
  caption?: string
  hashtags?: string[]
  ai_generated?: boolean
  ai_prompt_used?: string
  generation_source?: GenerationSource
  image_ids?: string[]
  cover_image_id?: string
  review_ids?: string[]
  published_at?: string
  publish_url?: string
  view_count?: number
  like_count?: number
  comment_count?: number
}

// 필터 옵션
export interface ContentPostFilters {
  content_type?: ContentType
  status?: ContentStatus
  search?: string
  ai_generated?: boolean
}
