export const CLOSURE_TYPES = ['global', 'class', 'teacher'] as const
export type ClosureType = (typeof CLOSURE_TYPES)[number]

export const CLOSURE_TYPE_LABELS: Record<ClosureType, string> = {
  global: '전체 휴원',
  class: '반별 휴원',
  teacher: '선생님 휴원',
}

export const CLOSURE_TYPE_COLORS: Record<ClosureType, string> = {
  global: 'bg-red-100 text-red-800',
  class: 'bg-purple-100 text-purple-800',
  teacher: 'bg-orange-100 text-orange-800',
}

export const CLOSURE_TYPE_DOT_COLORS: Record<ClosureType, string> = {
  global: 'bg-red-500',
  class: 'bg-purple-500',
  teacher: 'bg-orange-500',
}

export interface AcademyClosure {
  id: string
  closure_date: string
  closure_type: ClosureType
  class_id: string | null
  teacher_id: string | null
  reason: string | null
  is_emergency: boolean
  calendar_event_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  classes?: { name: string } | null
  employees?: { name: string } | null
}

export interface ClosureFormData {
  closure_type: ClosureType
  dates: string[]
  class_ids?: string[]
  teacher_id?: string
  reason?: string
  is_emergency?: boolean
}
