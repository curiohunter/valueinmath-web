// 반복 빈도 타입
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

// 반복 규칙 인터페이스
export interface RecurrenceRule {
  freq: RecurrenceFrequency
  interval?: number           // 기본값 1 (매달, 매주 등)
  byDayOfMonth?: number       // 매월 n일 (1-31)
  byDay?: string[]            // 요일 ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
  until?: string              // 종료일 (YYYY-MM-DD)
  count?: number              // 반복 횟수 (until과 함께 사용 불가)
}

export interface CalendarEvent {
  id?: string
  title: string
  start_time: string
  end_time: string
  description?: string
  location?: string
  event_type?: string
  google_calendar_id?: string  // Google Calendar 이벤트 ID (밸류인 전용)
  recurrence_rule?: RecurrenceRule | null  // 반복 규칙
  recurrence_parent_id?: string | null     // 반복 일정에서 분리된 인스턴스의 부모 ID
  created_by?: string
  created_at?: string
  updated_at?: string
}

export interface CalendarEventInput extends Omit<CalendarEvent, 'id' | 'created_by' | 'created_at' | 'updated_at'> {
  // 이벤트 생성 시 사용하는 타입
}

export interface CalendarEventUpdate extends Partial<Omit<CalendarEvent, 'id' | 'created_by' | 'created_at' | 'updated_at'>> {
  // 이벤트 업데이트 시 사용하는 타입
}

// FullCalendar용 이벤트 타입
export interface FullCalendarEvent {
  id: string
  title: string
  start: string
  end?: string
  description?: string
  location?: string
  backgroundColor?: string
  borderColor?: string
  extendedProps?: {
    event_type?: string
    recurrence_rule?: RecurrenceRule | null
    recurrence_parent_id?: string | null
    original_event_id?: string  // 반복 인스턴스의 원본 이벤트 ID
    instance_date?: string      // 반복 인스턴스의 날짜 (YYYY-MM-DD)
  }
}