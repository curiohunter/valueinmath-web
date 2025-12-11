/**
 * 학생 학습 데이터 조회 API (개선된 버전)
 * GET /api/student-metrics?student_id=xxx&year=2025&month=11
 *
 * 현재 월: 상세 데이터 (날짜별 학습일지 + 테스트)
 * 이전 월: 요약 메트릭스 (추세 비교용)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/auth/server'
import type {
  StudentLearningData,
  CurrentMonthData,
  PrevMonthSummary,
  StudyLogDetail,
  TestLogDetail,
  StudentMetrics,
  Trend
} from '@/types/comment-assistant'

// ============================================
// 레이블 매핑
// ============================================

const ATTENDANCE_LABELS: Record<number, string> = {
  5: "출석",
  4: "지각",
  3: "조퇴",
  2: "보강",
  1: "결석",
}

const HOMEWORK_LABELS: Record<number, string> = {
  5: "100% 마무리",
  4: "90% 이상",
  3: "추가 추적 필요",
  2: "보강필요",
  1: "결석",
}

const FOCUS_LABELS: Record<number, string> = {
  5: "매우 열의있음",
  4: "대체로 잘참여",
  3: "산만하나 진행가능",
  2: "조치필요",
  1: "결석",
}

// 출석으로 간주하는 코드 (출석률 계산용)
const ATTENDANCE_PRESENT_CODES = [5, 4, 2] // 출석, 지각, 보강

// 숙제 완료로 간주하는 코드
const HOMEWORK_COMPLETED_CODES = [5, 4] // 100% 마무리, 90% 이상

// ============================================
// 유틸리티 함수
// ============================================

function getPreviousMonth(year: number, month: number): { year: number; month: number } {
  if (month === 1) {
    return { year: year - 1, month: 12 }
  }
  return { year, month: month - 1 }
}

function getMonthDateRange(year: number, month: number): { startDate: string; endDate: string } {
  const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`
  return { startDate, endDate }
}

function formatDateShort(dateStr: string): string {
  // "2025-11-04" → "11-04"
  const parts = dateStr.split('-')
  return `${parts[1]}-${parts[2]}`
}

// ============================================
// 현재 월 상세 데이터 조회
// ============================================

async function getCurrentMonthData(
  supabase: any,
  studentId: string,
  year: number,
  month: number
): Promise<CurrentMonthData> {
  const { startDate, endDate } = getMonthDateRange(year, month)

  // 학습일지 조회
  const { data: studyLogs } = await supabase
    .from('study_logs')
    .select('date, attendance_status, homework, focus, book1, book1log, book2, book2log')
    .eq('student_id', studentId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  // 테스트 조회
  const { data: testLogs } = await supabase
    .from('test_logs')
    .select('date, test, test_type, test_score')
    .eq('student_id', studentId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  // 학습일지 변환
  const studyLogDetails: StudyLogDetail[] = (studyLogs || []).map((log: any) => {
    const attendance = log.attendance_status || 0
    const homework = log.homework || 0
    const focus = log.focus || 0

    // 수업 내용 조합 (book1 + book1log)
    let classContent = ''
    if (log.book1) {
      classContent = log.book1
      if (log.book1log) classContent += ` - ${log.book1log}`
    }

    // 숙제 내용 조합 (book2 + book2log)
    let homeworkContent = ''
    if (log.book2) {
      homeworkContent = log.book2
      if (log.book2log) homeworkContent += ` - ${log.book2log}`
    }

    return {
      date: formatDateShort(log.date),
      attendance,
      attendanceLabel: ATTENDANCE_LABELS[attendance] || '미입력',
      homework,
      homeworkLabel: HOMEWORK_LABELS[homework] || '미입력',
      focus,
      focusLabel: FOCUS_LABELS[focus] || '미입력',
      classContent: classContent || undefined,
      homeworkContent: homeworkContent || undefined,
    }
  })

  // 테스트 변환
  const testLogDetails: TestLogDetail[] = (testLogs || []).map((test: any) => ({
    date: formatDateShort(test.date),
    testName: test.test || '테스트',
    testType: test.test_type || '기타',
    score: test.test_score || 0,
  }))

  return {
    year,
    month,
    studyLogs: studyLogDetails,
    testLogs: testLogDetails,
  }
}

// ============================================
// 이전 월 요약 메트릭스 조회
// ============================================

async function getPrevMonthSummary(
  supabase: any,
  studentId: string,
  year: number,
  month: number
): Promise<PrevMonthSummary | null> {
  const { startDate, endDate } = getMonthDateRange(year, month)

  // 학습일지 조회
  const { data: studyLogs } = await supabase
    .from('study_logs')
    .select('attendance_status, homework, focus')
    .eq('student_id', studentId)
    .gte('date', startDate)
    .lte('date', endDate)

  // 테스트 조회
  const { data: testLogs } = await supabase
    .from('test_logs')
    .select('test_score')
    .eq('student_id', studentId)
    .gte('date', startDate)
    .lte('date', endDate)

  if (!studyLogs || studyLogs.length === 0) {
    return null
  }

  // 총 수업일수
  const totalDays = studyLogs.length

  // 출석률 계산
  const validAttendance = studyLogs.filter((log: any) => log.attendance_status !== null)
  const attendedDays = validAttendance.filter((log: any) =>
    ATTENDANCE_PRESENT_CODES.includes(log.attendance_status)
  ).length
  const attendanceRate = validAttendance.length > 0
    ? Math.round((attendedDays / validAttendance.length) * 100)
    : 0

  // 숙제 평균 (1-5 스케일)
  const validHomework = studyLogs.filter((log: any) => log.homework !== null && log.homework > 0)
  const homeworkSum = validHomework.reduce((sum: number, log: any) => sum + log.homework, 0)
  const homeworkAvg = validHomework.length > 0
    ? Math.round((homeworkSum / validHomework.length) * 10) / 10
    : 0

  // 집중도 평균 (1-5 스케일)
  const validFocus = studyLogs.filter((log: any) => log.focus !== null && log.focus > 0)
  const focusSum = validFocus.reduce((sum: number, log: any) => sum + log.focus, 0)
  const focusAvg = validFocus.length > 0
    ? Math.round((focusSum / validFocus.length) * 10) / 10
    : 0

  // 테스트 통계
  const validTests = (testLogs || []).filter((t: any) => t.test_score !== null)
  const testCount = validTests.length
  const testSum = validTests.reduce((sum: number, t: any) => sum + t.test_score, 0)
  const testAvgScore = testCount > 0 ? Math.round(testSum / testCount) : 0

  return {
    year,
    month,
    totalDays,
    attendanceRate,
    homeworkAvg,
    focusAvg,
    testCount,
    testAvgScore,
  }
}

// ============================================
// UI용 기존 메트릭스 생성 (호환성 유지)
// ============================================

function calculateUIMetrics(
  currentMonth: CurrentMonthData,
  prevMonthSummary: PrevMonthSummary | null
): StudentMetrics {
  const { studyLogs, testLogs } = currentMonth

  // 출석률 계산
  const validAttendance = studyLogs.filter(log => log.attendance > 0)
  const attendedDays = validAttendance.filter(log =>
    ATTENDANCE_PRESENT_CODES.includes(log.attendance)
  ).length
  const attendanceRate = validAttendance.length > 0
    ? Math.round((attendedDays / validAttendance.length) * 100)
    : 0

  // 숙제 완료율 계산
  const validHomework = studyLogs.filter(log => log.homework > 0)
  const completedHomework = validHomework.filter(log =>
    HOMEWORK_COMPLETED_CODES.includes(log.homework)
  ).length
  const homeworkCompletionRate = validHomework.length > 0
    ? Math.round((completedHomework / validHomework.length) * 100)
    : 0

  // 테스트 통계
  const validTests = testLogs.filter(t => t.score > 0)
  const testCount = validTests.length
  const testSum = validTests.reduce((sum, t) => sum + t.score, 0)
  const testAvgScore = testCount > 0 ? Math.round(testSum / testCount) : 0

  // 추세 계산 (현재 vs 이전달)
  const TREND_THRESHOLD_SCORE = 5
  const TREND_THRESHOLD_ATTENDANCE = 5
  const TREND_THRESHOLD_HOMEWORK = 10

  function calculateTrend(current: number, prev: number, threshold: number): Trend {
    const diff = current - prev
    if (diff > threshold) return 'up'
    if (diff < -threshold) return 'down'
    return 'flat'
  }

  const trend: { score: Trend; attendance: Trend; homework: Trend } = {
    score: 'flat',
    attendance: 'flat',
    homework: 'flat',
  }

  if (prevMonthSummary) {
    trend.score = calculateTrend(testAvgScore, prevMonthSummary.testAvgScore, TREND_THRESHOLD_SCORE)
    trend.attendance = calculateTrend(attendanceRate, prevMonthSummary.attendanceRate, TREND_THRESHOLD_ATTENDANCE)
    // 숙제: 현재는 완료율(%), 이전달은 평균(1-5)이므로 비교를 위해 변환
    const prevHomeworkRate = Math.round((prevMonthSummary.homeworkAvg / 5) * 100)
    trend.homework = calculateTrend(homeworkCompletionRate, prevHomeworkRate, TREND_THRESHOLD_HOMEWORK)
  }

  return {
    monthly_tests: {
      count: testCount,
      avgScore: testAvgScore,
    },
    attendanceRate,
    homeworkCompletionRate,
    comparison: prevMonthSummary ? {
      prevMonth: {
        avgScore: prevMonthSummary.testAvgScore,
        attendanceRate: prevMonthSummary.attendanceRate,
        homeworkCompletionRate: Math.round((prevMonthSummary.homeworkAvg / 5) * 100),
      }
    } : undefined,
    trend,
  }
}

// ============================================
// API 핸들러
// ============================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    // 선생님 확인
    const { data: employee } = await supabase
      .from('employees')
      .select('id')
      .eq('auth_id', user.id)
      .eq('status', '재직')
      .single()

    if (!employee) {
      return NextResponse.json(
        { success: false, error: '선생님만 사용할 수 있는 기능입니다.' },
        { status: 403 }
      )
    }

    // 쿼리 파라미터
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('student_id')
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString())

    if (!studentId) {
      return NextResponse.json(
        { success: false, error: 'student_id가 필요합니다.' },
        { status: 400 }
      )
    }

    // 현재 월 상세 데이터
    const currentMonth = await getCurrentMonthData(supabase, studentId, year, month)

    // 이전 월 요약 데이터
    const prev = getPreviousMonth(year, month)
    const prevMonthSummary = await getPrevMonthSummary(supabase, studentId, prev.year, prev.month)

    // AI용 전체 학습 데이터
    const learningData: StudentLearningData = {
      currentMonth,
      prevMonth: prevMonthSummary || undefined,
    }

    // UI용 기존 메트릭스 (호환성)
    const metrics = calculateUIMetrics(currentMonth, prevMonthSummary)

    return NextResponse.json({
      success: true,
      data: metrics,           // UI 표시용 (기존 호환)
      learningData,            // AI 코멘트 생성용 (새로운 상세 데이터)
    })
  } catch (error) {
    console.error('[Student Metrics] Error:', error)
    return NextResponse.json(
      { success: false, error: '데이터 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
