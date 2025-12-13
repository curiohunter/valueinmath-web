import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/auth/server'
import OpenAI from 'openai'
import { getModelPricing, calculateCost, getLLMConfig } from '@/lib/llm-client'

// 환경변수에서 모델 설정 가져오기 (gpt-4o-mini 기본값)
const getModel = () => getLLMConfig().model
const ALLOWED_HURDLES = ['schedule_conflict', 'competitor_comparison', 'student_refusal', 'distance', 'timing_defer', 'price', 'none'] as const
const ALLOWED_READINESS = ['high', 'medium', 'low'] as const
const ALLOWED_DECISION_MAKERS = ['parent', 'student', 'both'] as const
const ALLOWED_SENTIMENTS = ['very_positive', 'positive', 'neutral', 'negative'] as const

type HurdleType = typeof ALLOWED_HURDLES[number]
type ReadinessType = typeof ALLOWED_READINESS[number]
type DecisionMakerType = typeof ALLOWED_DECISION_MAKERS[number]
type SentimentType = typeof ALLOWED_SENTIMENTS[number]

interface AnalysisResult {
  hurdle: HurdleType
  readiness: ReadinessType
  decision_maker: DecisionMakerType
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

    const systemPrompt = `당신은 학원 상담 내용을 분석하는 전문가입니다.
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

    let analysis: AnalysisResult
    let parseSuccess = true
    try {
      analysis = JSON.parse(responseText)
    } catch {
      console.error('Failed to parse AI response:', responseText)
      parseSuccess = false
      analysis = { hurdle: 'none', readiness: 'medium', decision_maker: 'parent', sentiment: 'neutral' }
    }

    // ENUM 값 검증
    const validatedAnalysis = {
      hurdle: ALLOWED_HURDLES.includes(analysis.hurdle as HurdleType) ? analysis.hurdle : 'none',
      readiness: ALLOWED_READINESS.includes(analysis.readiness as ReadinessType) ? analysis.readiness : 'medium',
      decision_maker: ALLOWED_DECISION_MAKERS.includes(analysis.decision_maker as DecisionMakerType) ? analysis.decision_maker : 'parent',
      sentiment: ALLOWED_SENTIMENTS.includes(analysis.sentiment as SentimentType) ? analysis.sentiment : 'neutral',
    }

    // DB 업데이트
    const { error: updateError } = await supabase
      .from('consultations')
      .update({
        ai_hurdle: validatedAnalysis.hurdle,
        ai_readiness: validatedAnalysis.readiness,
        ai_decision_maker: validatedAnalysis.decision_maker,
        ai_sentiment: validatedAnalysis.sentiment,
        ai_analyzed_at: new Date().toISOString(),
      })
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
