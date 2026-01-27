import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/auth/server'

// 추세 데이터 타입
interface TrendData {
  attendance: { recent: number; previous: number; trend: 'improving' | 'stable' | 'declining' } | null
  mathflat: { recent: number; previous: number; trend: 'improving' | 'stable' | 'declining' } | null
  consultation: { recent: string | null; previous: string | null; trend: 'improving' | 'stable' | 'declining' } | null
}

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
    const now = new Date()
    // 날짜 비교용 문자열 (YYYY-MM-DD 형식으로 string 비교 가능)
    const fourWeeksAgoStr = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const eightWeeksAgoStr = new Date(now.getTime() - 56 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // 재원 학생 + 최근 상담 AI 분석 결과 조회 (활성 학생만)
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
      .eq('is_active', true)
      .eq('status', '재원')
      .order('name')

    if (studentsError) {
      console.error('Failed to fetch students:', studentsError)
      return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 })
    }

    // 각 학생의 최근 AI 분석 상담 조회 (최근 2개씩)
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

    // 출석 데이터 조회 (최근 8주)
    const { data: studyLogs, error: studyLogsError } = await supabase
      .from('study_logs')
      .select('student_id, date, attendance_status')
      .gte('date', eightWeeksAgoStr)
      .not('attendance_status', 'is', null)

    if (studyLogsError) {
      console.error('Failed to fetch study logs:', studyLogsError)
    }

    // 매쓰플랫 데이터 조회 (최근 8주)
    const { data: mathflatRecords, error: mathflatError } = await supabase
      .from('mathflat_records')
      .select('student_id, event_date, correct_rate')
      .gte('event_date', eightWeeksAgoStr)
      .not('correct_rate', 'is', null)

    if (mathflatError) {
      console.error('Failed to fetch mathflat records:', mathflatError)
    }

    // 상담 데이터 타입 정의
    type ConsultationType = {
      student_id: string
      type: string
      ai_churn_risk: string | null
      ai_hurdle: string | null
      ai_sentiment: string | null
      ai_analyzed_at: string | null
      date: string
      content: string | null
    }

    // 학생별 최근 상담 매핑 (최근 2개)
    const studentConsultations = new Map<string, ConsultationType[]>()
    consultations?.forEach(c => {
      const existing = studentConsultations.get(c.student_id) || []
      if (existing.length < 2) {
        existing.push(c as ConsultationType)
        studentConsultations.set(c.student_id, existing)
      }
    })

    // 학생별 추세 데이터 계산
    const studentTrends = new Map<string, TrendData>()

    students?.forEach(student => {
      // 출석 추세 계산 (attendance_status: 1결석, 2보강, 3조퇴, 4지각, 5출석)
      const studentLogs = studyLogs?.filter(l => l.student_id === student.id) || []
      // string 비교 (YYYY-MM-DD 형식)
      const recentLogs = studentLogs.filter(l => l.date >= fourWeeksAgoStr)
      const previousLogs = studentLogs.filter(l => l.date < fourWeeksAgoStr && l.date >= eightWeeksAgoStr)

      let attendanceTrend: TrendData['attendance'] = null
      if (recentLogs.length >= 2 && previousLogs.length >= 2) {
        // 출석률 계산 (5=출석, 4=지각, 3=조퇴, 2=보강, 1=결석)
        // 5,4를 정상 출석으로 간주 (출석, 지각)
        const recentRate = recentLogs.filter(l => (l.attendance_status ?? 0) >= 4).length / recentLogs.length * 100
        const previousRate = previousLogs.filter(l => (l.attendance_status ?? 0) >= 4).length / previousLogs.length * 100
        const diff = recentRate - previousRate

        attendanceTrend = {
          recent: Math.round(recentRate),
          previous: Math.round(previousRate),
          trend: diff >= 10 ? 'improving' : diff <= -10 ? 'declining' : 'stable'
        }
      }

      // 매쓰플랫 정답률 추세 계산 (string 비교)
      const studentMathflat = mathflatRecords?.filter(m => m.student_id === student.id) || []
      const recentMathflat = studentMathflat.filter(m => m.event_date && m.event_date >= fourWeeksAgoStr)
      const previousMathflat = studentMathflat.filter(m => m.event_date && m.event_date < fourWeeksAgoStr && m.event_date >= eightWeeksAgoStr)

      let mathflatTrend: TrendData['mathflat'] = null
      if (recentMathflat.length >= 2 && previousMathflat.length >= 2) {
        const recentAvg = recentMathflat.reduce((sum, m) => sum + (m.correct_rate || 0), 0) / recentMathflat.length
        const previousAvg = previousMathflat.reduce((sum, m) => sum + (m.correct_rate || 0), 0) / previousMathflat.length
        const diff = recentAvg - previousAvg

        mathflatTrend = {
          recent: Math.round(recentAvg),
          previous: Math.round(previousAvg),
          trend: diff >= 5 ? 'improving' : diff <= -5 ? 'declining' : 'stable'
        }
      }

      // 상담 추세 계산 (ai_churn_risk 변화)
      const consults = studentConsultations.get(student.id) || []
      let consultationTrend: TrendData['consultation'] = null
      if (consults.length >= 2) {
        const riskOrder = { 'low': 0, 'medium': 1, 'high': 2, 'critical': 3 }
        const recentRisk = consults[0]?.ai_churn_risk || null
        const previousRisk = consults[1]?.ai_churn_risk || null

        if (recentRisk && previousRisk) {
          const recentScore = riskOrder[recentRisk as keyof typeof riskOrder] ?? 1
          const previousScore = riskOrder[previousRisk as keyof typeof riskOrder] ?? 1
          const diff = recentScore - previousScore

          consultationTrend = {
            recent: recentRisk,
            previous: previousRisk,
            trend: diff < 0 ? 'improving' : diff > 0 ? 'declining' : 'stable'
          }
        }
      }

      studentTrends.set(student.id, {
        attendance: attendanceTrend,
        mathflat: mathflatTrend,
        consultation: consultationTrend
      })
    })

    // 위험도 계산 및 데이터 구성
    const riskData = students?.map(student => {
      const consults = studentConsultations.get(student.id) || []
      const consultation = consults[0] // 최신 상담
      const trendData = studentTrends.get(student.id) || { attendance: null, mathflat: null, consultation: null }
      const riskScore = calculateChurnRiskScore(student, consultation, currentMonth, trendData)

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
        // 추세 데이터
        trends: trendData,
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

// 이탈 위험 점수 계산 (실제 데이터 기반 + 추세 반영)
function calculateChurnRiskScore(
  student: { grade: number | null; school_type: string | null; start_date: string | null },
  consultation: { ai_churn_risk: string | null; ai_hurdle: string | null } | undefined,
  currentMonth: number,
  trendData: TrendData
): { score: number; level: 'critical' | 'high' | 'medium' | 'low'; factors: string[] } {
  let score = 0
  const factors: string[] = []

  const gradeStr = getGradeString(student.grade, student.school_type)
  const tenureMonths = calculateTenureMonths(student.start_date)

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

  // 2. 시즌 + 학년 리스크 (최대 25점) - 실제 퇴원 데이터 기반 (2023-2025)
  // 시험 후 이탈 패턴: 5월(중간), 7월(기말), 10월(중간), 12월(기말)
  const isExamSeason = [5, 7, 10, 12].includes(currentMonth)

  // 전환기 구분: 1-2월은 이미 새 학년으로 등록됨
  // - 11-12월: 전환 준비기 (아직 이전 학년)
  // - 1-2월: 전환 직후 (새 학년으로 등록, 적응 실패 위험)
  const isPreTransition = currentMonth === 11 || currentMonth === 12  // 전환 준비기
  const isPostTransition = currentMonth === 1 || currentMonth === 2   // 전환 직후

  // === 전환 직후 (1-2월): 새 학년으로 등록된 상태 ===
  // 고1 (1-2월) = 중3→고1 전환 직후 (가장 위험!)
  if (gradeStr === '고1' && isPostTransition) {
    score += 25
    factors.push('중3→고1 전환 직후: 적응 실패 위험')
  }
  // 중1 (1-2월) = 초6→중1 전환 직후 (매우 위험)
  else if (gradeStr === '중1' && isPostTransition) {
    score += 25
    factors.push('초6→중1 전환 직후: 적응 실패 위험')
  }
  // 고3 (1-2월) = 고2→고3 전환 (대치동/기숙학원 이동)
  else if (gradeStr === '고3' && isPostTransition) {
    score += 25
    factors.push('고2→고3 전환 직후: 대치동/기숙학원 이동 위험')
  }
  // 고2 (1-2월) = 고1→고2 전환 (일반 학년 전환)
  else if (gradeStr === '고2' && isPostTransition) {
    score += 10
    factors.push('고1→고2 전환 직후')
  }

  // === 전환 준비기 (11-12월): 아직 이전 학년 ===
  // 초6 (11-12월) = 곧 중1 될 예정 (학원 쇼핑 시즌)
  else if (gradeStr === '초6' && isPreTransition) {
    score += 20
    factors.push('초6→중1 전환 준비: 학원 쇼핑 시즌')
  }
  // 중3 (11-12월) = 곧 고1 될 예정 (고등 전환 준비)
  else if (gradeStr === '중3' && isPreTransition) {
    score += 20
    factors.push('중3→고1 전환 준비: 고등 전환 고민')
  }
  // 고2 (11-12월) = 곧 고3 될 예정 (대치동/기숙학원 이동)
  else if (gradeStr === '고2' && isPreTransition) {
    score += 25
    factors.push('고2→고3 전환 준비: 대치동/기숙학원 이동 고려')
  }
  // 고1 (11-12월) = 곧 고2 될 예정 (일반 학년 전환)
  else if (gradeStr === '고1' && isPreTransition) {
    score += 10
    factors.push('고1→고2 전환 준비')
  }

  // === 시험 후 이탈 (5,7,10,12월) ===
  // 고1: 중3→고1 전환 실패 (중도퇴원 20명 기록)
  else if (gradeStr === '고1' && currentMonth === 7) {
    score += 20
    factors.push('고1 여름: 기말고사 후 이탈')
  } else if (gradeStr === '고1' && currentMonth === 10) {
    score += 15
    factors.push('고1 중간고사 후 이탈')
  } else if (gradeStr === '고1' && currentMonth === 5) {
    score += 10
    factors.push('고1 중간고사 후 주의')
  }
  // 고2: 시험 후 이탈
  else if (gradeStr === '고2' && isExamSeason && !isPreTransition) {
    score += 10
    factors.push('고2 시험 후 이탈 주의')
  }
  // 고3: 10월 이전 이탈 (중도퇴원 29명 기록, 11월 이후는 자연졸업)
  else if (gradeStr === '고3' && currentMonth === 10) {
    score += 25
    factors.push('고3 10월: 수능 전 마지막 이탈')
  } else if (gradeStr === '고3' && currentMonth === 3) {
    score += 20
    factors.push('고3 신학기: 고위험')
  } else if (gradeStr === '고3' && currentMonth === 7) {
    score += 20
    factors.push('고3 여름: 고위험')
  } else if (gradeStr === '고3' && currentMonth === 5) {
    score += 15
    factors.push('고3 중간고사 후 이탈')
  }
  // 중1: 기말고사 후
  else if (gradeStr === '중1' && currentMonth === 7) {
    score += 15
    factors.push('중1 여름: 기말고사 후 이탈')
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

  // 5. 추세 반영 (개선 시 감점, 악화 시 가점)
  let trendBonus = 0

  // 5-1. 출석 추세 (최대 ±10점)
  if (trendData.attendance) {
    if (trendData.attendance.trend === 'improving') {
      trendBonus -= 10
      factors.push(`📈 출석 개선 (${trendData.attendance.previous}% → ${trendData.attendance.recent}%)`)
    } else if (trendData.attendance.trend === 'declining') {
      trendBonus += 8
      factors.push(`📉 출석 악화 (${trendData.attendance.previous}% → ${trendData.attendance.recent}%)`)
    }
  }

  // 5-2. 매쓰플랫 정답률 추세 (최대 ±10점)
  if (trendData.mathflat) {
    if (trendData.mathflat.trend === 'improving') {
      trendBonus -= 10
      factors.push(`📈 매쓰플랫 향상 (${trendData.mathflat.previous}% → ${trendData.mathflat.recent}%)`)
    } else if (trendData.mathflat.trend === 'declining') {
      trendBonus += 8
      factors.push(`📉 매쓰플랫 하락 (${trendData.mathflat.previous}% → ${trendData.mathflat.recent}%)`)
    }
  }

  // 5-3. 상담 추세 (최대 ±15점) - 가장 중요한 지표
  if (trendData.consultation) {
    if (trendData.consultation.trend === 'improving') {
      trendBonus -= 15
      factors.push(`📈 상담 개선 (${trendData.consultation.previous} → ${trendData.consultation.recent})`)
    } else if (trendData.consultation.trend === 'declining') {
      trendBonus += 10
      factors.push(`📉 상담 악화 (${trendData.consultation.previous} → ${trendData.consultation.recent})`)
    }
  }

  // 추세 보너스 적용
  score += trendBonus

  // 6. 고3 11월 이후 제외 (자연 졸업)
  if (gradeStr === '고3' && currentMonth >= 11) {
    return { score: 0, level: 'low', factors: ['고3 자연 졸업'] }
  }

  // 점수 범위 제한 (0-100)
  score = Math.max(0, Math.min(score, 100))

  // 위험 레벨 판정
  let level: 'critical' | 'high' | 'medium' | 'low'
  if (score >= 60) level = 'critical'
  else if (score >= 40) level = 'high'
  else if (score >= 20) level = 'medium'
  else level = 'low'

  return { score, level, factors }
}
