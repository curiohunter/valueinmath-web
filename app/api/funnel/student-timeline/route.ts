import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/auth/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')

    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 })
    }

    // 상담 내역 가져오기
    const { data: consultations, error: consultationsError } = await supabase
      .from('consultations')
      .select(`
        id,
        date,
        type,
        method,
        content,
        status,
        next_action,
        next_date,
        counselor_id,
        ai_hurdle,
        ai_readiness,
        ai_decision_maker,
        ai_sentiment,
        ai_analyzed_at,
        employees:counselor_id (name)
      `)
      .eq('student_id', studentId)
      .order('date', { ascending: false })

    if (consultationsError) {
      console.error('Failed to get consultations:', consultationsError)
      return NextResponse.json({ error: 'Failed to fetch consultations' }, { status: 500 })
    }

    // 입학테스트 내역 가져오기 (student_id로 조회)
    let entranceTests: any[] = []
    const { data: tests, error: testsError } = await supabase
      .from('entrance_tests')
      .select(`
        id,
        student_id,
        test_date,
        test1_level,
        test2_level,
        test1_score,
        test2_score,
        test_result,
        status,
        recommended_class,
        notes
      `)
      .eq('student_id', studentId)
      .order('test_date', { ascending: false })

    if (testsError) {
      console.error('Failed to get entrance tests:', testsError)
    } else {
      entranceTests = tests || []
    }

    // 타임라인 데이터 구성
    const timeline: any[] = []

    // 상담 내역 추가
    consultations?.forEach(c => {
      timeline.push({
        type: 'consultation',
        date: c.date,
        data: {
          id: c.id,
          consultationType: c.type,
          method: c.method,
          content: c.content,
          status: c.status,
          nextAction: c.next_action,
          nextDate: c.next_date,
          counselorName: (c.employees as any)?.name || '알 수 없음',
          aiHurdle: c.ai_hurdle,
          aiReadiness: c.ai_readiness,
          aiDecisionMaker: c.ai_decision_maker,
          aiSentiment: c.ai_sentiment,
          aiAnalyzed: !!c.ai_analyzed_at
        }
      })
    })

    // 입학테스트 내역 추가
    entranceTests.forEach(t => {
      timeline.push({
        type: 'entrance_test',
        date: t.test_date,
        data: {
          id: t.id,
          studentId: t.student_id,
          test1Level: t.test1_level,
          test2Level: t.test2_level,
          test1Score: t.test1_score,
          test2Score: t.test2_score,
          testResult: t.test_result,
          status: t.status,
          recommendedClass: t.recommended_class,
          notes: t.notes
        }
      })
    })

    // 날짜순 정렬 (최신순)
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json({
      success: true,
      studentId,
      timeline,
      summary: {
        totalConsultations: consultations?.length || 0,
        totalTests: entranceTests.length
      }
    })

  } catch (error) {
    console.error('Student timeline API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
