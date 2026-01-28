import type { CalendarEvent, CalendarEventInput, CalendarEventUpdate, FullCalendarEvent, RecurrenceRule } from '@/types/calendar'
import { expandAllEvents, toFullCalendarEvent } from '@/lib/recurrence'

export const calendarService = {
  /**
   * 모든 캘린더 이벤트 조회
   */
  async getEvents(): Promise<CalendarEvent[]> {
    try {
      const response = await fetch('/api/calendar/events')
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch events')
      }
      
      return result.data || []
    } catch (error) {
      console.error('Failed to fetch events:', error)
      throw error
    }
  },

  /**
   * 새 캘린더 이벤트 생성 (Google Calendar 동기화 포함)
   * makeup_class_id를 포함할 수 있음
   */
  async createEvent(event: CalendarEventInput & { makeup_class_id?: string }): Promise<CalendarEvent> {
    try {
      const response = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create event')
      }
      
      // API는 { data, googleCalendarId } 형태로 반환하므로 data를 반환
      return result.data
    } catch (error) {
      console.error('Failed to create event:', error)
      throw error
    }
  },

  /**
   * 캘린더 이벤트 수정 (Google Calendar 동기화 포함)
   */
  async updateEvent(id: string, event: CalendarEventUpdate): Promise<CalendarEvent> {
    try {
      const response = await fetch(`/api/calendar/events/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update event')
      }
      
      return result.data
    } catch (error) {
      console.error('Failed to update event:', error)
      throw error
    }
  },

  /**
   * 캘린더 이벤트 삭제 (Google Calendar 동기화 포함)
   */
  async deleteEvent(id: string): Promise<void> {
    try {
      const response = await fetch(`/api/calendar/events/${id}`, {
        method: 'DELETE',
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete event')
      }
    } catch (error) {
      console.error('Failed to delete event:', error)
      throw error
    }
  },

  /**
   * 특정 기간의 이벤트 조회
   */
  async getEventsByDateRange(startDate: string, endDate: string): Promise<CalendarEvent[]> {
    try {
      const params = new URLSearchParams({
        startDate,
        endDate
      })
      
      const response = await fetch(`/api/calendar/events?${params}`)
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch events by date range')
      }
      
      return result.data || []
    } catch (error) {
      console.error('Failed to fetch events by date range:', error)
      throw error
    }
  },

  // 카테고리별 색상 정의
  categoryColors: {
    'notice': '#ef4444', // red-500
    'work': '#3b82f6', // blue-500
    'makeup': '#10b981', // emerald-500
    'absence': '#f59e0b', // amber-500
    'entrance_test': '#8b5cf6', // violet-500
    'new_consultation': '#ec4899', // pink-500
    'new_enrollment': '#14b8a6', // teal-500
    'regular_consultation': '#6366f1', // indigo-500
    'school_exam': '#84cc16', // lime-500
    'last_minute_makeup': '#f97316', // orange-500
    'holiday': '#6b7280', // gray-500
  } as Record<string, string>,

  /**
   * Supabase 이벤트를 FullCalendar 형식으로 변환 (반복 일정 확장 포함)
   */
  transformToFullCalendarEvents(events: CalendarEvent[], viewRange?: { start: Date; end: Date }): FullCalendarEvent[] {
    // 뷰 범위가 없으면 현재 월 기준 ±3개월
    const now = new Date()
    const range = viewRange || {
      start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      end: new Date(now.getFullYear(), now.getMonth() + 4, 0),
    }

    // 반복 일정 확장
    const expandedEvents = expandAllEvents(events, range)

    return expandedEvents.map(event => toFullCalendarEvent(event, this.categoryColors))
  },

  /**
   * 반복 일정의 단일 인스턴스만 수정 (아직 미구현 - 추후 필요시)
   */
  async updateSingleInstance(
    originalEventId: string,
    instanceDate: string,
    event: CalendarEventUpdate
  ): Promise<CalendarEvent> {
    // TODO: 개별 인스턴스 수정 시 recurrence_parent_id로 새 이벤트 생성
    throw new Error('Not implemented yet')
  }
}