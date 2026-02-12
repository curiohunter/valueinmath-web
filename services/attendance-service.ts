import { createClient } from '@/lib/supabase/client'
import type {
  Attendance,
  AttendanceCheckInInput,
  AttendanceCheckOutInput,
  AttendanceStatus,
  AbsenceReason,
  BulkCheckInInput,
  BulkCheckOutInput,
  BulkResult,
} from '@/types/attendance'

const DAY_OF_WEEK_KR = ['일', '월', '화', '수', '목', '금', '토'] as const
const GRACE_MINUTES = 10

// --- 헬퍼 함수 ---

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function getMinutesFromDate(date: Date): number {
  // KST 기준 시/분 추출
  const kstStr = date.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Seoul',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  })
  const [h, m] = kstStr.split(':').map(Number)
  return h * 60 + m
}

/**
 * 자동 출석 상태 판별
 * - 정규 수업 전용 (보강은 무조건 present)
 * - class_schedules.start_time/end_time 기반
 */
export function determineStatus(
  checkInAt: Date | null,
  checkOutAt: Date | null,
  scheduleStart: string,
  scheduleEnd: string
): AttendanceStatus {
  if (!checkInAt) return 'pending'

  const checkInMinutes = getMinutesFromDate(checkInAt)
  const startMinutes = parseTimeToMinutes(scheduleStart)
  const endMinutes = parseTimeToMinutes(scheduleEnd)

  const isLate = checkInMinutes > startMinutes + GRACE_MINUTES

  if (isLate) return 'late'

  if (checkOutAt) {
    const checkOutMinutes = getMinutesFromDate(checkOutAt)
    const isEarlyLeave = checkOutMinutes < endMinutes - GRACE_MINUTES
    if (isEarlyLeave) return 'early_leave'
  }

  return 'present'
}

/**
 * 해당 날짜의 수업 스케줄 조회
 */
async function getClassScheduleForDate(
  classId: string,
  date: string
): Promise<{ start_time: string; end_time: string } | null> {
  const supabase = createClient()
  const dateObj = new Date(date + 'T00:00:00+09:00')
  const dayKr = DAY_OF_WEEK_KR[dateObj.getDay()]

  const { data } = await supabase
    .from('class_schedules')
    .select('start_time, end_time')
    .eq('class_id', classId)
    .eq('day_of_week', dayKr)
    .maybeSingle()

  if (!data) return null
  return {
    start_time: data.start_time.substring(0, 5),
    end_time: data.end_time.substring(0, 5),
  }
}

/**
 * 등원 기록 (upsert 패턴, 동시성 안전)
 *
 * - 정규 수업: 지각 판별 (10분 유예)
 * - 보강: 무조건 출석 (시간 무관)
 */
export async function checkIn(input: AttendanceCheckInInput): Promise<Attendance> {
  const supabase = createClient()
  const checkInTime = input.check_in_at ? new Date(input.check_in_at) : new Date()
  const isMakeup = input.is_makeup ?? false

  let status: AttendanceStatus
  if (isMakeup) {
    status = 'present'
  } else {
    const schedule = await getClassScheduleForDate(input.class_id, input.attendance_date)
    if (!schedule) {
      throw new Error(`${input.attendance_date}는 수업일이 아닙니다.`)
    }
    status = determineStatus(checkInTime, null, schedule.start_time, schedule.end_time)
  }

  // 스냅샷용 이름 조회
  const [studentRes, classRes, employeeRes] = await Promise.all([
    supabase.from('students').select('name').eq('id', input.student_id).single(),
    supabase.from('classes').select('name').eq('id', input.class_id).single(),
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return null
      const { data } = await supabase
        .from('employees')
        .select('id')
        .eq('auth_id', user.id)
        .maybeSingle()
      return data
    }),
  ])

  try {
    const { data, error } = await supabase
      .from('attendances')
      .insert({
        student_id: input.student_id,
        class_id: input.class_id,
        attendance_date: input.attendance_date,
        check_in_at: checkInTime.toISOString(),
        status,
        is_makeup: isMakeup,
        makeup_class_id: input.makeup_class_id ?? null,
        note: input.note ?? null,
        student_name_snapshot: studentRes.data?.name ?? null,
        class_name_snapshot: classRes.data?.name ?? null,
        created_by: employeeRes?.id ?? null,
      })
      .select()
      .single()

    if (error) throw error

    // 정규 수업만 세션 연결
    if (!isMakeup) {
      await supabase.rpc('link_attendance_to_session', {
        p_attendance_id: data.id,
        p_student_id: data.student_id,
        p_class_id: data.class_id,
        p_date: data.attendance_date,
        p_status: data.status,
      })
    }

    return data as unknown as Attendance
  } catch (error: unknown) {
    const pgError = error as { code?: string }
    // unique_violation → 이미 등원 기록 있음 → 기존 레코드 반환
    if (pgError.code === '23505') {
      const { data } = await supabase
        .from('attendances')
        .select()
        .match({
          student_id: input.student_id,
          class_id: input.class_id,
          attendance_date: input.attendance_date,
          is_makeup: isMakeup,
        })
        .single()
      return data as unknown as Attendance
    }
    throw error
  }
}

/**
 * 하원 기록 + 조퇴 자동 판별
 *
 * - 정규 수업: 조퇴 판별 (10분 유예)
 * - 보강: 시간 기록만, 상태 변경 없음
 */
export async function checkOut(input: AttendanceCheckOutInput): Promise<Attendance> {
  const supabase = createClient()

  const { data: attendance, error: fetchError } = await supabase
    .from('attendances')
    .select()
    .eq('id', input.attendance_id)
    .single()

  if (fetchError || !attendance) {
    throw new Error('출석 기록을 찾을 수 없습니다.')
  }

  const checkOutTime = input.check_out_at ? new Date(input.check_out_at) : new Date()
  let newStatus = attendance.status

  if (!attendance.is_makeup && attendance.check_in_at) {
    const schedule = await getClassScheduleForDate(
      attendance.class_id,
      attendance.attendance_date
    )
    if (schedule) {
      newStatus = determineStatus(
        new Date(attendance.check_in_at),
        checkOutTime,
        schedule.start_time,
        schedule.end_time
      )
    }
  }

  const { data, error } = await supabase
    .from('attendances')
    .update({
      check_out_at: checkOutTime.toISOString(),
      status: newStatus,
    })
    .eq('id', input.attendance_id)
    .select()
    .single()

  if (error) throw error

  // 정규 수업만 세션 상태 갱신
  if (!attendance.is_makeup) {
    await supabase.rpc('link_attendance_to_session', {
      p_attendance_id: data.id,
      p_student_id: data.student_id,
      p_class_id: data.class_id,
      p_date: data.attendance_date,
      p_status: data.status,
    })
  }

  return data as unknown as Attendance
}

/**
 * 결석 처리
 */
export async function markAbsent(
  studentId: string,
  classId: string,
  date: string,
  note?: string,
  absenceReason?: AbsenceReason | null
): Promise<Attendance> {
  const supabase = createClient()

  const [studentRes, classRes, employeeRes] = await Promise.all([
    supabase.from('students').select('name').eq('id', studentId).single(),
    supabase.from('classes').select('name').eq('id', classId).single(),
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return null
      const { data } = await supabase
        .from('employees')
        .select('id')
        .eq('auth_id', user.id)
        .maybeSingle()
      return data
    }),
  ])

  try {
    const { data, error } = await supabase
      .from('attendances')
      .insert({
        student_id: studentId,
        class_id: classId,
        attendance_date: date,
        status: 'absent',
        is_makeup: false,
        note: note ?? null,
        absence_reason: absenceReason ?? null,
        student_name_snapshot: studentRes.data?.name ?? null,
        class_name_snapshot: classRes.data?.name ?? null,
        created_by: employeeRes?.id ?? null,
      })
      .select()
      .single()

    if (error) throw error

    await supabase.rpc('link_attendance_to_session', {
      p_attendance_id: data.id,
      p_student_id: data.student_id,
      p_class_id: data.class_id,
      p_date: data.attendance_date,
      p_status: 'absent',
    })

    return data as unknown as Attendance
  } catch (error: unknown) {
    const pgError = error as { code?: string }
    if (pgError.code === '23505') {
      // 이미 출석 기록 있음 → 결석으로 업데이트
      const { data: existing } = await supabase
        .from('attendances')
        .select()
        .match({
          student_id: studentId,
          class_id: classId,
          attendance_date: date,
          is_makeup: false,
        })
        .single()

      if (existing) {
        const { data: updated } = await supabase
          .from('attendances')
          .update({
            status: 'absent',
            note: note ?? existing.note,
            absence_reason: absenceReason ?? null,
          })
          .eq('id', existing.id)
          .select()
          .single()

        if (updated) {
          await supabase.rpc('link_attendance_to_session', {
            p_attendance_id: updated.id,
            p_student_id: updated.student_id,
            p_class_id: updated.class_id,
            p_date: updated.attendance_date,
            p_status: 'absent',
          })
        }

        return (updated ?? existing) as unknown as Attendance
      }
    }
    throw error
  }
}

/**
 * 반별 일일 출석 조회
 */
export async function getAttendances(
  classId: string,
  date: string
): Promise<Attendance[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('attendances')
    .select(`
      *,
      students:student_id (name),
      classes:class_id (name)
    `)
    .eq('class_id', classId)
    .eq('attendance_date', date)
    .order('student_name_snapshot', { ascending: true })

  if (error) throw error
  return (data ?? []) as unknown as Attendance[]
}

/**
 * 날짜별 전체 보강 출석 조회 (반 무관)
 */
export async function getMakeupAttendances(date: string): Promise<Attendance[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('attendances')
    .select(`*, students:student_id (name), classes:class_id (name)`)
    .eq('attendance_date', date)
    .eq('is_makeup', true)
    .order('student_name_snapshot', { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as Attendance[]
}

/**
 * 학생별 기간 출석 조회
 */
export async function getStudentAttendances(
  studentId: string,
  startDate: string,
  endDate: string
): Promise<Attendance[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('attendances')
    .select(`
      *,
      students:student_id (name),
      classes:class_id (name)
    `)
    .eq('student_id', studentId)
    .gte('attendance_date', startDate)
    .lte('attendance_date', endDate)
    .order('attendance_date', { ascending: false })

  if (error) throw error
  return (data ?? []) as unknown as Attendance[]
}

/**
 * 출석 수정 (시간 수정, 상태 수정 등)
 */
export async function updateAttendance(
  id: string,
  updates: Partial<Pick<Attendance, 'check_in_at' | 'check_out_at' | 'status' | 'note'>>
): Promise<Attendance> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('attendances')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  // 세션 상태도 갱신
  if (data && !data.is_makeup && updates.status) {
    await supabase.rpc('link_attendance_to_session', {
      p_attendance_id: data.id,
      p_student_id: data.student_id,
      p_class_id: data.class_id,
      p_date: data.attendance_date,
      p_status: data.status,
    })
  }

  return data as unknown as Attendance
}

/**
 * 시간 수정 + 상태 자동 재계산
 *
 * 등원/하원 시간 수정 시 상태를 자동으로 다시 판별.
 * absent → 다른 상태로 바뀌면 absence_reason 자동 클리어.
 */
export async function updateAttendanceWithAutoStatus(
  id: string,
  updates: { check_in_at?: string; check_out_at?: string }
): Promise<Attendance> {
  const supabase = createClient()

  const { data: attendance, error: fetchError } = await supabase
    .from('attendances')
    .select()
    .eq('id', id)
    .single()

  if (fetchError || !attendance) {
    throw new Error('출석 기록을 찾을 수 없습니다.')
  }

  const newCheckIn = updates.check_in_at ?? attendance.check_in_at
  const newCheckOut = updates.check_out_at ?? attendance.check_out_at

  let newStatus: AttendanceStatus = attendance.status
  if (!attendance.is_makeup && newCheckIn) {
    const schedule = await getClassScheduleForDate(
      attendance.class_id,
      attendance.attendance_date
    )
    if (schedule) {
      newStatus = determineStatus(
        new Date(newCheckIn),
        newCheckOut ? new Date(newCheckOut) : null,
        schedule.start_time,
        schedule.end_time
      )
    }
  }

  // absent → 다른 상태로 변경 시 absence_reason 클리어
  const clearAbsenceReason =
    attendance.status === 'absent' && newStatus !== 'absent'

  const { data, error } = await supabase
    .from('attendances')
    .update({
      ...(updates.check_in_at !== undefined && { check_in_at: updates.check_in_at }),
      ...(updates.check_out_at !== undefined && { check_out_at: updates.check_out_at }),
      status: newStatus,
      ...(clearAbsenceReason && { absence_reason: null }),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  // 정규 수업만 세션 상태 갱신
  if (!attendance.is_makeup) {
    await supabase.rpc('link_attendance_to_session', {
      p_attendance_id: data.id,
      p_student_id: data.student_id,
      p_class_id: data.class_id,
      p_date: data.attendance_date,
      p_status: data.status,
    })
  }

  return data as unknown as Attendance
}

/**
 * 결석 → 출석 복귀
 *
 * 결석 처리된 학생이 뒤늦게 등원한 경우 사용.
 * check_in_at 설정 → 상태 자동 재계산 → absence_reason 클리어.
 */
export async function revertAbsent(
  id: string,
  checkInAt: string
): Promise<Attendance> {
  return updateAttendanceWithAutoStatus(id, { check_in_at: checkInAt })
}

// --- 일괄 등원/하원 ---

/**
 * 일괄 등원
 *
 * 같은 반, 같은 날의 여러 학생을 동일 시간으로 한번에 등원 처리.
 * 공통 데이터(스케줄, 반 이름, 직원 ID)는 1번만 조회하고
 * 학생별 INSERT는 Promise.allSettled로 병렬 처리.
 */
export async function bulkCheckIn(input: BulkCheckInInput): Promise<BulkResult> {
  const supabase = createClient()
  const checkInTime = new Date(input.check_in_at)

  // 1. 공통 데이터 1번 조회
  const [schedule, classRes, employeeRes, studentsRes] = await Promise.all([
    getClassScheduleForDate(input.class_id, input.attendance_date),
    supabase.from('classes').select('name').eq('id', input.class_id).single(),
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return null
      const { data } = await supabase
        .from('employees')
        .select('id')
        .eq('auth_id', user.id)
        .maybeSingle()
      return data
    }),
    supabase
      .from('students')
      .select('id, name')
      .in('id', input.student_ids),
  ])

  if (!schedule) {
    throw new Error(`${input.attendance_date}는 수업일이 아닙니다.`)
  }

  const status = determineStatus(checkInTime, null, schedule.start_time, schedule.end_time)
  const classNameSnapshot = classRes.data?.name ?? null
  const createdBy = employeeRes?.id ?? null
  const studentNameMap = new Map(
    (studentsRes.data ?? []).map((s) => [s.id, s.name as string])
  )

  // 2. 학생별 INSERT 병렬 처리
  const results = await Promise.allSettled(
    input.student_ids.map(async (studentId) => {
      const studentName = studentNameMap.get(studentId) ?? null

      try {
        const { data, error } = await supabase
          .from('attendances')
          .insert({
            student_id: studentId,
            class_id: input.class_id,
            attendance_date: input.attendance_date,
            check_in_at: checkInTime.toISOString(),
            status,
            is_makeup: false,
            student_name_snapshot: studentName,
            class_name_snapshot: classNameSnapshot,
            created_by: createdBy,
          })
          .select()
          .single()

        if (error) throw error

        // 세션 연결
        await supabase.rpc('link_attendance_to_session', {
          p_attendance_id: data.id,
          p_student_id: data.student_id,
          p_class_id: data.class_id,
          p_date: data.attendance_date,
          p_status: data.status,
        })

        return { studentId, studentName }
      } catch (error: unknown) {
        const pgError = error as { code?: string }
        // unique_violation → 이미 등원됨 → 성공으로 처리
        if (pgError.code === '23505') {
          return { studentId, studentName, alreadyCheckedIn: true }
        }
        throw { studentName: studentName ?? studentId, error }
      }
    })
  )

  // 3. 결과 집계
  let succeeded = 0
  const failed: { studentName: string; error: string }[] = []

  for (const result of results) {
    if (result.status === 'fulfilled') {
      succeeded++
    } else {
      const reason = result.reason as { studentName: string; error: unknown }
      const errMsg = reason.error instanceof Error
        ? reason.error.message
        : '등원 처리 실패'
      failed.push({ studentName: reason.studentName, error: errMsg })
    }
  }

  return { succeeded, failed }
}

/**
 * 일괄 하원
 *
 * 여러 출석 레코드를 동일 시간으로 한번에 하원 처리.
 * 스케줄은 같은 반이므로 1번만 조회.
 */
export async function bulkCheckOut(input: BulkCheckOutInput): Promise<BulkResult> {
  const supabase = createClient()
  const checkOutTime = new Date(input.check_out_at)

  // 1. 대상 출석 레코드 전체 조회
  const { data: attendanceList, error: fetchError } = await supabase
    .from('attendances')
    .select('*, students:student_id (name)')
    .in('id', input.attendance_ids)

  if (fetchError || !attendanceList?.length) {
    throw new Error('출석 기록을 찾을 수 없습니다.')
  }

  // 2. 스케줄 1번 조회 (같은 반이므로)
  const firstAtt = attendanceList[0]
  const schedule = await getClassScheduleForDate(
    firstAtt.class_id,
    firstAtt.attendance_date
  )

  // 3. 학생별 UPDATE 병렬 처리
  const results = await Promise.allSettled(
    attendanceList.map(async (att) => {
      const studentName =
        att.student_name_snapshot
        ?? (att.students as { name: string } | null)?.name
        ?? '알 수 없음'

      let newStatus: AttendanceStatus = att.status
      if (!att.is_makeup && att.check_in_at && schedule) {
        newStatus = determineStatus(
          new Date(att.check_in_at),
          checkOutTime,
          schedule.start_time,
          schedule.end_time
        )
      }

      const { data, error } = await supabase
        .from('attendances')
        .update({
          check_out_at: checkOutTime.toISOString(),
          status: newStatus,
        })
        .eq('id', att.id)
        .select()
        .single()

      if (error) throw { studentName, error }

      // 세션 상태 갱신
      if (!att.is_makeup) {
        await supabase.rpc('link_attendance_to_session', {
          p_attendance_id: data.id,
          p_student_id: data.student_id,
          p_class_id: data.class_id,
          p_date: data.attendance_date,
          p_status: data.status,
        })
      }

      return { studentName }
    })
  )

  // 4. 결과 집계
  let succeeded = 0
  const failed: { studentName: string; error: string }[] = []

  for (const result of results) {
    if (result.status === 'fulfilled') {
      succeeded++
    } else {
      const reason = result.reason as { studentName: string; error: unknown }
      const errMsg = reason.error instanceof Error
        ? reason.error.message
        : '하원 처리 실패'
      failed.push({ studentName: reason.studentName, error: errMsg })
    }
  }

  return { succeeded, failed }
}
