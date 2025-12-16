/**
 * AI 제안 생성 API
 * POST /api/funnel/ai-suggestion
 *
 * 학생 컨텍스트를 기반으로 최적의 팔로업 전략을 AI가 제안
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/auth/server'
import { generateText } from '@/lib/llm-client'
import { checkRateLimit, recordUsage } from '@/lib/ai-rate-limiter'

interface AISuggestionRequest {
  studentId: string
  context: {
    name: string
    funnelStage: string | null
    daysSinceLastContact: number | null
    aiHurdle: string | null
    aiReadiness: string | null
    aiDecisionMaker: string | null
    aiSentiment: string | null
    lastConsultationType: string
    totalConsultations: number
  }
}

interface AISuggestion {
  recommendedChannel: 'phone' | 'text' | 'kakao' | 'visit'
  recommendedTiming: string
  keyMessage: string
  script: string
  confidence: number
  reasoning: string
}

// 장애요인 한글 라벨
const HURDLE_LABELS: Record<string, string> = {
  'price': '비용 문제',
  'schedule_conflict': '시간 충돌',
  'competitor_comparison': '타학원 비교',
  'student_refusal': '학생 거부',
  'distance': '거리/위치',
  'timing_defer': '시기 보류',
  'undecided': '미결정',
  'other': '기타',
}

// 준비도 한글 라벨
const READINESS_LABELS: Record<string, string> = {
  'high': '높음',
  'medium': '보통',
  'low': '낮음',
}

// 의사결정자 한글 라벨
const DECISION_MAKER_LABELS: Record<string, string> = {
  'parent': '학부모',
  'student': '학생',
  'both': '함께 결정',
}

// 분위기 한글 라벨
const SENTIMENT_LABELS: Record<string, string> = {
  'very_positive': '매우 긍정적',
  'positive': '긍정적',
  'neutral': '중립',
  'negative': '부정적',
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 직원 정보 먼저 조회 (rate limit 체크에 필요)
    const { data: employee } = await supabase
      .from('employees')
      .select('id, name')
      .eq('auth_id', user.id)
      .single()

    if (!employee) {
      return NextResponse.json({ error: '직원 정보를 찾을 수 없습니다' }, { status: 403 })
    }

    // Rate limit 체크
    const rateLimitResult = await checkRateLimit(supabase, employee.id)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: rateLimitResult.reason || 'AI 요청 제한 초과',
          remaining: rateLimitResult.remaining,
          resetAt: rateLimitResult.resetAt,
        },
        { status: 429 }
      )
    }

    const body: AISuggestionRequest = await request.json()
    const { studentId, context } = body

    if (!studentId || !context) {
      return NextResponse.json(
        { error: 'studentId and context are required' },
        { status: 400 }
      )
    }

    // 컨텍스트 변환
    const hurdleLabel = context.aiHurdle
      ? HURDLE_LABELS[context.aiHurdle] || context.aiHurdle
      : '없음'
    const readinessLabel = context.aiReadiness
      ? READINESS_LABELS[context.aiReadiness] || context.aiReadiness
      : '알 수 없음'
    const decisionMakerLabel = context.aiDecisionMaker
      ? DECISION_MAKER_LABELS[context.aiDecisionMaker] || context.aiDecisionMaker
      : '알 수 없음'
    const sentimentLabel = context.aiSentiment
      ? SENTIMENT_LABELS[context.aiSentiment] || context.aiSentiment
      : '알 수 없음'

    // 프롬프트 구성
    const prompt = `당신은 학원 상담사 어시스턴트입니다. 학생/학부모 팔로업 전략을 제안해주세요.

## 학생 정보
- 이름: ${context.name}
- 현재 퍼널 단계: ${context.funnelStage || '미분류'}
- 마지막 연락 후 경과일: ${context.daysSinceLastContact ?? '알 수 없음'}일
- 총 상담 횟수: ${context.totalConsultations}회

## AI 분석 결과 (이전 상담 기반)
- 주요 장애요인: ${hurdleLabel}
- 등록 준비도: ${readinessLabel}
- 의사결정자: ${decisionMakerLabel}
- 상담 분위기: ${sentimentLabel}

## 지시사항
위 정보를 바탕으로 다음 팔로업 전략을 JSON 형식으로 제안해주세요:

1. recommendedChannel: 연락 채널 ("phone" | "text" | "kakao" | "visit")
   - 준비도 높고 긍정적이면 "phone"
   - 정보 전달 목적이면 "text"
   - 학생 거부 시 "kakao" 또는 "visit"

2. recommendedTiming: 연락 시점 ("오늘 중" | "3일 내" | "이번 주 내" | "다음 주")
   - 30일 이상 경과 시 "오늘 중"
   - 준비도 높으면 빠르게

3. keyMessage: 핵심 메시지 (1-2문장, 자연스러운 한국어)
   - 장애요인에 맞춤
   - 긍정적/친근한 톤

4. script: 전화/문자 스크립트 (3-5문장)
   - 자연스러운 대화체
   - 구체적인 안내 포함

5. confidence: 신뢰도 (0-100 정수)
   - AI 분석 데이터가 있으면 높게
   - 정보가 부족하면 낮게

6. reasoning: 이 전략을 추천하는 이유 (1-2문장)

## 출력 형식 (JSON만 출력)
\`\`\`json
{
  "recommendedChannel": "phone",
  "recommendedTiming": "오늘 중",
  "keyMessage": "...",
  "script": "...",
  "confidence": 85,
  "reasoning": "..."
}
\`\`\`

JSON 외의 다른 텍스트는 출력하지 마세요.`

    // LLM 호출
    const result = await generateText({
      prompt,
      maxTokens: 800,
      temperature: 0.7,
    })

    // JSON 파싱
    let suggestion: AISuggestion
    try {
      // JSON 블록 추출
      const jsonMatch = result.text.match(/```json\s*([\s\S]*?)\s*```/) ||
        result.text.match(/\{[\s\S]*\}/)
      const jsonStr = jsonMatch
        ? (jsonMatch[1] || jsonMatch[0])
        : result.text

      const parsed = JSON.parse(jsonStr)

      suggestion = {
        recommendedChannel: parsed.recommendedChannel || 'phone',
        recommendedTiming: parsed.recommendedTiming || '3일 내',
        keyMessage: parsed.keyMessage || '안녕하세요, 학원 관련 문의드립니다.',
        script: parsed.script || '안녕하세요. 지난 상담 이후 궁금한 점이 있으실까 해서 연락드렸습니다.',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 70,
        reasoning: parsed.reasoning || 'AI 분석 기반 제안',
      }
    } catch (parseError) {
      console.error('[AI Suggestion] JSON parsing error:', parseError, 'Raw:', result.text)

      // 파싱 실패 시 기본값 반환
      suggestion = {
        recommendedChannel: 'phone',
        recommendedTiming: context.daysSinceLastContact && context.daysSinceLastContact > 30
          ? '오늘 중'
          : '3일 내',
        keyMessage: '상담 이후 궁금한 점이 있으실까 해서 연락드렸습니다.',
        script: '안녕하세요, [학원명]입니다. 지난 상담 이후 궁금한 점이나 추가로 확인하고 싶으신 부분이 있으실까 해서 연락드렸어요. 편하실 때 말씀해주시면 도움드리겠습니다.',
        confidence: 50,
        reasoning: 'AI 응답 파싱 실패로 기본 템플릿 제공',
      }
    }

    // AI 사용량 기록 (rate limiter 통합 - ai_rate_limits, ai_global_limits 테이블 업데이트)
    try {
      await recordUsage(supabase, {
        userId: employee.id,
        costUsd: result.cost || 0,
      })
    } catch (usageError) {
      console.error('[AI Suggestion] Failed to record usage:', usageError)
      // 사용량 기록 실패는 무시하고 계속 진행
    }

    // AI 사용 로그 기록 (ai_usage_logs 테이블 - 상세 로그용)
    try {
      // 학생 이름 조회
      const { data: studentData } = await supabase
        .from('students')
        .select('name')
        .eq('id', studentId)
        .single()

      await supabase.from('ai_usage_logs').insert({
        employee_id: employee.id,
        employee_name_snapshot: employee.name,
        feature: 'funnel_suggestion',
        target_type: 'student',
        target_id: studentId,
        target_name_snapshot: studentData?.name || context.name,
        provider: 'openai',
        model: result.model,
        tokens_input: result.tokensInput,
        tokens_output: result.tokensOutput,
        duration_ms: result.durationMs,
        estimated_cost_usd: result.cost,
        success: true,
        metadata: {
          funnelStage: context.funnelStage,
          daysSinceLastContact: context.daysSinceLastContact,
          recommendedChannel: suggestion.recommendedChannel,
          confidence: suggestion.confidence,
        },
      })
    } catch (logError) {
      console.error('[AI Suggestion] Failed to log usage:', logError)
      // 로깅 실패는 무시하고 계속 진행
    }

    return NextResponse.json({
      success: true,
      suggestion,
      cost: {
        tokensIn: result.tokensInput,
        tokensOut: result.tokensOutput,
        estimatedCostUsd: result.cost,
      },
    })
  } catch (error) {
    console.error('[AI Suggestion] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
