import { createClient } from '@/lib/supabase/client'
import { calendarService } from '@/services/calendar'
import type { AcademyClosure, ClosureFormData, ClosureType } from '@/types/closure'
import { CLOSURE_TYPE_LABELS } from '@/types/closure'
import {
  applyClosureToSessions,
  restoreSessionsFromClosure,
} from '@/services/tuition-session-service'

function buildClosureTitle(
  closureType: ClosureType,
  reason: string | undefined,
  className?: string,
  teacherName?: string
): string {
  switch (closureType) {
    case 'global':
      return reason ? `전체 휴원: ${reason}` : '전체 휴원'
    case 'class':
      return className
        ? `${className} 휴원${reason ? `: ${reason}` : ''}`
        : '반별 휴원'
    case 'teacher':
      return teacherName
        ? `${teacherName} 선생님 휴원${reason ? `: ${reason}` : ''}`
        : '선생님 휴원'
  }
}

export async function getClosures(
  year: number,
  month: number,
  filters?: { closure_type?: ClosureType; class_id?: string; teacher_id?: string }
): Promise<AcademyClosure[]> {
  const supabase = createClient()

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

  let query = supabase
    .from('academy_closures')
    .select(`
      *,
      classes:class_id (name),
      employees:teacher_id (name)
    `)
    .gte('closure_date', startDate)
    .lte('closure_date', endDate)
    .order('closure_date', { ascending: true })

  if (filters?.closure_type) {
    query = query.eq('closure_type', filters.closure_type)
  }
  if (filters?.class_id) {
    query = query.eq('class_id', filters.class_id)
  }
  if (filters?.teacher_id) {
    query = query.eq('teacher_id', filters.teacher_id)
  }

  const { data, error } = await query

  if (error) throw error
  return (data as unknown as AcademyClosure[]) || []
}

const DAY_OF_WEEK_KR = ['일', '월', '화', '수', '목', '금', '토'] as const

export async function getClosuresForClass(
  classId: string,
  startDate: string,
  endDate: string
): Promise<AcademyClosure[]> {
  const supabase = createClient()

  // 반의 담당 선생님 + 수업 요일 조회
  const [classRes, scheduleRes] = await Promise.all([
    supabase.from('classes').select('teacher_id').eq('id', classId).single(),
    supabase.from('class_schedules').select('day_of_week').eq('class_id', classId),
  ])

  const teacherId = classRes.data?.teacher_id
  const scheduleDays = new Set(
    (scheduleRes.data || []).map((s) => s.day_of_week)
  )

  // 전체 휴원 + 해당 반 휴원 + 담당 선생님 휴원
  let filter = `closure_type.eq.global,and(closure_type.eq.class,class_id.eq.${classId})`
  if (teacherId) {
    filter += `,and(closure_type.eq.teacher,teacher_id.eq.${teacherId})`
  }

  const { data, error } = await supabase
    .from('academy_closures')
    .select('*')
    .gte('closure_date', startDate)
    .lte('closure_date', endDate)
    .or(filter)
    .order('closure_date', { ascending: true })

  if (error) throw error

  // 선생님 휴원은 해당 반의 수업 요일에만 적용
  const filtered = (data || []).filter((closure) => {
    if (closure.closure_type !== 'teacher') return true
    const date = new Date(closure.closure_date + 'T00:00:00+09:00')
    const dayKr = DAY_OF_WEEK_KR[date.getDay()]
    return scheduleDays.has(dayKr)
  })

  return filtered as unknown as AcademyClosure[]
}

export async function createClosures(
  formData: ClosureFormData,
  classNames?: Record<string, string>,
  teacherName?: string
): Promise<AcademyClosure[]> {
  const supabase = createClient()
  const created: AcademyClosure[] = []

  const targets =
    formData.closure_type === 'class' && formData.class_ids
      ? formData.class_ids
      : [null]

  for (const date of formData.dates) {
    for (const targetId of targets) {
      const className = targetId && classNames ? classNames[targetId] : undefined
      const title = buildClosureTitle(
        formData.closure_type,
        formData.reason,
        className,
        teacherName
      )

      const calendarEvent = await calendarService.createEvent({
        title,
        start_time: `${date}T10:00:00+09:00`,
        end_time: `${date}T22:00:00+09:00`,
        event_type: 'holiday',
        description: formData.reason || '',
      })

      const insertData: Record<string, unknown> = {
        closure_date: date,
        closure_type: formData.closure_type,
        reason: formData.reason || null,
        is_emergency: formData.is_emergency || false,
        calendar_event_id: calendarEvent.id,
      }

      if (formData.closure_type === 'class' && targetId) {
        insertData.class_id = targetId
      }
      if (formData.closure_type === 'teacher' && formData.teacher_id) {
        insertData.teacher_id = formData.teacher_id
      }

      const { data, error } = await supabase
        .from('academy_closures')
        .insert(insertData)
        .select(`
          *,
          classes:class_id (name),
          employees:teacher_id (name)
        `)
        .single()

      if (error) throw error
      const closure = data as unknown as AcademyClosure

      // 세션 영향 반영 (예정된 세션 → closure 상태)
      try {
        await applyClosureToSessions(
          closure.id,
          date,
          formData.closure_type === 'class' && targetId ? targetId : undefined
        )
      } catch (sessionError) {
        console.error('세션 반영 실패 (휴원은 정상 생성됨):', sessionError)
      }

      created.push(closure)
    }
  }

  return created
}

export async function updateClosure(
  id: string,
  updates: { reason?: string; is_emergency?: boolean }
): Promise<AcademyClosure> {
  const supabase = createClient()

  const { data: existing, error: fetchError } = await supabase
    .from('academy_closures')
    .select(`
      *,
      classes:class_id (name),
      employees:teacher_id (name)
    `)
    .eq('id', id)
    .single()

  if (fetchError) throw fetchError

  const closure = existing as unknown as AcademyClosure

  if (closure.calendar_event_id) {
    const title = buildClosureTitle(
      closure.closure_type,
      updates.reason ?? closure.reason ?? undefined,
      closure.classes?.name,
      closure.employees?.name
    )
    await calendarService.updateEvent(closure.calendar_event_id, {
      title,
      description: updates.reason ?? closure.reason ?? '',
    })
  }

  const { data, error } = await supabase
    .from('academy_closures')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      classes:class_id (name),
      employees:teacher_id (name)
    `)
    .single()

  if (error) throw error
  return data as unknown as AcademyClosure
}

export async function deleteClosure(id: string): Promise<void> {
  const supabase = createClient()

  const { data: existing, error: fetchError } = await supabase
    .from('academy_closures')
    .select('calendar_event_id')
    .eq('id', id)
    .single()

  if (fetchError) throw fetchError

  // 세션 복원 (closure → scheduled) - 삭제 전에 실행
  try {
    await restoreSessionsFromClosure(id)
  } catch (sessionError) {
    console.error('세션 복원 실패:', sessionError)
  }

  if (existing?.calendar_event_id) {
    try {
      await calendarService.deleteEvent(existing.calendar_event_id)
    } catch (error) {
      console.error('Failed to delete calendar event:', error)
    }
  }

  const { error } = await supabase
    .from('academy_closures')
    .delete()
    .eq('id', id)

  if (error) throw error
}
