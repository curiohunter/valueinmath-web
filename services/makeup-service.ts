import { createClient } from '@/lib/supabase/client'
import { checkIn, checkOut } from '@/services/attendance-service'
import { calendarService } from '@/services/calendar'
import type { Attendance } from '@/types/attendance'

// --- 타입 ---

export interface MakeupClassWithStudent {
  id: string
  student_id: string
  class_id: string | null
  makeup_type: 'absence' | 'additional'
  status: 'scheduled' | 'completed' | 'cancelled'
  makeup_date: string | null
  absence_date: string | null
  absence_reason: string | null
  start_time: string | null
  end_time: string | null
  student_name_snapshot: string | null
  class_name_snapshot: string | null
  content: string | null
  notes: string | null
  makeup_calendar_event_id: string | null
  students?: { name: string } | null
  classes?: { name: string } | null
}

// --- 헬퍼 ---

function extractKSTTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Seoul',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

// --- 조회 ---

/**
 * 오늘 보강 예정 학생 (makeup_date = today, status = 'scheduled')
 */
export async function getTodayScheduledMakeups(
  date: string
): Promise<MakeupClassWithStudent[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('makeup_classes')
    .select(`
      *,
      students:student_id (name),
      classes:class_id (name)
    `)
    .eq('makeup_date', date)
    .eq('status', 'scheduled')
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as unknown as MakeupClassWithStudent[]
}

/**
 * 보강 미정 학생 (makeup_date IS NULL, status = 'scheduled')
 */
export async function getPendingMakeups(): Promise<MakeupClassWithStudent[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('makeup_classes')
    .select(`
      *,
      students:student_id (name),
      classes:class_id (name)
    `)
    .is('makeup_date', null)
    .eq('status', 'scheduled')
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as unknown as MakeupClassWithStudent[]
}

/**
 * 이미 등원 완료 여부 확인
 */
export async function hasExistingAttendance(
  makeupClassId: string
): Promise<boolean> {
  const supabase = createClient()

  const { count, error } = await supabase
    .from('attendances')
    .select('id', { count: 'exact', head: true })
    .eq('makeup_class_id', makeupClassId)

  if (error) throw error
  return (count ?? 0) > 0
}

// --- 결석 → 보강 자동 생성 ---

/**
 * 결석 처리 시 makeup_classes 레코드 자동 생성
 * (보강관리 페이지의 수동 생성과 동일한 데이터 구조)
 */
export async function createMakeupFromAbsence(input: {
  studentId: string
  classId: string
  absenceDate: string
  absenceReason?: string | null
  studentName: string
  className: string
}): Promise<MakeupClassWithStudent | null> {
  const supabase = createClient()

  // 중복 체크: 같은 학생 + 같은 결석일에 이미 보강 레코드가 있는지
  const { data: existing } = await supabase
    .from('makeup_classes')
    .select('id')
    .eq('student_id', input.studentId)
    .eq('absence_date', input.absenceDate)
    .eq('makeup_type', 'absence')
    .neq('status', 'cancelled')
    .maybeSingle()

  if (existing) {
    // 이미 존재하면 중복 생성하지 않음
    return null
  }

  const { data, error } = await supabase
    .from('makeup_classes')
    .insert({
      student_id: input.studentId,
      class_id: input.classId,
      makeup_type: 'absence',
      status: 'scheduled',
      absence_date: input.absenceDate,
      absence_reason: input.absenceReason ?? null,
      student_name_snapshot: input.studentName,
      class_name_snapshot: input.className,
    })
    .select(`
      *,
      students:student_id (name),
      classes:class_id (name)
    `)
    .single()

  if (error) {
    console.error('보강 자동 생성 실패:', error)
    return null
  }

  return data as unknown as MakeupClassWithStudent
}

// --- 양방향 연동 삭제 ---

/**
 * 결석 attendance에 연결된 makeup_classes 찾기
 * (student_id + absence_date 매칭)
 */
export async function findLinkedMakeup(
  studentId: string,
  absenceDate: string
): Promise<{ id: string; student_name_snapshot: string | null } | null> {
  const supabase = createClient()

  const { data } = await supabase
    .from('makeup_classes')
    .select('id, student_name_snapshot')
    .eq('student_id', studentId)
    .eq('absence_date', absenceDate)
    .eq('makeup_type', 'absence')
    .neq('status', 'cancelled')
    .maybeSingle()

  return data
}

/**
 * makeup_classes에 연결된 결석 attendance 찾기
 * (student_id + attendance_date = absence_date, status = absent)
 */
export async function findLinkedAbsence(
  studentId: string,
  absenceDate: string
): Promise<{ id: string } | null> {
  const supabase = createClient()

  const { data } = await supabase
    .from('attendances')
    .select('id')
    .eq('student_id', studentId)
    .eq('attendance_date', absenceDate)
    .eq('status', 'absent')
    .eq('is_makeup', false)
    .maybeSingle()

  return data
}

/**
 * makeup_classes 레코드 삭제
 * - 연결된 보강 출석(attendances) 먼저 삭제 (FK SET NULL 방지)
 * - 캘린더 이벤트 정리
 */
export async function deleteMakeupClass(makeupClassId: string): Promise<void> {
  const supabase = createClient()

  // 1. 연결된 보강 출석 삭제 (FK가 SET NULL이라 먼저 처리)
  await supabase
    .from('attendances')
    .delete()
    .eq('makeup_class_id', makeupClassId)

  // 2. 캘린더 이벤트 정리
  const { data: makeup } = await supabase
    .from('makeup_classes')
    .select('absence_calendar_event_id, makeup_calendar_event_id')
    .eq('id', makeupClassId)
    .single()

  if (makeup) {
    const eventIds = [
      makeup.absence_calendar_event_id,
      makeup.makeup_calendar_event_id,
    ].filter(Boolean) as string[]

    for (const eventId of eventIds) {
      try {
        await calendarService.deleteEvent(eventId)
      } catch {
        // 이벤트가 이미 삭제되었을 수 있음
      }
    }
  }

  // 3. makeup_classes 삭제
  const { error } = await supabase
    .from('makeup_classes')
    .delete()
    .eq('id', makeupClassId)

  if (error) throw error
}

/**
 * attendance 레코드 삭제
 */
export async function deleteAttendance(attendanceId: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('attendances')
    .delete()
    .eq('id', attendanceId)

  if (error) throw error
}

// --- 등원 ---

/**
 * 기존 makeup_classes 레코드 연결 등원 (탭1: 예정, 탭2: 미정)
 * class_id는 makeup_classes.class_id (원래 반)를 사용
 */
export async function makeupCheckIn(input: {
  makeupClassId: string
  date: string
}): Promise<{ attendance: Attendance; makeupClass: MakeupClassWithStudent }> {
  const supabase = createClient()

  // 1. makeup_class 조회
  const { data: makeupClass, error: fetchError } = await supabase
    .from('makeup_classes')
    .select(`
      *,
      students:student_id (name),
      classes:class_id (name)
    `)
    .eq('id', input.makeupClassId)
    .single()

  if (fetchError || !makeupClass) {
    throw new Error('보강 수업을 찾을 수 없습니다.')
  }

  // 2. 중복 체크
  const alreadyCheckedIn = await hasExistingAttendance(input.makeupClassId)
  if (alreadyCheckedIn) {
    throw new Error('이미 등원 처리된 보강 수업입니다.')
  }

  // 3. 출석 생성 (원래 반 class_id 사용)
  if (!makeupClass.class_id) {
    throw new Error('보강 수업에 원래 반 정보가 없습니다.')
  }
  const attendance = await checkIn({
    student_id: makeupClass.student_id,
    class_id: makeupClass.class_id,
    attendance_date: input.date,
    is_makeup: true,
    makeup_class_id: input.makeupClassId,
  })

  // 4. makeup_classes 업데이트: start_time, makeup_date (null이면)
  const now = new Date()
  const kstTime = extractKSTTime(now)
  const updatePayload: Record<string, unknown> = {
    start_time: kstTime,
    updated_at: now.toISOString(),
  }
  if (!makeupClass.makeup_date) {
    updatePayload.makeup_date = input.date
  }

  const { data: updatedMakeup, error: updateError } = await supabase
    .from('makeup_classes')
    .update(updatePayload)
    .eq('id', input.makeupClassId)
    .select(`
      *,
      students:student_id (name),
      classes:class_id (name)
    `)
    .single()

  if (updateError) {
    console.error('makeup_classes 업데이트 실패:', updateError)
  }

  return {
    attendance,
    makeupClass: (updatedMakeup ?? makeupClass) as unknown as MakeupClassWithStudent,
  }
}

/**
 * 추가 보강 등원 (탭3: 자유 검색)
 * makeup_classes INSERT → checkIn
 */
export async function additionalMakeupCheckIn(input: {
  studentId: string
  classId: string
  date: string
  studentName: string
  className: string
}): Promise<{ attendance: Attendance; makeupClass: MakeupClassWithStudent }> {
  const supabase = createClient()

  const now = new Date()
  const kstTime = extractKSTTime(now)

  // 1. makeup_classes INSERT
  const { data: newMakeup, error: insertError } = await supabase
    .from('makeup_classes')
    .insert({
      student_id: input.studentId,
      class_id: input.classId,
      makeup_type: 'additional',
      status: 'scheduled',
      makeup_date: input.date,
      start_time: kstTime,
      student_name_snapshot: input.studentName,
      class_name_snapshot: input.className,
    })
    .select(`
      *,
      students:student_id (name),
      classes:class_id (name)
    `)
    .single()

  if (insertError || !newMakeup) {
    throw new Error('보강 수업 생성에 실패했습니다.')
  }

  // 2. 출석 생성
  const attendance = await checkIn({
    student_id: input.studentId,
    class_id: input.classId,
    attendance_date: input.date,
    is_makeup: true,
    makeup_class_id: newMakeup.id,
  })

  return {
    attendance,
    makeupClass: newMakeup as unknown as MakeupClassWithStudent,
  }
}

// --- 하원 ---

/**
 * 보강 하원: checkOut → makeup_classes 완료 → 캘린더 이벤트 생성
 */
export async function makeupCheckOut(input: {
  attendanceId: string
}): Promise<{ attendance: Attendance; makeupClass: MakeupClassWithStudent | null }> {
  const supabase = createClient()

  // 1. 하원 처리
  const attendance = await checkOut({ attendance_id: input.attendanceId })

  // 2. makeup_class_id가 없으면 일반 하원으로 처리
  if (!attendance.makeup_class_id) {
    return { attendance, makeupClass: null }
  }

  // 3. makeup_classes 조회
  const { data: makeupClass, error: fetchError } = await supabase
    .from('makeup_classes')
    .select(`
      *,
      students:student_id (name),
      classes:class_id (name)
    `)
    .eq('id', attendance.makeup_class_id)
    .single()

  if (fetchError || !makeupClass) {
    console.error('makeup_classes 조회 실패:', fetchError)
    return { attendance, makeupClass: null }
  }

  // 4. makeup_classes 업데이트: end_time, status = 'completed'
  const now = new Date()
  const kstTime = extractKSTTime(now)

  const { error: updateError } = await supabase
    .from('makeup_classes')
    .update({
      end_time: kstTime,
      status: 'completed',
      updated_at: now.toISOString(),
    })
    .eq('id', attendance.makeup_class_id)

  if (updateError) {
    console.error('makeup_classes 완료 업데이트 실패:', updateError)
  }

  // 5. 캘린더 이벤트 생성
  try {
    const studentName = makeupClass.student_name_snapshot
      ?? (makeupClass.students as { name: string } | null)?.name
      ?? '알 수 없음'

    const typeLabel = makeupClass.makeup_type === 'absence' ? '결석보강' : '추가수업'
    const eventDate = makeupClass.makeup_date ?? attendance.attendance_date

    const calendarEvent = await calendarService.createEvent({
      title: `${studentName} ${typeLabel}`,
      start_time: `${eventDate}T${makeupClass.start_time ?? kstTime}+09:00`,
      end_time: `${eventDate}T${kstTime}+09:00`,
      event_type: 'makeup',
      makeup_class_id: attendance.makeup_class_id,
    })

    // 6. makeup_classes에 캘린더 이벤트 ID 저장
    if (calendarEvent?.id) {
      await supabase
        .from('makeup_classes')
        .update({ makeup_calendar_event_id: calendarEvent.id })
        .eq('id', attendance.makeup_class_id)
    }
  } catch (calError) {
    console.error('캘린더 이벤트 생성 실패 (하원은 정상 처리됨):', calError)
  }

  // 최종 makeup_class 반환
  const { data: finalMakeup } = await supabase
    .from('makeup_classes')
    .select(`
      *,
      students:student_id (name),
      classes:class_id (name)
    `)
    .eq('id', attendance.makeup_class_id)
    .single()

  return {
    attendance,
    makeupClass: (finalMakeup ?? makeupClass) as unknown as MakeupClassWithStudent,
  }
}
