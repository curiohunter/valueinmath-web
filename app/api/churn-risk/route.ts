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

    const currentMonth = new Date().getMonth() + 1 // 1-12

    // 재원 학생 + 최근 상담 AI 분석 결과 조회
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select(`
        id,
        name,
        grade,
        school_type,
        status,
        start_date
      `)
      .eq('status', '재원')
      .order('name')

    if (studentsError) {
      console.error('Failed to fetch students:', studentsError)
      return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 })
    }

    // 각 학생의 최근 AI 분석 상담 조회
    const { data: consultations, error: consultError } = await supabase
      .from('consultations')
      .select(`
        student_id,
        type,
        ai_churn_risk,
        ai_hurdle,
        ai_sentiment,
        ai_analyzed_at,
        date,
        content
      `)
      .in('type', ['정기상담', '입학후상담', '퇴원상담'])
      .not('ai_analyzed_at', 'is', null)
      .order('ai_analyzed_at', { ascending: false })

    if (consultError) {
      console.error('Failed to fetch consultations:', consultError)
    }

    // 학생별 최근 상담 매핑
    const studentConsultations = new Map<string, typeof consultations[0]>()
    consultations?.forEach(c => {
      if (!studentConsultations.has(c.student_id)) {
        studentConsultations.set(c.student_id, c)
      }
    })

    // 위험도 계산 및 데이터 구성
    const riskData = students?.map(student => {
      const consultation = studentConsultations.get(student.id)
      const riskScore = calculateChurnRiskScore(student, consultation, currentMonth)

      return {
        id: student.id,
        name: student.name,
        grade: student.grade,
        school_type: student.school_type,
        start_date: student.start_date,
        tenure_months: calculateTenureMonths(student.start_date),
        // AI 분석 결과
        ai_churn_risk: consultation?.ai_churn_risk || null,
        ai_hurdle: consultation?.ai_hurdle || null,
        ai_sentiment: consultation?.ai_sentiment || null,
        last_consultation_date: consultation?.date || null,
        last_analyzed_at: consultation?.ai_analyzed_at || null,
        // 계산된 위험 점수
        risk_score: riskScore.score,
        risk_level: riskScore.level,
        risk_factors: riskScore.factors,
      }
    }) || []

    // 통계 계산
    const stats = {
      total: riskData.length,
      critical: riskData.filter(r => r.risk_level === 'critical').length,
      high: riskData.filter(r => r.risk_level === 'high').length,
      medium: riskData.filter(r => r.risk_level === 'medium').length,
      low: riskData.filter(r => r.risk_level === 'low').length,
      // AI 분석 통계
      analyzed: riskData.filter(r => r.ai_churn_risk !== null).length,
      not_analyzed: riskData.filter(r => r.ai_churn_risk === null).length,
    }

    // AI hurdle 분포
    const hurdleDistribution: Record<string, number> = {}
    riskData.forEach(r => {
      if (r.ai_hurdle) {
        hurdleDistribution[r.ai_hurdle] = (hurdleDistribution[r.ai_hurdle] || 0) + 1
      }
    })

    return NextResponse.json({
      students: riskData,
      stats,
      hurdleDistribution,
      currentMonth,
    })
  } catch (error) {
    console.error('Churn risk API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// 재원 기간 계산 (월)
function calculateTenureMonths(startDate: string | null): number {
  if (!startDate) return 0
  const start = new Date(startDate)
  const now = new Date()
  const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
  return Math.max(0, months)
}

// 학년 문자열 변환 (grade + school_type → "초6", "중1" 등)
function getGradeString(grade: number | null, schoolType: string | null): string {
  if (!grade || !schoolType) return ''
  const prefix = schoolType === '초등학교' ? '초' : schoolType === '중학교' ? '중' : '고'
  return `${prefix}${grade}`
}

// 이탈 위험 점수 계산 (AntiGravity + 우리 분석 기반)
function calculateChurnRiskScore(
  student: { grade: number | null; school_type: string | null; start_date: string | null },
  consultation: { ai_churn_risk: string | null; ai_hurdle: string | null } | undefined,
  currentMonth: number
): { score: number; level: 'critical' | 'high' | 'medium' | 'low'; factors: string[] } {
  let score = 0
  const factors: string[] = []

  const gradeStr = getGradeString(student.grade, student.school_type)
  const tenureMonths = calculateTenureMonths(student.start_date)
  const isWinterSeason = currentMonth >= 11 || currentMonth <= 2

  // 1. AI 상담 분석 결과 (최대 50점) - 가장 중요
  if (consultation?.ai_churn_risk === 'critical') {
    score += 50
    factors.push('AI분석: 매우 위험')
  } else if (consultation?.ai_churn_risk === 'high') {
    score += 35
    factors.push('AI분석: 위험')
  } else if (consultation?.ai_churn_risk === 'medium') {
    score += 20
    factors.push('AI분석: 주의')
  }

  // 2. 시즌 + 학년 리스크 (최대 25점) - AntiGravity 기반
  if (gradeStr === '초6' && isWinterSeason) {
    score += 25
    factors.push('초6 겨울: 학원 쇼핑 시즌')
  } else if (gradeStr === '중1' && isWinterSeason) {
    score += 20
    factors.push('중1 겨울: 전환기 위험')
  } else if (gradeStr === '초6') {
    score += 10
    factors.push('초6: 예비중1 주의')
  } else if (gradeStr === '중3' && isWinterSeason) {
    score += 15
    factors.push('중3 겨울: 고등 전환기')
  }

  // 3. 우려사항 유형 (최대 15점)
  const hurdle = consultation?.ai_hurdle
  if (hurdle === 'emotional_distress') {
    score += 15
    factors.push('심리/정서 문제')
  } else if (hurdle === 'competitor_comparison') {
    score += 15
    factors.push('타학원 비교')
  } else if (hurdle === 'peer_relationship') {
    score += 12
    factors.push('또래/관계 문제')
  } else if (hurdle === 'curriculum_dissatisfaction') {
    score += 10
    factors.push('커리큘럼 불만')
  } else if (hurdle === 'academic_stagnation') {
    score += 8
    factors.push('성적 정체')
  }

  // 4. 재원 기간 (최대 10점) - 3-6개월 고위험
  if (tenureMonths >= 3 && tenureMonths <= 6) {
    score += 10
    factors.push(`재원 ${tenureMonths}개월: 위험 구간`)
  } else if (tenureMonths < 3) {
    score += 5
    factors.push(`신규생 (${tenureMonths}개월)`)
  }

  // 5. 고3 11월 이후 제외 (자연 졸업)
  if (gradeStr === '고3' && currentMonth >= 11) {
    return { score: 0, level: 'low', factors: ['고3 자연 졸업'] }
  }

  // 위험 레벨 판정
  let level: 'critical' | 'high' | 'medium' | 'low'
  if (score >= 60) level = 'critical'
  else if (score >= 40) level = 'high'
  else if (score >= 20) level = 'medium'
  else level = 'low'

  return { score: Math.min(score, 100), level, factors }
}
