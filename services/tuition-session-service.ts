import { createClient } from '@/lib/supabase/client'
import type {
  TuitionSession,
  TuitionSessionStatus,
  SessionGenerationInput,
  SessionGenerationResult,
  GeneratedSession,
  SessionCreateInput,
  ClassSessionSegment,
  StudentMonthlyPlan,
  TransferInfo,
} from '@/types/tuition-session'
import { CLASS_COLORS } from '@/types/tuition-session'
import type { AcademyClosure } from '@/types/closure'
import { getClosuresForClass } from '@/services/closure-service'

const DAY_OF_WEEK_KR = ['일', '월', '화', '수', '목', '금', '토'] as const
const MAX_DAYS = 100 // 약 3개월, 안전장치

// --- 날짜 헬퍼 ---

function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00+09:00')
}

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

// --- 스케줄 조회 ---

async function getClassSchedules(
  classId: string
): Promise<{ day_of_week: string; start_time: string; end_time: string }[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('class_schedules')
    .select('day_of_week, start_time, end_time')
    .eq('class_id', classId)

  if (error) throw error
  return data ?? []
}

/**
 * 특정 반에 영향을 미치는 휴원 → Map<날짜, closure> 변환
 */
async function getClosureMapForClass(
  classId: string,
  startDate: string,
  endDate: string
): Promise<Map<string, AcademyClosure>> {
  const closures = await getClosuresForClass(classId, startDate, endDate)
  const map = new Map<string, AcademyClosure>()
  for (const c of closures) {
    map.set(c.closure_date, c)
  }
  return map
}

/**
 * 세션 날짜 생성 (수업일 걷기 + 휴원 건너뛰기)
 *
 * periodStartDate부터 수업 요일을 따라가며 targetSessionCount만큼 청구 가능 세션을 생성.
 * 휴원일은 status='closure'로 포함되지만 billable 카운트에서 제외.
 */
export async function generateSessionDates(
  input: SessionGenerationInput
): Promise<SessionGenerationResult> {
  const schedules = await getClassSchedules(input.classId)
  if (schedules.length === 0) {
    throw new Error('수업 스케줄이 설정되지 않았습니다. 반 설정에서 시간표를 먼저 추가하세요.')
  }

  const daySet = new Set(schedules.map(s => s.day_of_week))

  // 충분한 범위로 휴원 조회 (MAX_DAYS 이내)
  const startDate = input.periodStartDate
  const farEndDate = formatDate(addDays(parseDate(startDate), MAX_DAYS))
  const closureMap = await getClosureMapForClass(input.classId, startDate, farEndDate)

  let currentDate = parseDate(startDate)
  let daysChecked = 0
  let billableCount = 0
  let closureDays = 0
  const sessions: GeneratedSession[] = []

  while (billableCount < input.targetSessionCount && daysChecked < MAX_DAYS) {
    daysChecked++
    const dayKr = DAY_OF_WEEK_KR[currentDate.getDay()]

    if (daySet.has(dayKr)) {
      const dateStr = formatDate(currentDate)
      const closure = closureMap.get(dateStr)

      if (closure) {
        sessions.push({
          date: dateStr,
          dayOfWeek: dayKr,
          status: 'closure',
          closureId: closure.id,
          closureReason: closure.reason ?? undefined,
        })
        closureDays++
      } else {
        sessions.push({
          date: dateStr,
          dayOfWeek: dayKr,
          status: 'scheduled',
        })
        billableCount++
      }
    }

    currentDate = addDays(currentDate, 1)
  }

  if (billableCount < input.targetSessionCount) {
    throw new Error(
      `목표 회차(${input.targetSessionCount})를 달성할 수 없습니다. ` +
      `${MAX_DAYS}일 동안 ${billableCount}회만 가능합니다. ` +
      `휴원일이 너무 많거나 수업 요일이 잘못 설정되었는지 확인하세요.`
    )
  }

  const periodEndDate = sessions[sessions.length - 1].date

  // per_session_fee는 반의 monthly_fee / sessions_per_month에서 가져옴
  const supabase = createClient()
  const { data: classData } = await supabase
    .from('classes')
    .select('monthly_fee, sessions_per_month')
    .eq('id', input.classId)
    .single()

  const monthlyFee = classData?.monthly_fee ?? 0
  const sessionsPerMonth = classData?.sessions_per_month ?? input.targetSessionCount
  const perSessionFee = sessionsPerMonth > 0
    ? Math.round(monthlyFee / sessionsPerMonth)
    : 0
  const calculatedAmount = billableCount * perSessionFee

  return {
    sessions,
    periodEndDate,
    closureDays,
    billableCount,
    perSessionFee,
    calculatedAmount,
  }
}

/**
 * 수강료 + 세션 동시 생성
 */
export async function createSessionsForTuition(
  tuitionFeeId: string,
  sessions: GeneratedSession[]
): Promise<TuitionSession[]> {
  const supabase = createClient()

  const inserts: SessionCreateInput[] = sessions.map((s, i) => ({
    tuition_fee_id: tuitionFeeId,
    session_number: i + 1,
    session_date: s.date,
    status: s.status === 'closure' ? 'closure' : 'scheduled',
    closure_id: s.closureId ?? null,
  }))

  const { data, error } = await supabase
    .from('tuition_sessions')
    .insert(inserts)
    .select()

  if (error) throw error
  return (data ?? []) as unknown as TuitionSession[]
}

/**
 * 세션 목록 조회
 */
export async function getSessionsForTuition(
  tuitionFeeId: string
): Promise<TuitionSession[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('tuition_sessions')
    .select('*')
    .eq('tuition_fee_id', tuitionFeeId)
    .order('session_number', { ascending: true })

  if (error) throw error
  return (data ?? []) as unknown as TuitionSession[]
}

/**
 * 대체 세션 추가 (긴급 휴원 후 보충 수업 등)
 */
export async function addReplacementSession(
  tuitionFeeId: string,
  date: string,
  originalSessionId: string
): Promise<TuitionSession> {
  const supabase = createClient()

  // 현재 최대 session_number 조회
  const { data: maxSession } = await supabase
    .from('tuition_sessions')
    .select('session_number')
    .eq('tuition_fee_id', tuitionFeeId)
    .order('session_number', { ascending: false })
    .limit(1)
    .single()

  const nextNumber = (maxSession?.session_number ?? 0) + 1

  const { data, error } = await supabase
    .from('tuition_sessions')
    .insert({
      tuition_fee_id: tuitionFeeId,
      session_number: nextNumber,
      session_date: date,
      status: 'scheduled',
      original_session_id: originalSessionId,
    })
    .select()
    .single()

  if (error) throw error
  return data as unknown as TuitionSession
}

/**
 * 세션 취소 + 금액 재계산
 */
export async function cancelSession(sessionId: string): Promise<void> {
  const supabase = createClient()

  const { data: session, error: fetchError } = await supabase
    .from('tuition_sessions')
    .select('tuition_fee_id')
    .eq('id', sessionId)
    .single()

  if (fetchError || !session) throw new Error('세션을 찾을 수 없습니다.')

  await supabase
    .from('tuition_sessions')
    .update({ status: 'cancelled' })
    .eq('id', sessionId)

  await recalculateTuitionAmount(session.tuition_fee_id)
}

/**
 * 세션 이월 처리 (보강 불가 → 다음달 차감)
 */
export async function markCarryover(
  sessionId: string,
  reason: string
): Promise<void> {
  const supabase = createClient()

  const { data: session, error: fetchError } = await supabase
    .from('tuition_sessions')
    .select('tuition_fee_id')
    .eq('id', sessionId)
    .single()

  if (fetchError || !session) throw new Error('세션을 찾을 수 없습니다.')

  // 1. 세션 상태 → carryover
  await supabase
    .from('tuition_sessions')
    .update({ status: 'carryover', note: reason })
    .eq('id', sessionId)

  // 2. tuition_fees.carryover_to_next += 1 (원자적)
  await supabase.rpc('increment_carryover_to_next', {
    p_tuition_fee_id: session.tuition_fee_id,
  })

  // 3. 금액 재계산
  await recalculateTuitionAmount(session.tuition_fee_id)
}

/**
 * 세션 수 기반 금액 재계산
 *
 * 청구 대상: attended, scheduled, absent(보강 예정), makeup
 * 비청구: carryover(이월), cancelled(취소), closure(휴원)
 */
export async function recalculateTuitionAmount(
  tuitionFeeId: string
): Promise<void> {
  const supabase = createClient()

  const { data: sessions } = await supabase
    .from('tuition_sessions')
    .select('status')
    .eq('tuition_fee_id', tuitionFeeId)

  const nonBillable: TuitionSessionStatus[] = ['carryover', 'cancelled', 'closure']
  const billableCount = (sessions ?? []).filter(
    s => !nonBillable.includes(s.status as TuitionSessionStatus)
  ).length

  const { data: tuition } = await supabase
    .from('tuition_fees')
    .select('per_session_fee, carryover_from_prev')
    .eq('id', tuitionFeeId)
    .single()

  if (!tuition?.per_session_fee) return

  const carryoverFromPrev = tuition.carryover_from_prev ?? 0
  const effectiveBillable = Math.max(0, billableCount - carryoverFromPrev)
  const newAmount = effectiveBillable * tuition.per_session_fee

  await supabase
    .from('tuition_fees')
    .update({
      amount: newAmount,
      sessions_count: billableCount,
    })
    .eq('id', tuitionFeeId)
}

/**
 * 긴급 휴원 → 해당 날짜의 세션들을 closure 상태로 변경
 */
export async function applyClosureToSessions(
  closureId: string,
  date: string,
  classId?: string
): Promise<number> {
  const supabase = createClient()

  // 해당 날짜의 scheduled 세션들 찾기
  let query = supabase
    .from('tuition_sessions')
    .select('id, tuition_fee_id, tuition_fees!inner(class_id)')
    .eq('session_date', date)
    .eq('status', 'scheduled')

  if (classId) {
    query = query.eq('tuition_fees.class_id', classId)
  }

  const { data: sessions, error } = await query
  if (error) throw error
  if (!sessions || sessions.length === 0) return 0

  const sessionIds = sessions.map(s => s.id)

  await supabase
    .from('tuition_sessions')
    .update({ status: 'closure', closure_id: closureId })
    .in('id', sessionIds)

  // 영향받은 수강료 금액 재계산
  const feeIds = [...new Set(sessions.map(s => s.tuition_fee_id))]
  for (const feeId of feeIds) {
    await recalculateTuitionAmount(feeId)
  }

  return sessionIds.length
}

/**
 * 휴원 삭제 시 세션 복원 (closure → scheduled)
 */
export async function restoreSessionsFromClosure(
  closureId: string
): Promise<number> {
  const supabase = createClient()

  const { data: sessions, error } = await supabase
    .from('tuition_sessions')
    .select('id, tuition_fee_id')
    .eq('closure_id', closureId)
    .eq('status', 'closure')

  if (error) throw error
  if (!sessions || sessions.length === 0) return 0

  const sessionIds = sessions.map(s => s.id)

  await supabase
    .from('tuition_sessions')
    .update({ status: 'scheduled', closure_id: null })
    .in('id', sessionIds)

  const feeIds = [...new Set(sessions.map(s => s.tuition_fee_id))]
  for (const feeId of feeIds) {
    await recalculateTuitionAmount(feeId)
  }

  return sessionIds.length
}

/**
 * 같은 요일 반 종료일 정렬
 *
 * ±7일 이내에 동일 요일 반이 있으면 그 종료일에 맞춤
 */
export async function alignEndDateWithSameScheduleClasses(
  classId: string,
  calculatedEndDate: string
): Promise<string> {
  const supabase = createClient()

  const schedules = await getClassSchedules(classId)
  const daySet = new Set(schedules.map(s => s.day_of_week))

  // 같은 요일을 공유하는 다른 활성 반 조회
  const { data: allClasses } = await supabase
    .from('classes')
    .select('id, class_schedules(day_of_week)')
    .eq('is_active', true)
    .neq('id', classId)

  const sameScheduleClassIds = (allClasses ?? [])
    .filter(cls =>
      (cls.class_schedules as { day_of_week: string }[])?.some(s => daySet.has(s.day_of_week))
    )
    .map(cls => cls.id)

  if (sameScheduleClassIds.length === 0) return calculatedEndDate

  // 해당 반들의 최근 tuition_fees.period_end_date 조회
  const { data: recentFees } = await supabase
    .from('tuition_fees')
    .select('period_end_date')
    .in('class_id', sameScheduleClassIds)
    .not('period_end_date', 'is', null)
    .order('period_end_date', { ascending: false })
    .limit(5)

  if (!recentFees || recentFees.length === 0) return calculatedEndDate

  const calcDate = parseDate(calculatedEndDate)

  for (const fee of recentFees) {
    if (!fee.period_end_date) continue
    const refDate = parseDate(fee.period_end_date)
    const diffDays = Math.abs(
      (calcDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    if (diffDays <= 7) {
      return fee.period_end_date
    }
  }

  return calculatedEndDate
}

/**
 * 반 학생들 학교 조회 (시험기간 참조용)
 */
export async function getStudentSchoolsForClass(
  classId: string
): Promise<{
  student_id: string
  grade: number | null
  schools: { id: string; name: string; short_name: string | null; school_type: string | null } | null
}[]> {
  const supabase = createClient()

  // 반에 속한 학생 ID 조회
  const { data: classStudents } = await supabase
    .from('class_students')
    .select('student_id')
    .eq('class_id', classId)

  const studentIds = (classStudents ?? [])
    .map(cs => cs.student_id)
    .filter((id): id is string => id !== null)

  if (studentIds.length === 0) return []

  const { data, error } = await supabase
    .from('student_schools')
    .select(`
      student_id,
      grade,
      schools:school_id (id, name, short_name, school_type)
    `)
    .eq('is_current', true)
    .in('student_id', studentIds)

  if (error) throw error
  return (data ?? []) as any
}

/**
 * 반 학생들에게 수강료 + 세션 일괄 생성
 *
 * 각 학생별로:
 * 1. 해당 year/month에 이미 tuition_fee 있는지 확인 (중복 방지)
 * 2. tuition_fees INSERT
 * 3. createSessionsForTuition() 호출
 */
export async function saveTuitionFeesWithSessions(
  classId: string,
  studentIds: string[],
  result: SessionGenerationResult,
  periodStartDate: string
): Promise<{ created: number; skipped: number }> {
  const supabase = createClient()

  const startDate = parseDate(periodStartDate)
  const year = startDate.getFullYear()
  const month = startDate.getMonth() + 1

  // 반/학생 이름 일괄 조회
  const [classRes, studentsRes] = await Promise.all([
    supabase.from('classes').select('name').eq('id', classId).single(),
    supabase.from('students').select('id, name').in('id', studentIds),
  ])

  const className = classRes.data?.name ?? null
  const studentNameMap = new Map(
    (studentsRes.data ?? []).map(s => [s.id, s.name])
  )

  // 이미 존재하는 수강료 확인
  const { data: existing } = await supabase
    .from('tuition_fees')
    .select('student_id')
    .eq('class_id', classId)
    .eq('year', year)
    .eq('month', month)
    .in('student_id', studentIds)

  const existingStudentIds = new Set(
    (existing ?? []).map(e => e.student_id).filter((id): id is string => id !== null)
  )

  let created = 0
  let skipped = 0

  for (const studentId of studentIds) {
    if (existingStudentIds.has(studentId)) {
      skipped++
      continue
    }

    // tuition_fee INSERT
    const { data: fee, error: feeError } = await supabase
      .from('tuition_fees')
      .insert({
        class_id: classId,
        student_id: studentId,
        year,
        month,
        class_type: '정규',
        amount: result.calculatedAmount,
        base_amount: result.calculatedAmount,
        final_amount: result.calculatedAmount,
        sessions_count: result.billableCount,
        per_session_fee: result.perSessionFee,
        period_start_date: periodStartDate,
        period_end_date: result.periodEndDate,
        payment_status: '미납',
        student_name_snapshot: studentNameMap.get(studentId) ?? null,
        class_name_snapshot: className,
      } as any)
      .select('id')
      .single()

    if (feeError) {
      console.error(`학생 ${studentId} 수강료 생성 실패:`, feeError)
      skipped++
      continue
    }

    // 세션 생성
    try {
      await createSessionsForTuition(fee.id, result.sessions)
      created++
    } catch (err) {
      console.error(`학생 ${studentId} 세션 생성 실패:`, err)
      // 수강료는 생성됐지만 세션 생성 실패 → 수강료도 삭제
      await supabase.from('tuition_fees').delete().eq('id', fee.id)
      skipped++
    }
  }

  return { created, skipped }
}

// --- 캘린더 기반 세션 플래너 함수 ---

/**
 * 해당 반의 이전 수강료 만료일 조회
 * billingYear/billingMonth 이전의 가장 최근 period_end_date 반환
 */
export async function getLatestPeriodEndForClass(
  classId: string,
  billingYear: number,
  billingMonth: number
): Promise<string | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('tuition_fees')
    .select('period_end_date, year, month')
    .eq('class_id', classId)
    .not('period_end_date', 'is', null)
    .order('period_end_date', { ascending: false })
    .limit(10)

  if (error || !data) return null

  for (const record of data) {
    if (!record.period_end_date) continue
    const rYear = record.year as number
    const rMonth = record.month as number
    if (rYear < billingYear || (rYear === billingYear && rMonth < billingMonth)) {
      return record.period_end_date
    }
  }

  return null
}

/**
 * 특정 날짜 다음의 첫 수업일 계산
 */
function getNextClassDayAfter(afterDate: string, scheduleDays: string[]): string {
  const daySet = new Set(scheduleDays)
  let current = addDays(parseDate(afterDate), 1)

  for (let i = 0; i < 14; i++) {
    const dayKr = DAY_OF_WEEK_KR[current.getDay()]
    if (daySet.has(dayKr)) {
      return formatDate(current)
    }
    current = addDays(current, 1)
  }

  return formatDate(addDays(parseDate(afterDate), 1))
}

/**
 * 자동 시작일 계산
 * - 이전 수강료가 있으면: 만료일 다음 수업일
 * - 없으면: 청구월 1일
 */
export async function computeAutoStartDate(
  classId: string,
  billingYear: number,
  billingMonth: number
): Promise<{ startDate: string; previousEndDate: string | null }> {
  const previousEndDate = await getLatestPeriodEndForClass(classId, billingYear, billingMonth)

  if (!previousEndDate) {
    const defaultStart = `${billingYear}-${String(billingMonth).padStart(2, '0')}-01`
    return { startDate: defaultStart, previousEndDate: null }
  }

  const schedules = await getClassSchedules(classId)
  const scheduleDays = schedules.map(s => s.day_of_week)

  if (scheduleDays.length === 0) {
    return {
      startDate: formatDate(addDays(parseDate(previousEndDate), 1)),
      previousEndDate,
    }
  }

  const nextDay = getNextClassDayAfter(previousEndDate, scheduleDays)
  return { startDate: nextDay, previousEndDate }
}

/**
 * 해당 월 내 반 전환 이력 감지
 */
export async function detectTransferForStudent(
  studentId: string,
  year: number,
  month: number
): Promise<TransferInfo | null> {
  const supabase = createClient()

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

  const { data, error } = await supabase
    .from('class_enrollments_history')
    .select(`
      action_date,
      from_class_id,
      to_class_id,
      from_class_name_snapshot,
      to_class_name_snapshot
    `)
    .eq('student_id', studentId)
    .eq('action_type', 'transferred')
    .gte('action_date', startDate + 'T00:00:00+09:00')
    .lte('action_date', endDate + 'T23:59:59+09:00')
    .order('action_date', { ascending: true })
    .limit(1)

  if (error || !data || data.length === 0) return null

  const record = data[0]
  if (!record.from_class_id || !record.to_class_id) return null

  const transferDate = formatDate(new Date(record.action_date))

  return {
    fromClassId: record.from_class_id,
    fromClassName: record.from_class_name_snapshot ?? '이전 반',
    toClassId: record.to_class_id,
    toClassName: record.to_class_name_snapshot ?? '현재 반',
    transferDate,
  }
}

/**
 * 범위 기반 세션 생성 (startDate ~ endDate 사이 수업일)
 *
 * 종료일이 지정된 경우 사용. 회차 무관하게 기간 내 모든 수업일을 세션으로 생성.
 */
export async function generateSessionDatesForRange(
  classId: string,
  startDate: string,
  endDate: string
): Promise<SessionGenerationResult> {
  const schedules = await getClassSchedules(classId)
  if (schedules.length === 0) {
    throw new Error('수업 스케줄이 설정되지 않았습니다.')
  }

  const daySet = new Set(schedules.map(s => s.day_of_week))
  const closureMap = await getClosureMapForClass(classId, startDate, endDate)

  let currentDate = parseDate(startDate)
  const rangeEnd = parseDate(endDate)
  let billableCount = 0
  let closureDays = 0
  const sessions: GeneratedSession[] = []

  while (currentDate <= rangeEnd) {
    const dayKr = DAY_OF_WEEK_KR[currentDate.getDay()]

    if (daySet.has(dayKr)) {
      const dateStr = formatDate(currentDate)
      const closure = closureMap.get(dateStr)

      if (closure) {
        sessions.push({
          date: dateStr,
          dayOfWeek: dayKr,
          status: 'closure',
          closureId: closure.id,
          closureReason: closure.reason ?? undefined,
        })
        closureDays++
      } else {
        sessions.push({
          date: dateStr,
          dayOfWeek: dayKr,
          status: 'scheduled',
        })
        billableCount++
      }
    }

    currentDate = addDays(currentDate, 1)
  }

  const periodEndDate = sessions.length > 0 ? sessions[sessions.length - 1].date : endDate

  const supabase = createClient()
  const { data: classData } = await supabase
    .from('classes')
    .select('monthly_fee, sessions_per_month')
    .eq('id', classId)
    .single()

  const monthlyFee = classData?.monthly_fee ?? 0
  const sessionsPerMonth = classData?.sessions_per_month ?? 8
  const perSessionFee = sessionsPerMonth > 0
    ? Math.round(monthlyFee / sessionsPerMonth)
    : 0
  const calculatedAmount = billableCount * perSessionFee

  return {
    sessions,
    periodEndDate,
    closureDays,
    billableCount,
    perSessionFee,
    calculatedAmount,
  }
}

/**
 * 학생 1명의 월간 세션 플랜 생성
 *
 * endDate가 없으면: sessions_per_month 회차 기반 (기존 동작)
 * endDate가 있으면: startDate~endDate 범위 기반
 */
export async function generateStudentMonthlyPlan(
  studentId: string,
  classId: string,
  className: string,
  billingYear: number,
  billingMonth: number,
  startDate: string,
  colorIndex: number,
  endDate?: string
): Promise<StudentMonthlyPlan> {
  const supabase = createClient()

  // 학생 이름
  const { data: studentData } = await supabase
    .from('students')
    .select('name')
    .eq('id', studentId)
    .single()
  const studentName = studentData?.name ?? '알 수 없음'

  // 세션 생성 (종료일 유무에 따라 분기)
  let result: SessionGenerationResult

  if (endDate) {
    result = await generateSessionDatesForRange(classId, startDate, endDate)
  } else {
    const { data: classData } = await supabase
      .from('classes')
      .select('sessions_per_month')
      .eq('id', classId)
      .single()
    const sessionsPerMonth = classData?.sessions_per_month ?? 8

    result = await generateSessionDates({
      classId,
      periodStartDate: startDate,
      targetSessionCount: sessionsPerMonth,
    })
  }

  // 전환 감지
  const transferInfo = await detectTransferForStudent(studentId, billingYear, billingMonth)

  const schedules = await getClassSchedules(classId)

  const segment: ClassSessionSegment = {
    classId,
    className,
    color: CLASS_COLORS[colorIndex % CLASS_COLORS.length],
    scheduleDays: schedules.map(s => s.day_of_week),
    startDate,
    endDate: result.periodEndDate,
    sessions: result.sessions,
    billableCount: result.billableCount,
    closureDays: result.closureDays,
    perSessionFee: result.perSessionFee,
    calculatedAmount: result.calculatedAmount,
  }

  return {
    studentId,
    studentName,
    year: billingYear,
    month: billingMonth,
    segments: [segment],
    totalBillableCount: result.billableCount,
    totalAmount: result.calculatedAmount,
    transferInfo,
  }
}

/**
 * 학생 세션 플랜 저장 (tuition_fees + tuition_sessions)
 * 수동으로 조정된 세션 목록을 반영
 */
export async function saveStudentMonthlyPlan(
  plan: StudentMonthlyPlan
): Promise<{ created: number; skipped: number }> {
  const supabase = createClient()

  let created = 0
  let skipped = 0

  for (const segment of plan.segments) {
    // 중복 체크
    const { data: existing } = await supabase
      .from('tuition_fees')
      .select('id')
      .eq('class_id', segment.classId)
      .eq('student_id', plan.studentId)
      .eq('year', plan.year)
      .eq('month', plan.month)
      .limit(1)

    if (existing && existing.length > 0) {
      skipped++
      continue
    }

    // 청구 가능 세션만 카운트 (excluded 제외)
    const scheduledSessions = segment.sessions.filter(s => s.status === 'scheduled')
    const billableCount = scheduledSessions.length
    const calculatedAmount = billableCount * segment.perSessionFee

    // 비고: [연,월], [반이름], [회차]
    const note = `${plan.year}년 ${plan.month}월, ${segment.className}, ${billableCount}회`

    // tuition_fee 생성
    const { data: fee, error: feeError } = await supabase
      .from('tuition_fees')
      .insert({
        class_id: segment.classId,
        student_id: plan.studentId,
        year: plan.year,
        month: plan.month,
        class_type: '정규',
        amount: calculatedAmount,
        base_amount: calculatedAmount,
        final_amount: calculatedAmount,
        sessions_count: billableCount,
        per_session_fee: segment.perSessionFee,
        period_start_date: segment.startDate,
        period_end_date: segment.endDate,
        payment_status: '미납',
        student_name_snapshot: plan.studentName,
        class_name_snapshot: segment.className,
        note,
      } as any)
      .select('id')
      .single()

    if (feeError) {
      console.error(`수강료 생성 실패 (${plan.studentName}):`, feeError)
      skipped++
      continue
    }

    // 세션 생성 (closure + scheduled만, excluded는 제외)
    const sessionsToCreate = segment.sessions.filter(s => s.status !== 'excluded')
    try {
      await createSessionsForTuition(fee.id, sessionsToCreate)
      created++
    } catch (err) {
      console.error(`세션 생성 실패 (${plan.studentName}):`, err)
      await supabase.from('tuition_fees').delete().eq('id', fee.id)
      skipped++
    }
  }

  return { created, skipped }
}
