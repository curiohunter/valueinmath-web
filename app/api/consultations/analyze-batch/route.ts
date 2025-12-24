import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/auth/server'
import OpenAI from 'openai'
import { getModelPricing, calculateCost, getLLMConfig } from '@/lib/llm-client'
import { AI_CHURN_TYPES, isChurnConsultationType } from '@/services/consultation-ai-service'
import { recordUsage } from '@/lib/ai-rate-limiter'

// 환경변수에서 모델 설정 가져오기
const getModel = () => getLLMConfig().model

// 재원생용 허용 값
const ALLOWED_CHURN_HURDLES = ['emotional_distress', 'peer_relationship', 'curriculum_dissatisfaction', 'lack_of_attention', 'academic_stagnation', 'competitor_comparison', 'schedule_conflict', 'none'] as const
const ALLOWED_CHURN_RISKS = ['critical', 'high', 'medium', 'low', 'none'] as const
const ALLOWED_SENTIMENTS = ['very_positive', 'positive', 'neutral', 'negative'] as const

type ChurnHurdleType = typeof ALLOWED_CHURN_HURDLES[number]
type ChurnRiskType = typeof ALLOWED_CHURN_RISKS[number]
type SentimentType = typeof ALLOWED_SENTIMENTS[number]

interface ChurnAnalysisResult {
  hurdle: ChurnHurdleType
  churn_risk: ChurnRiskType
  sentiment: SentimentType
}

// 재원생용 프롬프트
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

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // 인증 확인
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 직원 확인 (관리자만 배치 분석 가능)
    const { data: employee } = await supabase
      .from('employees')
      .select('id, name, role')
      .eq('auth_id', user.id)
      .eq('status', '재직')
      .single()

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 403 })
    }

    const { limit = 50, consultationType } = await request.json()

    // 미분석 상담 조회 (재원생 상담만)
    let query = supabase
      .from('consultations')
      .select(`
        id,
        content,
        type,
        student:students!consultations_student_id_fkey(name)
      `)
      .is('ai_analyzed_at', null)
      .not('content', 'is', null)
      .in('type', AI_CHURN_TYPES as unknown as string[])
      .limit(limit)

    if (consultationType) {
      query = query.eq('type', consultationType)
    }

    const { data: consultations, error: fetchError } = await query

    if (fetchError) {
      console.error('Failed to fetch consultations:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch consultations' }, { status: 500 })
    }

    if (!consultations || consultations.length === 0) {
      return NextResponse.json({
        message: 'No unanalyzed consultations found',
        processed: 0,
        success: 0,
        failed: 0
      })
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    const model = getModel()
    let successCount = 0
    let failedCount = 0
    const results: Array<{ id: string; studentName: string; analysis: ChurnAnalysisResult | null; error?: string }> = []

    for (const consultation of consultations) {
      // 내용이 너무 짧으면 스킵
      if (!consultation.content || consultation.content.trim().length < 10) {
        results.push({
          id: consultation.id,
          studentName: (consultation.student as { name: string } | null)?.name || '미상',
          analysis: null,
          error: 'Content too short'
        })
        failedCount++
        continue
      }

      try {
        const studentName = (consultation.student as { name: string } | null)?.name || '미상'

        const userPrompt = `상담 유형: ${consultation.type}
학생: ${studentName}

상담 내용:
${consultation.content}

위 상담 내용을 분석해주세요.`

        const completion = await openai.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: churnSystemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3,
          max_tokens: 200,
        })

        const tokensInput = completion.usage?.prompt_tokens || 0
        const tokensOutput = completion.usage?.completion_tokens || 0
        const responseText = completion.choices[0]?.message?.content?.trim() || '{}'

        let analysis: ChurnAnalysisResult
        try {
          analysis = JSON.parse(responseText)
        } catch {
          console.error('Failed to parse AI response:', responseText)
          analysis = { hurdle: 'none', churn_risk: 'low', sentiment: 'neutral' }
        }

        // ENUM 값 검증
        const validatedAnalysis: ChurnAnalysisResult = {
          hurdle: ALLOWED_CHURN_HURDLES.includes(analysis.hurdle as ChurnHurdleType) ? analysis.hurdle : 'none',
          churn_risk: ALLOWED_CHURN_RISKS.includes(analysis.churn_risk as ChurnRiskType) ? analysis.churn_risk : 'low',
          sentiment: ALLOWED_SENTIMENTS.includes(analysis.sentiment as SentimentType) ? analysis.sentiment : 'neutral',
        }

        // DB 업데이트
        const { error: updateError } = await supabase
          .from('consultations')
          .update({
            ai_hurdle: validatedAnalysis.hurdle,
            ai_churn_risk: validatedAnalysis.churn_risk,
            ai_sentiment: validatedAnalysis.sentiment,
            ai_analyzed_at: new Date().toISOString(),
          })
          .eq('id', consultation.id)

        if (updateError) {
          console.error('Failed to update consultation:', updateError)
          results.push({ id: consultation.id, studentName, analysis: null, error: 'DB update failed' })
          failedCount++
        } else {
          results.push({ id: consultation.id, studentName, analysis: validatedAnalysis })
          successCount++
        }

        // AI 사용 로그 기록
        const pricing = getModelPricing(model)
        const cost = calculateCost(model, tokensInput, tokensOutput)

        await supabase.from('ai_usage_logs').insert({
          employee_id: employee.id,
          employee_name_snapshot: employee.name,
          feature: 'consultation_batch_analysis',
          target_type: 'consultation',
          target_id: consultation.id,
          target_name_snapshot: studentName,
          provider: 'openai',
          model,
          tokens_input: tokensInput,
          tokens_output: tokensOutput,
          duration_ms: 0,
          price_input_per_million: pricing.input,
          price_output_per_million: pricing.output,
          estimated_cost_usd: cost,
          success: !updateError,
          metadata: {
            batch: true,
            consultation_type: consultation.type,
            analysis: validatedAnalysis,
          },
        })

        // Rate Limiter에 사용량 기록
        await recordUsage(supabase, { userId: employee.id, costUsd: cost })

        // Rate limiting - API 호출 간 대기
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (error) {
        console.error('Analysis failed for consultation:', consultation.id, error)
        results.push({
          id: consultation.id,
          studentName: (consultation.student as { name: string } | null)?.name || '미상',
          analysis: null,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        failedCount++
      }
    }

    const durationMs = Date.now() - startTime

    return NextResponse.json({
      message: `Batch analysis completed`,
      processed: consultations.length,
      success: successCount,
      failed: failedCount,
      durationMs,
      results: results.slice(0, 20), // 처음 20개만 반환
    })

  } catch (error) {
    console.error('Batch analysis error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
