/**
 * 상담 AI 태깅 서비스
 * Edge Function을 호출하여 상담 내용을 분석하고 태그를 자동 생성
 */

import { createClient } from "@/lib/supabase/client"

// AI 분석 결과 타입
export interface ConsultationAIAnalysis {
  hurdle: 'schedule_conflict' | 'competitor_comparison' | 'student_refusal' | 'distance' | 'timing_defer' | 'price' | 'none'
  readiness: 'high' | 'medium' | 'low'
  decision_maker: 'parent' | 'student' | 'both'
  sentiment: 'very_positive' | 'positive' | 'neutral' | 'negative'
}

// 태그 한글 라벨
export const AI_TAG_LABELS = {
  hurdle: {
    schedule_conflict: '시간표 충돌',
    competitor_comparison: '타학원 비교',
    student_refusal: '학생 거부',
    distance: '거리 문제',
    timing_defer: '시기 연기',
    price: '비용 문제',
    none: '없음',
  },
  readiness: {
    high: '높음',
    medium: '보통',
    low: '낮음',
  },
  decision_maker: {
    parent: '부모',
    student: '학생',
    both: '함께',
  },
  sentiment: {
    very_positive: '매우 긍정',
    positive: '긍정',
    neutral: '중립',
    negative: '부정',
  },
} as const

// 태그 상세 설명 (툴팁용)
export const AI_TAG_DESCRIPTIONS = {
  hurdle: {
    schedule_conflict: '다른 학원 시간과 겹치거나 일정 조율이 어려움',
    competitor_comparison: '다른 학원과 비교 중이거나 타학원 경험 언급',
    student_refusal: '학생 본인이 학원 다니기를 거부하거나 꺼려함',
    distance: '학원까지 거리가 멀어서 통학이 부담됨',
    timing_defer: '지금은 아니고 나중에 시작하겠다고 미룸',
    price: '수강료가 부담되거나 가격 협상 요청',
    none: '특별한 등록 장애요인 없음',
  },
  readiness: {
    high: '등록 의사가 명확하고 거의 확정된 상태',
    medium: '긍정적이나 아직 고민 중인 상태',
    low: '관심은 있으나 등록 확신이 없는 상태',
  },
  decision_maker: {
    parent: '학부모가 최종 결정권을 가짐',
    student: '학생 본인이 결정에 큰 영향력 있음',
    both: '학부모와 학생이 함께 결정함',
  },
  sentiment: {
    very_positive: '매우 호감, 신뢰감 표현, 적극적 관심',
    positive: '긍정적 반응, 좋은 인상',
    neutral: '특별한 감정 표현 없이 정보 수집 위주',
    negative: '불만족, 의심, 부정적 반응',
  },
} as const

// AI 분석 대상 상담 유형 (퍼널 관련 상담만)
export const AI_ANALYZABLE_TYPES = [
  '신규상담',
  '입테유도',
  '입테후상담',
  '등록유도',
] as const

// 분석 대상인지 확인
export function isAnalyzableConsultationType(type: string): boolean {
  return AI_ANALYZABLE_TYPES.includes(type as typeof AI_ANALYZABLE_TYPES[number])
}

// 태그 색상
export const AI_TAG_COLORS = {
  hurdle: {
    schedule_conflict: 'bg-orange-100 text-orange-700',
    competitor_comparison: 'bg-purple-100 text-purple-700',
    student_refusal: 'bg-red-100 text-red-700',
    distance: 'bg-blue-100 text-blue-700',
    timing_defer: 'bg-amber-100 text-amber-700',
    price: 'bg-pink-100 text-pink-700',
    none: 'bg-gray-100 text-gray-700',
  },
  readiness: {
    high: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-red-100 text-red-700',
  },
  decision_maker: {
    parent: 'bg-indigo-100 text-indigo-700',
    student: 'bg-cyan-100 text-cyan-700',
    both: 'bg-teal-100 text-teal-700',
  },
  sentiment: {
    very_positive: 'bg-emerald-100 text-emerald-700',
    positive: 'bg-green-100 text-green-700',
    neutral: 'bg-gray-100 text-gray-700',
    negative: 'bg-red-100 text-red-700',
  },
} as const

/**
 * 상담 내용을 AI로 분석하여 태그 생성 (비동기 - fire and forget)
 * @param consultationId 상담 ID
 * @param content 상담 내용
 * @param consultationType 상담 유형
 * @param studentName 학생 이름
 */
export async function analyzeConsultation(
  consultationId: string,
  content: string,
  consultationType?: string,
  studentName?: string
): Promise<void> {
  // 내용이 없거나 너무 짧으면 스킵
  if (!content || content.trim().length < 10) {
    console.log('[AI] 상담 내용이 짧아 분석 건너뜀')
    return
  }

  try {
    // Next.js API Route 호출
    const response = await fetch('/api/consultations/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        consultationId,
        content,
        consultationType,
        studentName,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[AI] 상담 분석 실패:', error)
      return
    }

    const result = await response.json()
    console.log('[AI] 상담 분석 완료:', result)
  } catch (error) {
    // 분석 실패해도 상담 저장은 완료되어야 함 (fire and forget)
    console.error('[AI] 상담 분석 중 오류:', error)
  }
}

/**
 * 기존 상담들을 일괄 분석 (관리자용)
 * @param limit 최대 분석 건수
 */
export async function analyzeExistingConsultations(limit: number = 50): Promise<{
  analyzed: number
  skipped: number
  failed: number
}> {
  const supabase = createClient()

  // 아직 분석되지 않은 상담 조회
  const { data: consultations, error } = await supabase
    .from('consultations')
    .select('id, content')
    .is('ai_analyzed_at', null)
    .not('content', 'is', null)
    .limit(limit)

  if (error || !consultations) {
    console.error('[AI] 상담 목록 조회 실패:', error)
    return { analyzed: 0, skipped: 0, failed: 0 }
  }

  let analyzed = 0
  let skipped = 0
  let failed = 0

  for (const consultation of consultations) {
    if (!consultation.content || consultation.content.trim().length < 10) {
      skipped++
      continue
    }

    try {
      await analyzeConsultation(consultation.id, consultation.content)
      analyzed++
      // Rate limiting - 1초 대기
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch {
      failed++
    }
  }

  return { analyzed, skipped, failed }
}
