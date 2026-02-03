/**
 * AI 코멘트 생성 API
 * POST /api/ai/generate-comment
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/auth/server'
import { generateComment, regenerateSection, PROTOCOL_VERSION } from '@/services/ai-comment-service'
import { getStudentMetrics } from '@/lib/student-metrics'
import { getModelPricing } from '@/lib/llm-client'
import { checkRateLimit, recordUsage, RATE_LIMITS } from '@/lib/ai-rate-limiter'
import type { GenerateCommentRequest, SelectedPhrases, CommentTone, RegenerationType, StudentLearningData } from '@/types/comment-assistant'

// ============================================
// POST Handler
// ============================================

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

    // 2. 선생님(employee) 확인
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id, name')
      .eq('auth_id', user.id)
      .eq('status', '재직')
      .single()

    if (employeeError || !employee) {
      return NextResponse.json(
        { success: false, error: '선생님만 사용할 수 있는 기능입니다.' },
        { status: 403 }
      )
    }

    // 3. Rate Limit 확인 (DB 기반 - employees.id 사용)
    const rateLimitResult = await checkRateLimit(supabase, employee.id)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: rateLimitResult.reason || '요청 횟수가 초과되었습니다. 잠시 후 다시 시도해주세요.',
          remaining: rateLimitResult.remaining,
        },
        { status: 429 }
      )
    }

    // 4. 요청 파싱
    const body = await request.json()
    const {
      student_id,
      year,
      month,
      selected_phrases,
      learning_data,
      tone = 'balanced',
      regeneration_type = 'full',
      regeneration_count = 0,
    } = body as GenerateCommentRequest & { learning_data?: StudentLearningData }

    // 5. 필수 필드 검증
    if (!student_id || !year || !month || !selected_phrases) {
      return NextResponse.json(
        { success: false, error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      )
    }

    // 6. 재생성 횟수 제한 확인 (서버측 DB 검증)
    if (regeneration_type !== 'full') {
      const { data: existingLogs } = await supabase
        .from('comment_llm_logs')
        .select('regeneration_count')
        .eq('student_id', student_id)
        .eq('year', year)
        .eq('month', month)
        .eq('teacher_id', employee.id)
        .order('created_at', { ascending: false })
        .limit(1)

      const totalRegenCount = existingLogs?.[0]?.regeneration_count || 0
      if (totalRegenCount >= 2) {
        return NextResponse.json(
          { success: false, error: '재생성 횟수 초과 (최대 2회). 직접 수정을 권장합니다.' },
          { status: 429 }
        )
      }
    }

    // 7. 학생 정보 조회 (student_with_school_info view 사용)
    const { data: student, error: studentError } = await supabase
      .from('student_with_school_info')
      .select('id, name, grade, school')
      .eq('id', student_id)
      .single()

    if (studentError || !student) {
      return NextResponse.json(
        { success: false, error: '학생 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 8. 학생 반 정보 조회
    const { data: classStudent } = await supabase
      .from('class_students')
      .select('class_id, classes(name)')
      .eq('student_id', student_id)
      .eq('status', '재원')
      .limit(1)
      .single()

    const className = (classStudent?.classes as any)?.name || undefined

    // 9. 학습 데이터 (클라이언트에서 전달받음, 없으면 조회)
    let learningDataToUse = learning_data
    if (regeneration_type === 'full' && !learningDataToUse) {
      try {
        // 클라이언트에서 전달하지 않은 경우 서버에서 조회
        const metrics = await getStudentMetrics(student_id, year, month)
        // 기존 metrics를 learningData로 변환 (호환성)
        learningDataToUse = undefined // 이 경우 generateComment에서 metrics 사용
      } catch (metricsError) {
        console.warn('[AI Comment] Failed to fetch metrics:', metricsError)
        // 메트릭스 실패해도 생성 진행
      }
    }

    // 10. AI 생성
    let result
    const reason = regeneration_type === 'full' ? 'first_draft' :
                   regeneration_type === 'tone_adjust' ? 'tone_adjust' : 'section_regenerate'

    console.log('[AI Comment] Generating with:', {
      studentName: student.name,
      grade: student.grade,
      month,
      tone,
      hasLearningData: !!learningDataToUse,
      phrasesCount: Object.values(selected_phrases).flat().length,
    })

    if (regeneration_type === 'full' || regeneration_type === 'tone_adjust') {
      // full: 첫 생성, tone_adjust: 톤 변경 재생성
      result = await generateComment({
        studentName: student.name,
        grade: student.grade,
        school: student.school,
        className,
        month,
        selectedPhrases: selected_phrases,
        learningData: learningDataToUse,
        tone,
      })

      console.log('[AI Comment] Result:', {
        contentLength: result.content?.length || 0,
        tokensInput: result.tokensInput,
        tokensOutput: result.tokensOutput,
        model: result.model,
      })
    } else if (['greeting', 'body', 'plan'].includes(regeneration_type)) {
      // 부분 재생성 - 기존 내용 필요
      const originalContent = body.metrics?.toString() || '' // 임시: 실제로는 원본 내용 필요
      result = await regenerateSection(
        regeneration_type as 'greeting' | 'body' | 'plan',
        originalContent,
        {
          studentName: student.name,
          grade: student.grade,
          school: student.school,
          className,
          month,
          selectedPhrases: selected_phrases,
          tone,
        }
      )
    } else {
      return NextResponse.json(
        { success: false, error: '잘못된 재생성 타입입니다.' },
        { status: 400 }
      )
    }

    // 11. LLM 로그 저장
    const pricing = getModelPricing(result.model)
    const logData = {
      student_id,
      teacher_id: employee.id,
      year,
      month,
      provider: 'openai',
      model: result.model,
      tokens_input: result.tokensInput,
      tokens_output: result.tokensOutput,
      duration_ms: result.durationMs,
      price_input_per_million: pricing.input,
      price_output_per_million: pricing.output,
      estimated_cost_usd: result.cost,
      success: true,
      protocol_version: PROTOCOL_VERSION,
      prompt_hash: result.promptHash,
      reason,
      regeneration_count: regeneration_type === 'full' ? 0 : regeneration_count + 1,
      generated_content: result.content,
    }

    const { error: logError } = await supabase
      .from('comment_llm_logs')
      .insert(logData)

    if (logError) {
      console.error('[AI Comment] Failed to insert log:', logError)
      // 로그 실패해도 응답은 반환
    }

    // 12. Rate Limit 사용량 기록 (DB 기반 - employees.id 사용)
    await recordUsage(supabase, {
      userId: employee.id,
      costUsd: result.cost,
    })

    // 13. 응답
    return NextResponse.json({
      success: true,
      data: {
        generated_content: result.content,
        tokens_used: result.tokensInput + result.tokensOutput,
        protocol_version: PROTOCOL_VERSION,
        prompt_hash: result.promptHash,
      },
    })
  } catch (error) {
    console.error('[AI Comment] Error:', error)

    // 에러 로그 저장 시도
    try {
      const supabase = await createServerClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: employee } = await supabase
          .from('employees')
          .select('id')
          .eq('auth_id', user.id)
          .single()

        if (employee) {
          await supabase.from('comment_llm_logs').insert({
            student_id: '00000000-0000-0000-0000-000000000000', // placeholder
            teacher_id: employee.id,
            year: new Date().getFullYear(),
            month: new Date().getMonth() + 1,
            provider: 'openai',
            model: 'unknown',
            tokens_input: 0,
            tokens_output: 0,
            price_input_per_million: 0,
            price_output_per_million: 0,
            estimated_cost_usd: 0,
            success: false,
            error_code: error instanceof Error ? error.message.substring(0, 100) : 'UNKNOWN',
            reason: 'first_draft',
            regeneration_count: 0,
          })
        }
      }
    } catch {
      // 에러 로그 저장 실패 무시
    }

    return NextResponse.json(
      { success: false, error: 'AI 코멘트 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
