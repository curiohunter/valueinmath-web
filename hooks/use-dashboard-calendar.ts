'use client'

import { useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calendarService } from '@/services/calendar'
import type { EntranceTestData } from '@/components/dashboard/TestModal'

interface UseDashboardCalendarReturn {
  handleCreateCalendarEvent: (test: EntranceTestData) => Promise<boolean>
}

/**
 * 대시보드 캘린더 이벤트를 관리하는 커스텀 훅
 * 입학테스트 일정의 캘린더 등록/수정을 처리합니다.
 */
export function useDashboardCalendar(): UseDashboardCalendarReturn {
  const supabase = createClient()

  const handleCreateCalendarEvent = useCallback(async (test: EntranceTestData): Promise<boolean> => {
    if (!test.test_date) {
      alert('테스트 정보가 없습니다.')
      return false
    }

    try {
      // 1. calendar_event_id가 있는지 먼저 확인 (양방향 동기화)
      if (test.calendar_event_id) {
        const updateConfirm = confirm('이미 등록된 일정이 있습니다. 기존 일정을 업데이트하시겠습니까?')
        if (!updateConfirm) return false

        const studentName = test.student_name || '학생'
        const subjects = []
        if (test.test1_level) subjects.push(test.test1_level)
        if (test.test2_level) subjects.push(test.test2_level)

        const title = `${studentName} ${subjects.join(', ')}`

        let startTime = test.test_date
        if (!startTime.includes('+')) {
          startTime = test.test_date.slice(0, 19)
        }

        const startDate = new Date(startTime)
        const endDate = new Date(startDate.getTime() + (2 * 60 * 60 * 1000))
        const endTime = endDate.toISOString().slice(0, 19)

        const updateData = {
          title,
          start_time: startTime,
          end_time: endTime,
          description: `입학테스트 - ${studentName}`
        }

        await calendarService.updateEvent(test.calendar_event_id, updateData)

        alert('캘린더 일정이 업데이트되었습니다.')
        window.dispatchEvent(new CustomEvent('refreshCalendar'))

        return true
      }

      // 2. Google Calendar ID가 있는 경우 (이전 방식 호환성)
      if (test.google_calendar_id) {
        const { data: existingCalendarEvent } = await supabase
          .from('calendar_events')
          .select('id')
          .eq('google_calendar_id', test.google_calendar_id)
          .single()

        if (existingCalendarEvent) {
          await supabase
            .from('entrance_tests')
            .update({ calendar_event_id: existingCalendarEvent.id })
            .eq('id', test.id)

          const studentName = test.student_name || '학생'
          const subjects = []
          if (test.test1_level) subjects.push(test.test1_level)
          if (test.test2_level) subjects.push(test.test2_level)

          const title = `${studentName} ${subjects.join(', ')}`

          let startTime = test.test_date
          if (!startTime.includes('+')) {
            startTime = test.test_date.slice(0, 19)
          }

          const startDate = new Date(startTime)
          const endDate = new Date(startDate.getTime() + (2 * 60 * 60 * 1000))
          const endTime = endDate.toISOString().slice(0, 19)

          const updateData = {
            title,
            start_time: startTime,
            end_time: endTime,
            description: `입학테스트 - ${studentName}`
          }

          await calendarService.updateEvent(existingCalendarEvent.id, updateData)

          alert('캘린더 일정이 업데이트되었습니다.')
          window.dispatchEvent(new CustomEvent('refreshCalendar'))

          return true
        }
      }

      // 3. 새로운 일정 생성
      const studentName = test.student_name || '학생'
      const subjects = []
      if (test.test1_level) subjects.push(test.test1_level)
      if (test.test2_level) subjects.push(test.test2_level)

      const title = `${studentName} ${subjects.join(', ')}`

      let startTime = test.test_date
      if (!startTime.includes('+')) {
        startTime = test.test_date.slice(0, 19)
      }

      const startDate = new Date(startTime)
      const endDate = new Date(startDate.getTime() + (2 * 60 * 60 * 1000))
      const endTime = endDate.toISOString().slice(0, 19)

      const eventData = {
        title,
        start_time: startTime,
        end_time: endTime,
        event_type: 'entrance_test' as const,
        description: `입학테스트 - ${studentName}`
      }

      const response = await calendarService.createEvent(eventData)

      // calendar_event_id를 entrance_tests 테이블에 저장 (양방향 동기화)
      if (response.id) {
        const { error: updateError } = await supabase
          .from('entrance_tests')
          .update({
            calendar_event_id: response.id,
            google_calendar_id: response.google_calendar_id
          })
          .eq('id', test.id)

        if (updateError) {
          console.error('entrance_tests 테이블 업데이트 실패:', updateError)
        }
      }

      alert('캘린더에 일정이 등록되었습니다.')
      window.dispatchEvent(new CustomEvent('refreshCalendar'))

      return true
    } catch (error) {
      console.error('캘린더 등록 오류:', error)
      alert('캘린더 등록 중 오류가 발생했습니다.')
      return false
    }
  }, [supabase])

  return {
    handleCreateCalendarEvent
  }
}
