import type { ContentType, ContentStatus } from "@/types/content-post"

/**
 * 콘텐츠 유형 옵션 - 컴포넌트 외부에서 정의하여 재생성 방지
 * @see rendering-hoist-jsx
 */
export const CONTENT_TYPE_OPTIONS: {
  value: ContentType
  label: string
  icon: string
  description: string
}[] = [
  {
    value: "blog",
    label: "블로그",
    icon: "📝",
    description: "네이버 블로그, 티스토리 등",
  },
  {
    value: "instagram_feed",
    label: "인스타 피드",
    icon: "📷",
    description: "정사각형 이미지 + 캡션",
  },
  {
    value: "instagram_story",
    label: "인스타 스토리",
    icon: "📱",
    description: "세로형 이미지/영상",
  },
  {
    value: "instagram_reel",
    label: "인스타 릴스",
    icon: "🎬",
    description: "짧은 영상 콘텐츠",
  },
  {
    value: "notice",
    label: "공지사항",
    icon: "📢",
    description: "학원 내부/외부 공지",
  },
  {
    value: "newsletter",
    label: "뉴스레터",
    icon: "✉️",
    description: "이메일 뉴스레터",
  },
]

/**
 * 콘텐츠 상태 옵션
 */
export const CONTENT_STATUS_OPTIONS: {
  value: ContentStatus
  label: string
  color: string
  description: string
}[] = [
  {
    value: "draft",
    label: "초안",
    color: "gray",
    description: "작성 중인 콘텐츠",
  },
  {
    value: "ready",
    label: "발행 준비",
    color: "yellow",
    description: "검토 완료, 발행 대기",
  },
  {
    value: "published",
    label: "발행됨",
    color: "green",
    description: "발행 완료된 콘텐츠",
  },
  {
    value: "archived",
    label: "보관",
    color: "slate",
    description: "보관된 이전 콘텐츠",
  },
]

/**
 * 상태별 뱃지 variant 매핑
 */
export const STATUS_BADGE_VARIANT: Record<
  ContentStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  draft: "secondary",
  ready: "default",
  published: "outline",
  archived: "secondary",
}

/**
 * 기본 해시태그 추천 (학원용)
 */
export const SUGGESTED_HASHTAGS = [
  "밸류인수학학원",
  "광명수학학원",
  "광남중",
  "양진중",
  "광명고",
  "수학학원",
  "중등수학",
  "고등수학",
  "내신대비",
  "수능대비",
]
