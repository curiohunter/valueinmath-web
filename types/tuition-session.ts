export const SESSION_STATUSES = [
  'scheduled', 'attended', 'absent', 'closure', 'cancelled', 'makeup', 'carryover',
] as const
export type TuitionSessionStatus = typeof SESSION_STATUSES[number]

export const SESSION_STATUS_LABELS: Record<TuitionSessionStatus, string> = {
  scheduled: '예정',
  attended: '출석',
  absent: '결석',
  closure: '휴원',
  cancelled: '취소',
  makeup: '보강',
  carryover: '이월',
}

export const SESSION_STATUS_COLORS: Record<TuitionSessionStatus, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  attended: 'bg-green-100 text-green-800',
  absent: 'bg-red-100 text-red-800',
  closure: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-gray-100 text-gray-500',
  makeup: 'bg-purple-100 text-purple-800',
  carryover: 'bg-yellow-100 text-yellow-800',
}

const NON_BILLABLE_STATUSES: TuitionSessionStatus[] = ['carryover', 'cancelled', 'closure']

export interface TuitionSession {
  id: string
  tuition_fee_id: string
  session_number: number
  session_date: string
  status: TuitionSessionStatus
  attendance_id: string | null
  makeup_class_id: string | null
  closure_id: string | null
  original_session_id: string | null
  note: string | null
  created_at: string
  updated_at: string
}

export interface SessionGenerationInput {
  classId: string
  periodStartDate: string
  targetSessionCount: number
}

export interface SessionGenerationResult {
  sessions: GeneratedSession[]
  periodEndDate: string
  closureDays: number
  billableCount: number
  perSessionFee: number
  calculatedAmount: number
}

export interface GeneratedSession {
  date: string
  dayOfWeek: string
  status: 'scheduled' | 'closure'
  closureId?: string
  closureReason?: string
}

export interface SessionCreateInput {
  tuition_fee_id: string
  session_number: number
  session_date: string
  status?: TuitionSessionStatus
  closure_id?: string | null
}

export function isBillable(session: TuitionSession): boolean {
  return !NON_BILLABLE_STATUSES.includes(session.status)
}

export function getBillableCount(sessions: TuitionSession[]): number {
  return sessions.filter(s => !NON_BILLABLE_STATUSES.includes(s.status)).length
}
