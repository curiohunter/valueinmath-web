// 브랜드 보이스 톤
export type BrandTone = "friendly" | "professional" | "warm"

// 브랜딩 설정 타입
export interface BrandSettings {
  id: string

  // 기본 정보
  academy_name: string
  slogan: string | null
  tagline: string | null

  // 브랜드 스토리
  founding_story: string | null
  philosophy: string | null
  differentiators: string[]  // 차별화 포인트

  // 타겟 페르소나
  target_persona: TargetPersona | null

  // 성공 하이라이트
  success_highlights: SuccessHighlight[]
  awards: string[]

  // 브랜드 보이스
  tone: BrandTone
  keywords: string[]
  hashtags: string[]

  // SNS/온라인 정보
  instagram_handle: string | null
  blog_url: string | null
  youtube_url: string | null
  naver_place_url: string | null
  kakao_channel_url: string | null

  created_at: string
  updated_at: string
}

// 타겟 페르소나
export interface TargetPersona {
  parent_type?: string        // "교육열 높은 학부모", "바쁜 맞벌이 부부" 등
  student_type?: string       // "상위권 유지", "중위권 도약" 등
  pain_points?: string[]      // 고민 포인트
  desired_outcomes?: string[] // 원하는 결과
}

// 성공 사례
export interface SuccessHighlight {
  title: string
  description: string
  metric?: string  // "30점 향상", "1등급 달성" 등
}

// 폼 데이터 타입 (저장 시 사용)
export interface BrandSettingsFormData {
  academy_name?: string
  slogan?: string | null
  tagline?: string | null
  founding_story?: string | null
  philosophy?: string | null
  differentiators?: string[]
  target_persona?: TargetPersona | null
  success_highlights?: SuccessHighlight[]
  awards?: string[]
  tone?: BrandTone
  keywords?: string[]
  hashtags?: string[]
  instagram_handle?: string | null
  blog_url?: string | null
  youtube_url?: string | null
  naver_place_url?: string | null
  kakao_channel_url?: string | null
}

// 학교/학년 분포 통계 (students 테이블에서 자동 분석)
export interface StudentDistribution {
  by_school_type: {
    school_type: string
    count: number
  }[]
  by_grade: {
    school_type: string
    grade: number
    count: number
  }[]
  top_schools: {
    school: string
    school_type: string
    count: number
  }[]
  total_active: number
}
