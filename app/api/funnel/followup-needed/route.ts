import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/auth/server'

// AI 분석 기반 스마트 권장 액션 생성
function getSmartRecommendation(student: {
  ai_hurdle: string | null
  ai_readiness: string | null
  ai_decision_maker: string | null
  ai_sentiment: string | null
  days_since_last_contact: number | null
}): {
  action: string
  reason: string
  contact: string
  priority: 'urgent' | 'high' | 'medium' | 'low'
} {
  const { ai_hurdle, ai_readiness, ai_decision_maker, ai_sentiment, days_since_last_contact } = student

  // 우선순위 결정
  let priority: 'urgent' | 'high' | 'medium' | 'low' = 'medium'
  if (days_since_last_contact && days_since_last_contact > 30) {
    priority = 'urgent'
  } else if (days_since_last_contact && days_since_last_contact > 14) {
    priority = 'high'
  } else if (ai_readiness === 'high') {
    priority = 'high'
  }

  // 연락 대상 결정
  let contact = '학부모'
  if (ai_decision_maker === 'student') {
    contact = '학생'
  } else if (ai_decision_maker === 'both') {
    contact = '학부모+학생'
  }

  // AI 분석이 없는 경우 기본 권장
  if (!ai_hurdle && !ai_readiness) {
    return { action: '📞 일반 팔로업', reason: '상담 후 후속 연락 필요', contact, priority }
  }

  // 준비도 높음 + 긍정적 → 즉시 등록 유도
  if (ai_readiness === 'high' && ai_sentiment !== 'negative') {
    return { action: '📞 등록 확정 전화', reason: '준비도 높고 긍정적', contact, priority: 'urgent' }
  }

  // 장애요인별 맞춤 권장
  switch (ai_hurdle) {
    case 'price':
      return { action: '💰 할인/분할납부 안내', reason: '비용이 장애요인', contact: '학부모', priority }
    case 'schedule_conflict':
      return { action: '📅 대안 시간표 제시', reason: '일정 충돌이 문제', contact, priority }
    case 'competitor_comparison':
      return { action: '🏢 체험수업 초대', reason: '타학원과 비교 중', contact, priority }
    case 'student_refusal':
      return { action: '👨‍🎓 학생 직접 상담', reason: '학생 본인이 거부감 있음', contact: '학생', priority }
    case 'distance':
      return { action: '🚗 셔틀/온라인 옵션 안내', reason: '거리가 장애요인', contact: '학부모', priority }
    case 'timing_defer':
      return { action: '📆 예약 등록 제안', reason: '시기를 미루려 함', contact, priority: 'low' }
    default:
      if (ai_readiness === 'medium') {
        return { action: '📞 관심 유지 통화', reason: '아직 고민 중', contact, priority }
      }
      return { action: '💬 정보 제공 문자', reason: '관심은 있으나 확신 부족', contact, priority: 'low' }
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const stage = searchParams.get('stage') || null

    // RPC 함수 호출
    const { data, error } = await supabase.rpc('get_followup_needed_students', {
      p_stage: stage
    })

    if (error) {
      console.error('Failed to get followup students:', error)
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
    }

    // 스마트 권장 액션 추가
    const students = (data || []).map((student: any) => {
      const recommendation = getSmartRecommendation({
        ai_hurdle: student.ai_hurdle,
        ai_readiness: student.ai_readiness,
        ai_decision_maker: student.ai_decision_maker,
        ai_sentiment: student.ai_sentiment,
        days_since_last_contact: student.days_since_last_contact
      })

      return {
        ...student,
        recommended_action: recommendation.action,
        recommended_reason: recommendation.reason,
        recommended_contact: recommendation.contact,
        action_priority: recommendation.priority
      }
    })

    // 우선순위별 카운트
    const summary = {
      urgent: students.filter((s: any) => s.action_priority === 'urgent').length,
      high: students.filter((s: any) => s.action_priority === 'high').length,
      medium: students.filter((s: any) => s.action_priority === 'medium').length,
      low: students.filter((s: any) => s.action_priority === 'low').length
    }

    return NextResponse.json({
      success: true,
      total: students.length,
      students,
      summary
    })

  } catch (error) {
    console.error('Followup needed API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
