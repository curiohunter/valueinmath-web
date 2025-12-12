/**
 * B2B SaaS Feature 2: 위험 분석 배치 서비스
 *
 * ⚠️ 중요: 이 서비스는 배치 전용입니다.
 * API에서 직접 호출하지 않고, pg_cron 또는 Edge Function에서 실행합니다.
 *
 * 실행 주기: 1일 1회 (새벽 3시 권장)
 */

import { SupabaseClient } from '@supabase/supabase-js'
import type { RiskLevel, ScoreTrend, RiskAlertType, RiskAlertSeverity } from '@/types/b2b-saas'

// ============================================
// 타입 정의
// ============================================

interface RiskConfigWeights {
  attendance: number
  achievement: number
  interaction: number
  sentiment: number
}

interface RiskConfigThresholds {
  critical: number
  high: number
  medium: number
  low: number
}

interface RiskConfigAlertTriggers {
  score_drop_percent: number
  consecutive_absences: number
  test_score_drop: number
}

interface StudentRiskCalculation {
  studentId: string
  studentName: string
  attendanceScore: number
  achievementScore: number
  interactionScore: number
  sentimentScore: number
  totalRiskScore: number
  riskLevel: RiskLevel
  scoreTrend: ScoreTrend
  previousScore: number | null
  scoreChange: number | null
  dataPoints: number
}

interface RiskAlertInput {
  studentId: string
  alertType: RiskAlertType
  severity: RiskAlertSeverity
  title: string
  message: string
  triggerData: Record<string, unknown>
}

interface BatchResult {
  batchId: string
  calculatedAt: string
  totalStudents: number
  updated: number
  alertsCreated: number
  errors: string[]
}

// ============================================
// 설정 로드
// ============================================

async function loadRiskConfig(supabase: SupabaseClient) {
  const { data: configs } = await supabase
    .from('risk_config')
    .select('config_key, config_value')

  const configMap: Record<string, unknown> = {}
  configs?.forEach(c => {
    configMap[c.config_key] = c.config_value
  })

  return {
    weights: (configMap['score_weights'] || {
      attendance: 0.30,
      achievement: 0.25,
      interaction: 0.25,
      sentiment: 0.20,
    }) as RiskConfigWeights,
    thresholds: (configMap['thresholds'] || {
      critical: 30,
      high: 50,
      medium: 70,
      low: 85,
    }) as RiskConfigThresholds,
    alertTriggers: (configMap['alert_triggers'] || {
      score_drop_percent: 15,
      consecutive_absences: 3,
      test_score_drop: 20,
    }) as RiskConfigAlertTriggers,
    analysisPeriodDays: Number(configMap['analysis_period_days']) || 28,
  }
}

// ============================================
// 점수 계산 함수들
// ============================================

/**
 * 출석 점수 계산 (0-100, 높을수록 좋음)
 * study_logs.attendance_status 기반
 */
async function calculateAttendanceScore(
  supabase: SupabaseClient,
  studentId: string,
  startDate: string
): Promise<{ score: number; dataPoints: number }> {
  const { data: logs } = await supabase
    .from('study_logs')
    .select('attendance_status')
    .eq('student_id', studentId)
    .gte('date', startDate)

  if (!logs?.length) {
    return { score: 100, dataPoints: 0 } // 데이터 없으면 기본값
  }

  // attendance_status: 1=출석, 2=지각, 3=조퇴, 4=결석, 5=휴원
  const statusScores: Record<number, number> = {
    1: 100, // 출석
    2: 70,  // 지각
    3: 70,  // 조퇴
    4: 0,   // 결석
    5: 50,  // 휴원
  }

  const totalScore = logs.reduce((sum, log) => {
    const status = log.attendance_status || 1
    return sum + (statusScores[status] || 100)
  }, 0)

  return {
    score: Math.round(totalScore / logs.length),
    dataPoints: logs.length,
  }
}

/**
 * 성취도 점수 계산 (0-100, 높을수록 좋음)
 * test_logs 기반
 */
async function calculateAchievementScore(
  supabase: SupabaseClient,
  studentId: string,
  startDate: string
): Promise<{ score: number; dataPoints: number }> {
  const { data: tests } = await supabase
    .from('test_logs')
    .select('score')
    .eq('student_id', studentId)
    .gte('test_date', startDate)
    .not('score', 'is', null)

  if (!tests?.length) {
    return { score: 100, dataPoints: 0 }
  }

  const avgScore = tests.reduce((sum, t) => sum + (t.score || 0), 0) / tests.length

  return {
    score: Math.round(avgScore),
    dataPoints: tests.length,
  }
}

/**
 * 참여도 점수 계산 (0-100, 높을수록 좋음)
 * study_logs.homework + focus 평균
 */
async function calculateInteractionScore(
  supabase: SupabaseClient,
  studentId: string,
  startDate: string
): Promise<{ score: number; dataPoints: number }> {
  const { data: logs } = await supabase
    .from('study_logs')
    .select('homework, focus')
    .eq('student_id', studentId)
    .gte('date', startDate)

  if (!logs?.length) {
    return { score: 100, dataPoints: 0 }
  }

  let totalHomework = 0
  let totalFocus = 0
  let homeworkCount = 0
  let focusCount = 0

  logs.forEach(log => {
    if (log.homework !== null) {
      totalHomework += (log.homework || 0) * 20 // 1-5 → 20-100
      homeworkCount++
    }
    if (log.focus !== null) {
      totalFocus += (log.focus || 0) * 20 // 1-5 → 20-100
      focusCount++
    }
  })

  const avgHomework = homeworkCount > 0 ? totalHomework / homeworkCount : 100
  const avgFocus = focusCount > 0 ? totalFocus / focusCount : 100
  const avgInteraction = (avgHomework + avgFocus) / 2

  return {
    score: Math.round(avgInteraction),
    dataPoints: logs.length,
  }
}

/**
 * 감정 점수 계산 (0-100, 높을수록 좋음)
 * Phase 2에서 NLP 분석 연동 예정, 현재는 기본값 반환
 */
async function calculateSentimentScore(
  _supabase: SupabaseClient,
  _studentId: string,
  _startDate: string
): Promise<{ score: number; dataPoints: number }> {
  // TODO: Phase 2에서 consultations + study_logs notes NLP 분석 연동
  return { score: 100, dataPoints: 0 }
}

/**
 * 위험 수준 결정
 */
function determineRiskLevel(
  riskScore: number,
  thresholds: RiskConfigThresholds
): RiskLevel {
  // riskScore가 높을수록 위험
  if (riskScore >= thresholds.critical) return 'critical'
  if (riskScore >= thresholds.high) return 'high'
  if (riskScore >= thresholds.medium) return 'medium'
  if (riskScore >= thresholds.low) return 'low'
  return 'none'
}

/**
 * 점수 트렌드 결정
 */
function determineScoreTrend(
  currentScore: number,
  previousScore: number | null,
  thresholds: { criticalDecline: number; decline: number }
): ScoreTrend {
  if (previousScore === null) return 'stable'

  const change = currentScore - previousScore

  if (change <= -thresholds.criticalDecline) return 'critical_decline'
  if (change < -thresholds.decline) return 'declining'
  if (change > thresholds.decline) return 'improving'
  return 'stable'
}

// ============================================
// 알림 생성
// ============================================

async function createRiskAlert(
  supabase: SupabaseClient,
  input: RiskAlertInput
): Promise<void> {
  // 동일한 학생의 동일한 알림 타입이 active 상태인지 확인
  const { data: existingAlert } = await supabase
    .from('risk_alerts')
    .select('id')
    .eq('student_id', input.studentId)
    .eq('alert_type', input.alertType)
    .eq('status', 'active')
    .single()

  // 이미 활성 알림이 있으면 생성하지 않음
  if (existingAlert) return

  await supabase.from('risk_alerts').insert({
    student_id: input.studentId,
    alert_type: input.alertType,
    severity: input.severity,
    title: input.title,
    message: input.message,
    trigger_data: input.triggerData,
  })
}

// ============================================
// 메인 배치 함수
// ============================================

export async function runRiskCalculationBatch(
  supabase: SupabaseClient
): Promise<BatchResult> {
  const batchId = `batch_${Date.now()}`
  const calculatedAt = new Date().toISOString()
  const errors: string[] = []
  let updated = 0
  let alertsCreated = 0

  try {
    // 1. 설정 로드
    const config = await loadRiskConfig(supabase)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - config.analysisPeriodDays)
    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = new Date().toISOString().split('T')[0]

    // 2. 재원 학생 목록 조회
    const { data: students } = await supabase
      .from('students')
      .select('id, name')
      .eq('is_active', true)
      .eq('status', '재원')

    if (!students?.length) {
      return {
        batchId,
        calculatedAt,
        totalStudents: 0,
        updated: 0,
        alertsCreated: 0,
        errors: [],
      }
    }

    // 3. 기존 점수 조회 (트렌드 계산용)
    const { data: existingScores } = await supabase
      .from('student_risk_scores')
      .select('student_id, total_risk_score')

    const previousScoreMap = new Map<string, number>()
    existingScores?.forEach(s => {
      previousScoreMap.set(s.student_id, s.total_risk_score)
    })

    // 4. 각 학생별 점수 계산
    for (const student of students) {
      try {
        // 4.1 개별 점수 계산
        const [attendance, achievement, interaction, sentiment] = await Promise.all([
          calculateAttendanceScore(supabase, student.id, startDateStr),
          calculateAchievementScore(supabase, student.id, startDateStr),
          calculateInteractionScore(supabase, student.id, startDateStr),
          calculateSentimentScore(supabase, student.id, startDateStr),
        ])

        // 4.2 가중 평균으로 안전 점수 계산 (높을수록 안전)
        const safetyScore =
          attendance.score * config.weights.attendance +
          achievement.score * config.weights.achievement +
          interaction.score * config.weights.interaction +
          sentiment.score * config.weights.sentiment

        // 4.3 위험 점수 = 100 - 안전 점수 (높을수록 위험)
        const riskScore = Math.round(100 - safetyScore)

        // 4.4 위험 수준 결정
        const riskLevel = determineRiskLevel(riskScore, config.thresholds)

        // 4.5 트렌드 계산
        const previousScore = previousScoreMap.get(student.id) ?? null
        const scoreChange = previousScore !== null ? riskScore - previousScore : null
        const scoreTrend = determineScoreTrend(
          riskScore,
          previousScore,
          { criticalDecline: 20, decline: 10 }
        )

        // 4.6 총 데이터 포인트
        const dataPoints = attendance.dataPoints + achievement.dataPoints + interaction.dataPoints

        // 5. UPSERT 점수
        const { error: upsertError } = await supabase
          .from('student_risk_scores')
          .upsert({
            student_id: student.id,
            attendance_score: attendance.score,
            achievement_score: achievement.score,
            interaction_score: interaction.score,
            sentiment_score: sentiment.score,
            total_risk_score: riskScore,
            risk_level: riskLevel,
            score_trend: scoreTrend,
            previous_score: previousScore,
            score_change: scoreChange,
            analysis_period_start: startDateStr,
            analysis_period_end: endDateStr,
            data_points: dataPoints,
            last_calculated_at: calculatedAt,
            calculation_batch_id: batchId,
          }, {
            onConflict: 'student_id',
          })

        if (upsertError) {
          errors.push(`[${student.name}] 점수 저장 실패: ${upsertError.message}`)
          continue
        }

        updated++

        // 6. 알림 생성 (임계값 초과 시)
        // 6.1 위험 수준이 high 이상이면 알림
        if (riskLevel === 'critical' || riskLevel === 'high') {
          await createRiskAlert(supabase, {
            studentId: student.id,
            alertType: 'score_threshold_crossed',
            severity: riskLevel === 'critical' ? 'critical' : 'high',
            title: `${student.name} 학생 위험 감지`,
            message: `종합 위험 점수가 ${riskScore}점으로 ${riskLevel === 'critical' ? '위험' : '주의'} 수준입니다.`,
            triggerData: {
              riskScore,
              riskLevel,
              attendanceScore: attendance.score,
              achievementScore: achievement.score,
              interactionScore: interaction.score,
            },
          })
          alertsCreated++
        }

        // 6.2 급격한 하락 시 알림
        if (scoreTrend === 'critical_decline' && scoreChange !== null) {
          await createRiskAlert(supabase, {
            studentId: student.id,
            alertType: 'rapid_decline',
            severity: 'high',
            title: `${student.name} 학생 급격한 하락`,
            message: `위험 점수가 ${Math.abs(scoreChange)}점 상승했습니다. (${previousScore} → ${riskScore})`,
            triggerData: {
              previousScore,
              currentScore: riskScore,
              scoreChange,
              scoreTrend,
            },
          })
          alertsCreated++
        }

        // 6.3 출석 패턴 문제 시 알림
        if (attendance.score < 50) {
          await createRiskAlert(supabase, {
            studentId: student.id,
            alertType: 'attendance_pattern',
            severity: attendance.score < 30 ? 'critical' : 'high',
            title: `${student.name} 학생 출석 문제`,
            message: `출석 점수가 ${attendance.score}점으로 저조합니다.`,
            triggerData: {
              attendanceScore: attendance.score,
              dataPoints: attendance.dataPoints,
            },
          })
          alertsCreated++
        }

      } catch (studentError) {
        const errorMessage = studentError instanceof Error ? studentError.message : 'Unknown error'
        errors.push(`[${student.name}] 계산 실패: ${errorMessage}`)
      }
    }

    return {
      batchId,
      calculatedAt,
      totalStudents: students.length,
      updated,
      alertsCreated,
      errors,
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    errors.push(`배치 실행 실패: ${errorMessage}`)

    return {
      batchId,
      calculatedAt,
      totalStudents: 0,
      updated: 0,
      alertsCreated: 0,
      errors,
    }
  }
}

// ============================================
// 개별 학생 점수 조회 (API용)
// ============================================

export async function getStudentRiskScore(
  supabase: SupabaseClient,
  studentId: string
) {
  const { data, error } = await supabase
    .from('student_risk_scores')
    .select(`
      *,
      student:students(name, department, status)
    `)
    .eq('student_id', studentId)
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

// ============================================
// 전체 위험 점수 목록 조회 (API용)
// ============================================

export async function getAllRiskScores(
  supabase: SupabaseClient,
  options?: {
    riskLevel?: RiskLevel
    limit?: number
    offset?: number
  }
) {
  let query = supabase
    .from('student_risk_scores')
    .select(`
      *,
      student:students(id, name, department, status)
    `, { count: 'exact' })
    .order('total_risk_score', { ascending: false })

  if (options?.riskLevel) {
    query = query.eq('risk_level', options.riskLevel)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
  }

  const { data, count, error } = await query

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data, count }
}

// ============================================
// 활성 알림 조회 (API용)
// ============================================

export async function getActiveAlerts(
  supabase: SupabaseClient,
  options?: {
    severity?: RiskAlertSeverity
    limit?: number
  }
) {
  let query = supabase
    .from('risk_alerts')
    .select(`
      *,
      student:students(id, name, department)
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (options?.severity) {
    query = query.eq('severity', options.severity)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

// ============================================
// 알림 상태 변경 (API용)
// ============================================

export async function updateAlertStatus(
  supabase: SupabaseClient,
  alertId: string,
  action: 'acknowledge' | 'resolve' | 'dismiss',
  employeeId: string,
  note?: string
) {
  const updateData: Record<string, unknown> = {
    status: action === 'acknowledge' ? 'acknowledged' : action === 'resolve' ? 'resolved' : 'dismissed',
  }

  if (action === 'acknowledge') {
    updateData.acknowledged_by = employeeId
    updateData.acknowledged_at = new Date().toISOString()
  } else if (action === 'resolve') {
    updateData.resolved_by = employeeId
    updateData.resolved_at = new Date().toISOString()
    if (note) updateData.resolution_note = note
  }

  const { error } = await supabase
    .from('risk_alerts')
    .update(updateData)
    .eq('id', alertId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

// ============================================
// 설정 조회/변경 (API용)
// ============================================

export async function getRiskConfig(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('risk_config')
    .select('*')
    .order('config_key')

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

export async function updateRiskConfig(
  supabase: SupabaseClient,
  configKey: string,
  configValue: unknown,
  employeeId: string
) {
  const { error } = await supabase
    .from('risk_config')
    .update({
      config_value: configValue,
      updated_by: employeeId,
      updated_at: new Date().toISOString(),
    })
    .eq('config_key', configKey)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
