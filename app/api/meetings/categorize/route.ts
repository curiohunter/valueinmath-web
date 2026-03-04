/**
 * AI 회의 안건 분류 API
 * POST /api/meetings/categorize
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/auth/server'
import { generateText, getModelPricing } from '@/lib/llm-client'
import { checkRateLimit, recordUsage } from '@/lib/ai-rate-limiter'

const CATEGORIZE_PROMPT = `당신은 학원 회의를 분석하는 전문가입니다. 다음 기준으로 분류하세요:

1. 논의내용 (discussion):
   - 학생별 학습 상황 보고
   - 학부모 상담 내용
   - 수업 진행 상황
   - 교재 및 커리큘럼 논의

2. 결정사항 (decision):
   - 학생 조치 사항 (페널티, 보상 등)
   - 수업 방식 변경
   - 학부모 통보 사항
   - 인사 및 운영 결정

3. 재논의 (follow_up):
   - 추후 학생 모니터링 필요 사항
   - 미결정 학부모 상담 건
   - 보류된 커리큘럼 변경
   - 추가 검토 필요 운영 사항

회의 요약:
{recap}

JSON으로만 응답하세요 (다른 텍스트 없이):
{"discussion":["항목1","항목2"],"decision":["항목1"],"follow_up":["항목1"]}
각 항목은 한 문장으로 간결하게 작성하세요.`

export async function POST(request: NextRequest) {
  try {
    // 1. 인증 확인
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    // 2. 직원 확인
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id, name')
      .eq('auth_id', user.id)
      .eq('status', '재직')
      .single()

    if (employeeError || !employee) {
      return NextResponse.json(
        { success: false, error: '직원만 사용할 수 있는 기능입니다.' },
        { status: 403 }
      )
    }

    // 3. Rate Limit 확인
    const rateLimitResult = await checkRateLimit(supabase, employee.id)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: rateLimitResult.reason || '요청 횟수가 초과되었습니다.' },
        { status: 429 }
      )
    }

    // 4. 요청 파싱
    const { meeting_id, recap } = await request.json()

    if (!meeting_id || !recap) {
      return NextResponse.json(
        { success: false, error: 'meeting_id와 recap이 필요합니다.' },
        { status: 400 }
      )
    }

    // 5. AI 분류 호출
    const prompt = CATEGORIZE_PROMPT.replace('{recap}', recap)
    const result = await generateText({
      prompt,
      maxTokens: 2000,
      temperature: 0.3,
    })

    // 6. JSON 파싱
    let categorized
    try {
      // JSON 블록 추출 (마크다운 코드블록 대응)
      const jsonMatch = result.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('JSON not found in response')
      categorized = JSON.parse(jsonMatch[0])
    } catch {
      console.error('[Meeting Categorize] Failed to parse:', result.text)
      return NextResponse.json(
        { success: false, error: 'AI 응답을 파싱할 수 없습니다. 다시 시도해주세요.' },
        { status: 500 }
      )
    }

    // 7. 응답 검증
    const data = {
      discussion: Array.isArray(categorized.discussion) ? categorized.discussion : [],
      decision: Array.isArray(categorized.decision) ? categorized.decision : [],
      follow_up: Array.isArray(categorized.follow_up) ? categorized.follow_up : [],
    }

    // 8. Rate Limit 사용량 기록
    await recordUsage(supabase, {
      userId: employee.id,
      costUsd: result.cost,
    })

    console.log('[Meeting Categorize] Success:', {
      meetingId: meeting_id,
      model: result.model,
      items: data.discussion.length + data.decision.length + data.follow_up.length,
      cost: result.cost,
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[Meeting Categorize] Error:', error)
    return NextResponse.json(
      { success: false, error: 'AI 분류 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
