export const ATTENDANCE_STATUSES = ['pending', 'present', 'late', 'early_leave', 'absent'] as const
export type AttendanceStatus = typeof ATTENDANCE_STATUSES[number]

export const ABSENCE_REASONS = ['sick', 'travel', 'event', 'unauthorized', 'other'] as const
export type AbsenceReason = typeof ABSENCE_REASONS[number]

export const ABSENCE_REASON_LABELS: Record<AbsenceReason, string> = {
  sick: '아픔',
  travel: '여행',
  event: '행사',
  unauthorized: '무단',
  other: '기타',
}

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  pending: '대기',
  present: '출석',
  late: '지각',
  early_leave: '조퇴',
  absent: '결석',
}

export const ATTENDANCE_STATUS_COLORS: Record<AttendanceStatus, string> = {
  pending: 'bg-gray-100 text-gray-800',
  present: 'bg-green-100 text-green-800',
  late: 'bg-yellow-100 text-yellow-800',
  early_leave: 'bg-orange-100 text-orange-800',
  absent: 'bg-red-100 text-red-800',
}

export interface Attendance {
  id: string
  student_id: string
  class_id: string
  attendance_date: string
  check_in_at: string | null
  check_out_at: string | null
  status: AttendanceStatus
  is_makeup: boolean
  makeup_class_id: string | null
  note: string | null
  absence_reason: AbsenceReason | null
  student_name_snapshot: string | null
  class_name_snapshot: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // JOIN
  students?: { name: string } | null
  classes?: { name: string } | null
}

export interface AttendanceCheckInInput {
  student_id: string
  class_id: string
  attendance_date: string // YYYY-MM-DD
  is_makeup?: boolean
  makeup_class_id?: string | null
  check_in_at?: string // ISO timestamp, undefined = now()
  note?: string
}

export interface AttendanceCheckOutInput {
  attendance_id: string
  check_out_at?: string // ISO timestamp, undefined = now()
}

export function isAttended(attendance: Attendance): boolean {
  return ['present', 'late', 'early_leave'].includes(attendance.status)
}

export function requiresMakeup(attendance: Attendance): boolean {
  return attendance.status === 'absent' && !attendance.is_makeup
}

// --- 일괄 등원/하원 타입 ---

export interface BulkCheckInInput {
  student_ids: string[]
  class_id: string
  attendance_date: string
  check_in_at: string // ISO, 전원 동일 시간
}

export interface BulkCheckOutInput {
  attendance_ids: string[]
  check_out_at: string // ISO, 전원 동일 시간
}

export interface BulkResult {
  succeeded: number
  failed: { studentName: string; error: string }[]
}
