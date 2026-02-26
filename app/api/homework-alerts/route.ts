import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/auth/server'

export async function GET() {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 직원 확인
    const { data: employee } = await supabase
      .from('employees')
      .select('id')
      .eq('auth_id', user.id)
      .eq('status', '재직')
      .single()

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 403 })
    }

    // 집계 테이블에서 alert 대상만 조회
    const { data: summaries, error: summaryError } = await supabase
      .from('homework_completion_summary')
      .select('*')
      .neq('alert_level', 'none')
      .order('avg_completion_rate', { ascending: true })

    if (summaryError) {
      console.error('Failed to fetch homework summaries:', summaryError)
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
    }

    // student_id 목록으로 학년/학교 정보 조회
    const studentIds = (summaries || []).map(s => s.student_id)

    let schoolInfoMap = new Map<string, { grade: number | null; school_type: string | null }>()

    if (studentIds.length > 0) {
      const { data: schoolInfo } = await supabase
        .from('student_with_school_info')
        .select('id, grade, school_type')
        .in('id', studentIds)

      schoolInfo?.forEach(s => {
        schoolInfoMap.set(s.id, { grade: s.grade, school_type: s.school_type })
      })
    }

    // 응답 구성
    const students = (summaries || []).map(s => {
      const info = schoolInfoMap.get(s.student_id)
      return {
        id: s.student_id,
        mathflat_student_id: s.mathflat_student_id,
        name: s.student_name,
        grade: info?.grade ?? null,
        school_type: info?.school_type ?? null,
        class_name: s.class_name,
        class_id: s.class_id,
        avg_completion_rate: s.avg_completion_rate,
        total_homework_count: s.total_homework_count,
        completed_homework_count: s.completed_homework_count,
        zero_completion_count: s.zero_completion_count,
        alert_level: s.alert_level as 'critical' | 'warning',
      }
    })

    const stats = {
      total: students.length,
      critical: students.filter(s => s.alert_level === 'critical').length,
      warning: students.filter(s => s.alert_level === 'warning').length,
    }

    // last_calculated_at 가져오기
    const lastCalculatedAt = summaries?.[0]?.last_calculated_at ?? null

    return NextResponse.json({
      students,
      stats,
      last_calculated_at: lastCalculatedAt,
    })
  } catch (error) {
    console.error('Homework alerts API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
