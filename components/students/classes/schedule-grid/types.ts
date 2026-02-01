export interface Schedule {
  id?: string
  class_id: string
  day_of_week: string
  start_time: string
  end_time: string
}

export interface ClassWithSchedule {
  id: string
  name: string
  subject: string
  teacher_id: string | null
  monthly_fee?: number
  schedules?: Schedule[]
}

export interface Teacher {
  id: string
  name: string
  position?: string
}

export interface ScheduleSlot {
  classData: ClassWithSchedule
  schedule: Schedule
  teacher?: Teacher
  dayIndex: number
  startMinutes: number
  endMinutes: number
}

export type SubjectType = '수학' | '수학특강' | '과학' | '과학특강'

export const DAYS = ['월', '화', '수', '목', '금', '토', '일'] as const
export type Day = typeof DAYS[number]

export const SUBJECT_STYLES: Record<SubjectType, string> = {
  '수학': 'schedule-block-math',
  '수학특강': 'schedule-block-math-special',
  '과학': 'schedule-block-science',
  '과학특강': 'schedule-block-science-special',
}

export const SUBJECT_COLORS: Record<SubjectType, { bg: string; text: string; border: string }> = {
  '수학': { bg: 'bg-blue-500', text: 'text-white', border: 'border-blue-600' },
  '수학특강': { bg: 'bg-violet-500', text: 'text-white', border: 'border-violet-600' },
  '과학': { bg: 'bg-emerald-500', text: 'text-white', border: 'border-emerald-600' },
  '과학특강': { bg: 'bg-amber-500', text: 'text-white', border: 'border-amber-600' },
}

// 시간 범위: 09:00 ~ 22:00
export const START_HOUR = 9
export const END_HOUR = 22
export const MINUTES_PER_HOUR = 60
export const TOTAL_MINUTES = (END_HOUR - START_HOUR) * MINUTES_PER_HOUR

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return (hours - START_HOUR) * MINUTES_PER_HOUR + minutes
}

export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / MINUTES_PER_HOUR) + START_HOUR
  const mins = minutes % MINUTES_PER_HOUR
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}
