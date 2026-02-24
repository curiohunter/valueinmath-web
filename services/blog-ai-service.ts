/**
 * AI 블로그 콘텐츠 생성 서비스
 * brand_settings + 주제 + 톤 + 리뷰 데이터를 기반으로 블로그 초안 생성
 */

import { generateText } from '@/lib/llm-client'

// ============================================
// 주제 유형
// ============================================

export type BlogTopic =
  | 'study_tips'       // 학습팁
  | 'parent_guide'     // 학부모 가이드
  | 'success_story'    // 성공사례
  | 'academy_news'     // 학원소식
  | 'exam_prep'        // 시험대비
  | 'math_concept'     // 수학개념
  | 'free_topic'       // 자유주제

export const BLOG_TOPICS: { value: BlogTopic; label: string; description: string }[] = [
  { value: 'study_tips', label: '학습팁', description: '효과적인 수학 공부법과 학습 전략' },
  { value: 'parent_guide', label: '학부모 가이드', description: '자녀 수학 교육을 위한 학부모 안내' },
  { value: 'success_story', label: '성공사례', description: '학생 성적 향상 및 목표 달성 이야기' },
  { value: 'academy_news', label: '학원소식', description: '밸류인수학학원의 새로운 소식' },
  { value: 'exam_prep', label: '시험대비', description: '내신/수능 시험 대비 전략' },
  { value: 'math_concept', label: '수학개념', description: '핵심 수학 개념 설명' },
  { value: 'free_topic', label: '자유주제', description: '직접 주제를 입력합니다' },
]

export type BlogTone = 'friendly' | 'professional' | 'warm'

export const BLOG_TONES: { value: BlogTone; label: string }[] = [
  { value: 'friendly', label: '친근한' },
  { value: 'professional', label: '전문적인' },
  { value: 'warm', label: '따뜻한' },
]

export type BlogLength = 'short' | 'medium' | 'long'

export const BLOG_LENGTHS: { value: BlogLength; label: string; tokens: number }[] = [
  { value: 'short', label: '짧게 (~500자)', tokens: 800 },
  { value: 'medium', label: '보통 (~1000자)', tokens: 1500 },
  { value: 'long', label: '길게 (~2000자)', tokens: 2500 },
]

// ============================================
// 입력/출력 인터페이스
// ============================================

export interface BlogGenerateOptions {
  topic: BlogTopic
  customTopic?: string       // free_topic일 때
  tone: BlogTone
  length: BlogLength
  includeReviews: boolean
}

export interface BrandContext {
  academy_name: string
  philosophy: string | null
  differentiators: string[]
  tone: string
}

export interface BlogGenerateResult {
  title: string
  summary: string
  body: string
  hashtags: string[]
}

// ============================================
// 프롬프트 빌드
// ============================================

function getTopicInstruction(topic: BlogTopic, customTopic?: string): string {
  const instructions: Record<BlogTopic, string> = {
    study_tips: '수학 공부를 잘하는 방법, 학습 습관, 효과적인 문제 풀이 전략에 대해 작성해주세요.',
    parent_guide: '자녀의 수학 교육을 위해 학부모가 알아야 할 점, 가정에서 도울 수 있는 방법에 대해 작성해주세요.',
    success_story: '학생의 수학 성적 향상, 목표 달성, 학습 태도 변화에 대한 성공 이야기를 작성해주세요. (실제 학생 이름은 사용하지 마세요)',
    academy_news: '학원의 새로운 프로그램, 이벤트, 변경사항 등 학원 소식을 작성해주세요.',
    exam_prep: '중간고사/기말고사/수능 등 시험을 앞둔 학생들을 위한 대비 전략과 팁을 작성해주세요.',
    math_concept: '중고등 수학의 핵심 개념을 쉽고 명확하게 설명하는 글을 작성해주세요.',
    free_topic: customTopic
      ? `다음 주제로 블로그 글을 작성해주세요: ${customTopic}`
      : '수학 교육과 관련된 자유로운 주제로 블로그 글을 작성해주세요.',
  }
  return instructions[topic]
}

function getToneInstruction(tone: BlogTone): string {
  const instructions: Record<BlogTone, string> = {
    friendly: '친근하고 편안한 어투로, 학부모와 학생이 부담 없이 읽을 수 있게 작성해주세요.',
    professional: '전문적이고 신뢰감 있는 어투로, 교육 전문가로서의 인사이트를 담아 작성해주세요.',
    warm: '따뜻하고 격려하는 어투로, 학생과 학부모에게 응원을 전하는 느낌으로 작성해주세요.',
  }
  return instructions[tone]
}

export function buildBlogPrompt(
  options: BlogGenerateOptions,
  brand: BrandContext,
  reviews?: string[]
): string {
  const topicInstruction = getTopicInstruction(options.topic, options.customTopic)
  const toneInstruction = getToneInstruction(options.tone)
  const lengthInfo = BLOG_LENGTHS.find((l) => l.value === options.length)

  let prompt = `당신은 "${brand.academy_name}"의 블로그 콘텐츠 작성자입니다.

## 학원 정보
- 이름: ${brand.academy_name}
- 브랜드 톤: ${brand.tone}
${brand.philosophy ? `- 교육 철학: ${brand.philosophy.slice(0, 500)}` : ''}
${brand.differentiators.length > 0 ? `- 차별화 포인트: ${brand.differentiators.join(', ')}` : ''}

## 작성 요청
${topicInstruction}

## 톤 & 스타일
${toneInstruction}

## 길이
약 ${lengthInfo?.label || '1000자'} 분량으로 작성해주세요.`

  if (options.includeReviews && reviews && reviews.length > 0) {
    prompt += `

## 참고할 실제 후기 (자연스럽게 녹여서 활용)
${reviews.slice(0, 5).map((r, i) => `${i + 1}. "${r}"`).join('\n')}`
  }

  prompt += `

## 출력 형식 (반드시 아래 JSON 형식으로만 응답)
{
  "title": "블로그 제목",
  "summary": "2~3문장의 요약",
  "body": "마크다운 형식의 본문",
  "hashtags": ["해시태그1", "해시태그2", "해시태그3", "해시태그4", "해시태그5"]
}

중요: JSON 외의 텍스트를 포함하지 마세요. 코드블록 마커(\`\`\`)도 사용하지 마세요.`

  return prompt
}

// ============================================
// 생성 함수
// ============================================

export async function generateBlogPost(
  options: BlogGenerateOptions,
  brand: BrandContext,
  reviews?: string[]
): Promise<BlogGenerateResult> {
  const prompt = buildBlogPrompt(options, brand, reviews)
  const lengthInfo = BLOG_LENGTHS.find((l) => l.value === options.length)

  const result = await generateText({
    prompt,
    maxTokens: lengthInfo?.tokens || 1500,
    temperature: 0.8,
  })

  // JSON 파싱
  const cleanedText = result.text
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim()

  try {
    const parsed = JSON.parse(cleanedText)
    return {
      title: parsed.title || '제목 없음',
      summary: parsed.summary || '',
      body: parsed.body || '',
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
    }
  } catch {
    // JSON 파싱 실패 시 전체 텍스트를 body로 사용
    return {
      title: '생성된 블로그 글',
      summary: '',
      body: result.text,
      hashtags: [],
    }
  }
}
