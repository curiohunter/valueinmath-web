import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/auth/server'
import OpenAI from 'openai'
import { getModelPricing, calculateCost, getLLMConfig } from '@/lib/llm-client'
import { isFunnelConsultationType, isChurnConsultationType } from '@/services/consultation-ai-service'
import { recordUsage } from '@/lib/ai-rate-limiter'

// 환경변수에서 모델 설정 가져오기 (gpt-4o-mini 기본값)
const getModel = () => getLLMConfig().model

// 퍼널용 허용 값
const ALLOWED_FUNNEL_HURDLES = ['schedule_conflict', 'competitor_comparison', 'student_refusal', 'distance', 'timing_defer', 'price', 'none'] as const
const ALLOWED_READINESS = ['high', 'medium', 'low'] as const
const ALLOWED_DECISION_MAKERS = ['parent', 'student', 'both'] as const

// 재원생용 허용 값
const ALLOWED_CHURN_HURDLES = ['emotional_distress', 'peer_relationship', 'curriculum_dissatisfaction', 'lack_of_attention', 'academic_stagnation', 'competitor_comparison', 'schedule_conflict', 'none'] as const
const ALLOWED_CHURN_RISKS = ['critical', 'high', 'medium', 'low', 'none'] as const

// 공통
const ALLOWED_SENTIMENTS = ['very_positive', 'positive', 'neutral', 'negative'] as const

type FunnelHurdleType = typeof ALLOWED_FUNNEL_HURDLES[number]
type ChurnHurdleType = typeof ALLOWED_CHURN_HURDLES[number]
type ReadinessType = typeof ALLOWED_READINESS[number]
type DecisionMakerType = typeof ALLOWED_DECISION_MAKERS[number]
type ChurnRiskType = typeof ALLOWED_CHURN_RISKS[number]
type SentimentType = typeof ALLOWED_SENTIMENTS[number]

// 퍼널 분석 결과
interface FunnelAnalysisResult {
  hurdle: FunnelHurdleType
  readiness: ReadinessType
  decision_maker: DecisionMakerType
  sentiment: SentimentType
}

// 재원생 이탈 분석 결과
interface ChurnAnalysisResult {
  hurdle: ChurnHurdleType
  churn_risk: ChurnRiskType
  sentiment: SentimentType
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let employeeId: string | null = null
  let employeeName: string | null = null

  try {
    // 인증 확인
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 직원 정보 조회 (로그용)
    const { data: employee } = await supabase
      .from('employees')
      .select('id, name')
      .eq('auth_id', user.id)
      .eq('status', '재직')
      .single()

    if (employee) {
      employeeId = employee.id
      employeeName = employee.name
    }

    const { consultationId, content, consultationType, studentName } = await request.json()

    if (!consultationId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // OpenAI 분석
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    // 상담 유형에 따라 다른 프롬프트 사용
    const isChurnType = isChurnConsultationType(consultationType || '')

    // 재원생용 프롬프트 (정기상담, 입학후상담, 퇴원상담)
    const churnSystemPrompt = `당신은 학원 재원생 상담 내용을 분석하여 이탈 위험을 판단하는 전문가입니다.
상담 내용을 읽고 다음 3가지 카테고리로 분류해주세요:

1. hurdle (우려사항): 학생/학부모가 느끼는 문제나 불만
   - emotional_distress: 우울, 불안, 스트레스, 힘들다, 지침 등 심리적 어려움
   - peer_relationship: 친구, 또래, 반 분위기, 위축, 관계 문제
   - curriculum_dissatisfaction: 진도 느림/빠름, 수업 방식 불만, 경쟁 원함
   - lack_of_attention: 선생님 관심 부족, 케어 부족, 다른 학생만 봐줌
   - academic_stagnation: 성적 안오름, 실력 정체, 점수가 안나옴
   - competitor_comparison: 타학원 비교, 옮기고 싶다, 다른 학원
   - schedule_conflict: 시간표 문제, 지각, 거리, 통학 어려움
   - none: 특별한 우려사항 없음 (정상적인 학습 상담)

2. churn_risk (이탈 위험도): 퇴원 가능성 판단
   - critical: 퇴원 의사 명확, 타학원 언급, 그만두겠다, 심각한 심리 문제
   - high: 강한 불만 표출, 문제 해결 요구, 이탈 가능성 높음
   - medium: 경미한 불만, 모니터링 필요
   - low: 양호, 특별한 이상 없음
   - none: 매우 만족, 긍정적 피드백

3. sentiment (상담 분위기): 전반적인 상담 분위기
   - very_positive: 매우 만족, 감사 표현
   - positive: 긍정적, 좋은 피드백
   - neutral: 중립적, 정보 교환 위주
   - negative: 불만족, 문제 제기, 부정적

반드시 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.
예시: {"hurdle": "none", "churn_risk": "low", "sentiment": "positive"}`

    // 퍼널용 프롬프트 (신규상담, 입테유도, 입테후상담, 등록유도)
    const funnelSystemPrompt = `당신은 학원 상담 내용을 분석하는 전문가입니다.
상담 내용을 읽고 다음 4가지 카테고리로 분류해주세요:

1. hurdle (장애요인): 등록/계속을 방해하는 요소
   - schedule_conflict: 시간표 충돌, 다른 학원과 겹침
   - competitor_comparison: 다른 학원과 비교 중
   - student_refusal: 학생 본인이 거부
   - distance: 거리가 멀어서 고민
   - timing_defer: 시기상조, 나중에 시작하겠다
   - price: 가격/비용 문제
   - none: 특별한 장애요인 없음

2. readiness (등록 준비도): 학부모/학생이 등록할 준비가 얼마나 되었는지
   - high: 거의 확정, 등록 의사 명확
   - medium: 긍정적이나 고민 중
   - low: 관심은 있으나 확신 없음

3. decision_maker (의사결정자): 최종 결정을 누가 내리는지
   - parent: 학부모가 결정
   - student: 학생이 결정권 있음
   - both: 함께 결정

4. sentiment (상담 분위기): 전반적인 상담 분위기
   - very_positive: 매우 긍정적, 호감
   - positive: 긍정적
   - neutral: 중립적
   - negative: 부정적, 불만족

반드시 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.
예시: {"hurdle": "none", "readiness": "high", "decision_maker": "parent", "sentiment": "positive"}`

    const systemPrompt = isChurnType ? churnSystemPrompt : funnelSystemPrompt

    const userPrompt = `상담 유형: ${consultationType || '일반상담'}
학생: ${studentName || '미상'}

상담 내용:
${content}

위 상담 내용을 분석해주세요.`

    const model = getModel()
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 200,
    })

    const durationMs = Date.now() - startTime
    const tokensInput = completion.usage?.prompt_tokens || 0
    const tokensOutput = completion.usage?.completion_tokens || 0
    const responseText = completion.choices[0]?.message?.content?.trim() || '{}'

    let parseSuccess = true
    let validatedAnalysis: Record<string, string>

    if (isChurnType) {
      // 재원생용 분석 결과 처리
      let analysis: ChurnAnalysisResult
      try {
        analysis = JSON.parse(responseText)
      } catch {
        console.error('Failed to parse AI response:', responseText)
        parseSuccess = false
        analysis = { hurdle: 'none', churn_risk: 'low', sentiment: 'neutral' }
      }

      // ENUM 값 검증
      validatedAnalysis = {
        hurdle: ALLOWED_CHURN_HURDLES.includes(analysis.hurdle as ChurnHurdleType) ? analysis.hurdle : 'none',
        churn_risk: ALLOWED_CHURN_RISKS.includes(analysis.churn_risk as ChurnRiskType) ? analysis.churn_risk : 'low',
        sentiment: ALLOWED_SENTIMENTS.includes(analysis.sentiment as SentimentType) ? analysis.sentiment : 'neutral',
      }
    } else {
      // 퍼널용 분석 결과 처리
      let analysis: FunnelAnalysisResult
      try {
        analysis = JSON.parse(responseText)
      } catch {
        console.error('Failed to parse AI response:', responseText)
        parseSuccess = false
        analysis = { hurdle: 'none', readiness: 'medium', decision_maker: 'parent', sentiment: 'neutral' }
      }

      // ENUM 값 검증
      validatedAnalysis = {
        hurdle: ALLOWED_FUNNEL_HURDLES.includes(analysis.hurdle as FunnelHurdleType) ? analysis.hurdle : 'none',
        readiness: ALLOWED_READINESS.includes(analysis.readiness as ReadinessType) ? analysis.readiness : 'medium',
        decision_maker: ALLOWED_DECISION_MAKERS.includes(analysis.decision_maker as DecisionMakerType) ? analysis.decision_maker : 'parent',
        sentiment: ALLOWED_SENTIMENTS.includes(analysis.sentiment as SentimentType) ? analysis.sentiment : 'neutral',
      }
    }

    // DB 업데이트 데이터 구성
    const updateData: Record<string, unknown> = {
      ai_hurdle: validatedAnalysis.hurdle,
      ai_sentiment: validatedAnalysis.sentiment,
      ai_analyzed_at: new Date().toISOString(),
    }

    if (isChurnType) {
      // 재원생용: churn_risk 추가
      updateData.ai_churn_risk = validatedAnalysis.churn_risk
    } else {
      // 퍼널용: readiness, decision_maker 추가
      updateData.ai_readiness = validatedAnalysis.readiness
      updateData.ai_decision_maker = validatedAnalysis.decision_maker
    }

    // DB 업데이트
    const { error: updateError } = await supabase
      .from('consultations')
      .update(updateData)
      .eq('id', consultationId)

    if (updateError) {
      console.error('Failed to update consultation:', updateError)
    }

    // AI 사용 로그 기록
    const pricing = getModelPricing(model)
    const cost = calculateCost(model, tokensInput, tokensOutput)

    await supabase.from('ai_usage_logs').insert({
      employee_id: employeeId,
      employee_name_snapshot: employeeName,
      feature: 'consultation_analysis',
      target_type: 'consultation',
      target_id: consultationId,
      target_name_snapshot: studentName,
      provider: 'openai',
      model,
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
      duration_ms: durationMs,
      price_input_per_million: pricing.input,
      price_output_per_million: pricing.output,
      estimated_cost_usd: cost,
      success: parseSuccess && !updateError,
      error_message: updateError ? 'DB update failed' : (!parseSuccess ? 'Parse failed' : null),
      metadata: {
        consultation_type: consultationType,
        analysis: validatedAnalysis,
      },
    }).then(({ error }) => {
      if (error) console.error('Failed to log AI usage:', error)
    })

    // Rate Limiter에 사용량 기록 (사용량 관리 페이지 연동)
    if (employeeId) {
      recordUsage(supabase, { userId: employeeId, costUsd: cost }).catch(console.error)
    }

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update consultation' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      analysis: validatedAnalysis,
      usage: { tokens: tokensInput + tokensOutput, cost },
    })

  } catch (error) {
    console.error('Consultation analysis error:', error)

    // 에러 로그 기록
    try {
      const supabase = await createServerClient()
      await supabase.from('ai_usage_logs').insert({
        employee_id: employeeId,
        employee_name_snapshot: employeeName,
        feature: 'consultation_analysis',
        provider: 'openai',
        model: getModel(),
        tokens_input: 0,
        tokens_output: 0,
        duration_ms: Date.now() - startTime,
        success: false,
        error_message: error instanceof Error ? error.message.substring(0, 200) : 'Unknown error',
      })
    } catch {
      // 로그 실패 무시
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
