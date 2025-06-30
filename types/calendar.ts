export interface CalendarEvent {
  id?: string
  title: string
  start_time: string
  end_time: string
  description?: string
  location?: string
  event_type?: string
  google_calendar_id?: string  // Google Calendar 이벤트 ID (밸류인 전용)
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
  }
}