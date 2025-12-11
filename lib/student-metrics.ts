/**
 * 학생 학습 메트릭스 수집
 * - 최근 2-3개월 학습 데이터 수집
 * - 추세(trend) 계산
 */

import { createClient } from '@/lib/supabase/client'
import type { StudentMetrics, Trend, MonthlyComparison, TREND_THRESHOLDS } from '@/types/comment-assistant'

// ============================================
// 추세 계산 임계값 상수
// ============================================

const TREND_THRESHOLD_SCORE = 5       // 성적: ±5점
const TREND_THRESHOLD_ATTENDANCE = 5  // 출석률: ±5%
const TREND_THRESHOLD_HOMEWORK = 10   // 과제 수행률: ±10%

// ============================================
// 유틸리티 함수
// ============================================

/**
 * 추세 계산
 */
function calculateTrend(current: number, prev: number, threshold: number): Trend {
  const diff = current - prev
  if (diff > threshold) return 'up'
  if (diff < -threshold) return 'down'
  return 'flat'
}

/**
 * 월 계산 헬퍼 (이전 월 계산)
 */
function getPreviousMonth(year: number, month: number): { year: number; month: number } {
  if (month === 1) {
    return { year: year - 1, month: 12 }
  }
  return { year, month: month - 1 }
}

/**
 * 날짜 범위 계산 (해당 월의 시작일~종료일)
 */
function getMonthDateRange(year: number, month: number): { startDate: string; endDate: string } {
  const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`
  return { startDate, endDate }
}

// ============================================
// 월별 메트릭스 계산
// ============================================

interface MonthlyData {
  testCount: number
  testAvgScore: number
  attendanceRate: number
  homeworkCompletionRate: number
}

async function getMonthlyData(
  studentId: string,
  year: number,
  month: number
): Promise<MonthlyData> {
  const supabase = createClient()
  const { startDate, endDate } = getMonthDateRange(year, month)

  // 학습일지 조회 (출석, 숙제)
  const { data: studyLogs, error: studyError } = await supabase
    .from('study_logs')
    .select('attendance_status, homework')
    .eq('student_id', studentId)
    .gte('date', startDate)
    .lte('date', endDate)

  if (studyError) {
    console.error('[StudentMetrics] Study logs fetch error:', studyError)
  }

  // 테스트 조회
  const { data: testLogs, error: testError } = await supabase
    .from('test_logs')
    .select('score, total_score')
    .eq('student_id', studentId)
    .gte('test_date', startDate)
    .lte('test_date', endDate)

  if (testError) {
    console.error('[StudentMetrics] Test logs fetch error:', testError)
  }

  // 출석률 계산
  const totalDays = studyLogs?.length || 0
  const attendedDays = studyLogs?.filter(log =>
    log.attendance_status === '출석' || log.attendance_status === '지각'
  ).length || 0
  const attendanceRate = totalDays > 0 ? Math.round((attendedDays / totalDays) * 100) : 0

  // 숙제 수행률 계산
  const homeworkCompleted = studyLogs?.filter(log =>
    log.homework === '완료' || log.homework === 'O'
  ).length || 0
  const homeworkCompletionRate = totalDays > 0 ? Math.round((homeworkCompleted / totalDays) * 100) : 0

  // 테스트 평균 점수 계산
  const testCount = testLogs?.length || 0
  let testAvgScore = 0
  if (testCount > 0 && testLogs) {
    const totalPercentage = testLogs.reduce((sum, test) => {
      if (test.total_score && test.total_score > 0) {
        return sum + (test.score / test.total_score) * 100
      }
      return sum + test.score
    }, 0)
    testAvgScore = Math.round(totalPercentage / testCount)
  }

  return {
    testCount,
    testAvgScore,
    attendanceRate,
    homeworkCompletionRate,
  }
}

// ============================================
// 메인 함수: 학생 메트릭스 조회
// ============================================

export async function getStudentMetrics(
  studentId: string,
  year: number,
  month: number
): Promise<StudentMetrics> {
  // 현재 월 데이터
  const currentData = await getMonthlyData(studentId, year, month)

  // 이전 월 데이터
  const prev1 = getPreviousMonth(year, month)
  const prevMonthData = await getMonthlyData(studentId, prev1.year, prev1.month)

  // 2달 전 데이터
  const prev2 = getPreviousMonth(prev1.year, prev1.month)
  const prev2MonthData = await getMonthlyData(studentId, prev2.year, prev2.month)

  // 비교 데이터 구성
  const comparison = {
    prevMonth: {
      avgScore: prevMonthData.testAvgScore,
      attendanceRate: prevMonthData.attendanceRate,
      homeworkCompletionRate: prevMonthData.homeworkCompletionRate,
    } as MonthlyComparison,
    prev2Month: {
      avgScore: prev2MonthData.testAvgScore,
      attendanceRate: prev2MonthData.attendanceRate,
      homeworkCompletionRate: prev2MonthData.homeworkCompletionRate,
    } as MonthlyComparison,
  }

  // 추세 계산 (현재 vs 이전달)
  const trend = {
    score: calculateTrend(
      currentData.testAvgScore,
      prevMonthData.testAvgScore,
      TREND_THRESHOLD_SCORE
    ),
    attendance: calculateTrend(
      currentData.attendanceRate,
      prevMonthData.attendanceRate,
      TREND_THRESHOLD_ATTENDANCE
    ),
    homework: calculateTrend(
      currentData.homeworkCompletionRate,
      prevMonthData.homeworkCompletionRate,
      TREND_THRESHOLD_HOMEWORK
    ),
  }

  return {
    monthly_tests: {
      count: currentData.testCount,
      avgScore: currentData.testAvgScore,
    },
    attendanceRate: currentData.attendanceRate,
    homeworkCompletionRate: currentData.homeworkCompletionRate,
    comparison,
    trend,
  }
}

// ============================================
// 서버 컴포넌트용 (서버 클라이언트 사용)
// ============================================

export async function getStudentMetricsServer(
  studentId: string,
  year: number,
  month: number,
  supabase: any
): Promise<StudentMetrics> {
  const { startDate, endDate } = getMonthDateRange(year, month)

  // 학습일지 조회
  const { data: studyLogs } = await supabase
    .from('study_logs')
    .select('attendance_status, homework')
    .eq('student_id', studentId)
    .gte('date', startDate)
    .lte('date', endDate)

  // 테스트 조회
  const { data: testLogs } = await supabase
    .from('test_logs')
    .select('score, total_score')
    .eq('student_id', studentId)
    .gte('test_date', startDate)
    .lte('test_date', endDate)

  // 간단히 현재 월 데이터만 반환 (서버에서는 비교 데이터 생략)
  const totalDays = studyLogs?.length || 0
  const attendedDays = studyLogs?.filter((log: any) =>
    log.attendance_status === '출석' || log.attendance_status === '지각'
  ).length || 0
  const attendanceRate = totalDays > 0 ? Math.round((attendedDays / totalDays) * 100) : 0

  const homeworkCompleted = studyLogs?.filter((log: any) =>
    log.homework === '완료' || log.homework === 'O'
  ).length || 0
  const homeworkCompletionRate = totalDays > 0 ? Math.round((homeworkCompleted / totalDays) * 100) : 0

  const testCount = testLogs?.length || 0
  let testAvgScore = 0
  if (testCount > 0 && testLogs) {
    const totalPercentage = testLogs.reduce((sum: number, test: any) => {
      if (test.total_score && test.total_score > 0) {
        return sum + (test.score / test.total_score) * 100
      }
      return sum + test.score
    }, 0)
    testAvgScore = Math.round(totalPercentage / testCount)
  }

  return {
    monthly_tests: { count: testCount, avgScore: testAvgScore },
    attendanceRate,
    homeworkCompletionRate,
  }
}
