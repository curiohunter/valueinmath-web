'use client'

import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { useState, useEffect } from 'react'
import { calendarService } from '@/services/calendar'
import { CalendarEvent, FullCalendarEvent } from '@/types/calendar'
import EventModal from '@/components/calendar/EventModal'
import GoogleCalendarSettings from '@/components/calendar/GoogleCalendarSettings'
import { toast } from 'sonner'
import { MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Vercel 스타일 CSS 정의
const vercelCalendarStyles = `
  .fc {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    --fc-border-color: hsl(var(--border));
  }
  
  /* 툴바 스타일링 */
  .fc-toolbar {
    background-color: transparent;
    border: none;
    margin-bottom: 2rem;
    padding: 0;
    gap: 1rem;
  }
  
  .fc-toolbar-chunk {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .fc-toolbar-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: hsl(var(--foreground));
    margin: 0;
  }
  
  /* 버튼 그룹 스타일링 */
  .fc-button-group {
    display: inline-flex;
    border-radius: 0.5rem;
    overflow: hidden;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  }
  
  .fc-button {
    background-color: hsl(var(--background)) !important;
    border: 1px solid hsl(var(--border)) !important;
    color: hsl(var(--foreground)) !important;
    font-size: 0.875rem !important;
    font-weight: 500 !important;
    padding: 0.5rem 1rem !important;
    transition: all 0.2s ease !important;
    box-shadow: none !important;
    margin: 0 !important;
    border-radius: 0 !important;
    position: relative;
  }
  
  .fc-button:not(:last-child) {
    border-right: none !important;
  }
  
  .fc-button:first-child {
    border-top-left-radius: 0.5rem !important;
    border-bottom-left-radius: 0.5rem !important;
  }
  
  .fc-button:last-child {
    border-top-right-radius: 0.5rem !important;
    border-bottom-right-radius: 0.5rem !important;
  }
  
  .fc-button:hover {
    background-color: hsl(var(--muted)) !important;
    z-index: 1;
  }
  
  .fc-button:focus {
    box-shadow: 0 0 0 2px hsl(var(--ring)) !important;
    outline: none !important;
    z-index: 2;
  }
  
  .fc-button-primary {
    background-color: hsl(var(--primary)) !important;
    border-color: hsl(var(--primary)) !important;
    color: hsl(var(--primary-foreground)) !important;
  }
  
  .fc-button-primary:hover {
    background-color: hsl(var(--primary/90)) !important;
  }
  
  /* Today 버튼 별도 스타일링 */
  .fc-today-button {
    margin-left: 0.5rem !important;
    border-radius: 0.5rem !important;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  }
  
  /* 캘린더 그리드 스타일링 */
  .fc-scrollgrid {
    border: 1px solid hsl(var(--border));
    border-radius: 0.75rem;
    overflow: hidden;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  }
  
  .fc-col-header-cell {
    background-color: hsl(var(--muted/50));
    border-color: hsl(var(--border));
    font-weight: 600;
  }
  
  .fc-col-header-cell-cushion {
    color: hsl(var(--muted-foreground));
    padding: 1rem 0;
    font-size: 0.875rem;
  }
  
  .fc-daygrid-day {
    border-color: hsl(var(--border));
    min-height: 6rem;
  }
  
  .fc-daygrid-day-number {
    color: hsl(var(--foreground));
    font-weight: 500;
    padding: 0.5rem;
  }
  
  .fc-daygrid-day.fc-day-today {
    background-color: transparent !important;
  }
  
  .fc-daygrid-day.fc-day-today .fc-daygrid-day-number {
    color: hsl(var(--foreground));
    font-weight: 700;
  }
  
  /* 주간/일간 보기에서도 오늘 배경색 제거 */
  .fc-timegrid-col.fc-day-today {
    background-color: transparent !important;
  }
  
  .fc-col-header-cell.fc-day-today {
    background-color: hsl(var(--muted/50)) !important;
  }
  
  /* FullCalendar 기본 today 하이라이트 제거 */
  .fc .fc-day-today {
    background-color: inherit !important;
  }
  
  .fc .fc-timegrid-col-bg .fc-day-today {
    background-color: transparent !important;
  }
  
  /* 이벤트 스타일링 */
  .fc-event {
    border-radius: 0.375rem !important;
    font-size: 0.875rem !important;
    margin: 1px !important;
    padding: 2px 6px !important;
    border-width: 0 !important;
    font-weight: 500;
  }
  
  .fc-event:hover {
    opacity: 0.85;
    transform: scale(1.02);
    transition: all 0.2s ease;
  }
  
  /* 다른 월의 날짜 스타일링 */
  .fc-daygrid-day.fc-day-other .fc-daygrid-day-number {
    color: hsl(var(--muted-foreground));
  }
  
  /* 날짜 셀에 + 버튼 추가 */
  .fc-daygrid-day-frame {
    position: relative;
  }
  
  .fc-daygrid-day-frame .add-event-btn {
    position: absolute;
    top: 0.25rem;
    left: 0.25rem;
    width: 1.5rem;
    height: 1.5rem;
    background-color: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
    border-radius: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.2s ease;
    font-size: 1rem;
    font-weight: 600;
    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  }
  
  .fc-daygrid-day:hover .add-event-btn {
    opacity: 1;
  }
  
  .add-event-btn:hover {
    background-color: hsl(var(--primary/90));
    transform: scale(1.1);
  }

  /* More Events 모달 스타일링 - 투명 배경 문제 해결 */
  .fc-more-popover {
    background-color: hsl(var(--background)) !important;
    border: 1px solid hsl(var(--border)) !important;
    border-radius: 0.5rem !important;
    box-shadow: 0 10px 25px -5px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05) !important;
    z-index: 50 !important;
  }
  
  .fc-more-popover .fc-popover-header {
    background-color: hsl(var(--muted/50)) !important;
    border-bottom: 1px solid hsl(var(--border)) !important;
    padding: 0.75rem 1rem !important;
    border-radius: 0.5rem 0.5rem 0 0 !important;
  }
  
  .fc-more-popover .fc-popover-title {
    color: hsl(var(--foreground)) !important;
    font-weight: 600 !important;
    font-size: 0.875rem !important;
    margin: 0 !important;
  }
  
  .fc-more-popover .fc-popover-body {
    background-color: hsl(var(--background)) !important;
    padding: 0.5rem !important;
    max-height: 200px !important;
    overflow-y: auto !important;
  }
  
  .fc-more-popover .fc-event {
    margin: 2px 0 !important;
    padding: 4px 8px !important;
    border-radius: 0.25rem !important;
    font-size: 0.75rem !important;
    cursor: pointer !important;
    transition: all 0.15s ease !important;
  }
  
  .fc-more-popover .fc-event:hover {
    opacity: 0.8 !important;
    transform: translateX(2px) !important;
  }
  
  .fc-more-popover .fc-popover-close {
    color: hsl(var(--muted-foreground)) !important;
    font-size: 1.25rem !important;
    line-height: 1 !important;
    padding: 0.25rem !important;
    margin: -0.25rem !important;
    border-radius: 0.25rem !important;
    transition: all 0.15s ease !important;
  }
  
  .fc-more-popover .fc-popover-close:hover {
    background-color: hsl(var(--muted)) !important;
    color: hsl(var(--foreground)) !important;
  }
`

export default function FullCalendarWrapper() {
  const [events, setEvents] = useState<FullCalendarEvent[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [loading, setLoading] = useState(true)

  // 이벤트 로드
  const loadEvents = async () => {
    try {
      setLoading(true)
      const data = await calendarService.getEvents()
      const fullCalendarEvents = calendarService.transformToFullCalendarEvents(data)
      setEvents(fullCalendarEvents)
    } catch (error) {
      console.error('Failed to load events:', error)
      toast.error('이벤트를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEvents()
  }, [])

  // 날짜 클릭 핸들러 (새 이벤트 생성)
  const handleDateClick = (info: any) => {
    console.log('Date clicked:', info.dateStr)
    setSelectedDate(info.dateStr)
    setSelectedEvent(null)
    setIsModalOpen(true)
  }

  // 이벤트 클릭 핸들러 (기존 이벤트 편집)
  const handleEventClick = async (info: any) => {
    console.log('Event clicked:', info.event.title)
    try {
      // 전체 이벤트 데이터를 다시 조회 (FullCalendar 이벤트는 일부 데이터만 포함)
      const allEvents = await calendarService.getEvents()
      const selectedEventData = allEvents.find(e => e.id === info.event.id)
      
      if (selectedEventData) {
        setSelectedEvent(selectedEventData)
        setSelectedDate('')
        setIsModalOpen(true)
      }
    } catch (error) {
      console.error('Failed to load event details:', error)
      toast.error('이벤트 정보를 불러오는데 실패했습니다.')
    }
  }

  // 이벤트 저장 핸들러
  const handleSaveEvent = async (eventData: Omit<CalendarEvent, 'id' | 'created_by' | 'created_at' | 'updated_at'>) => {
    const startTime = Date.now()
    console.log('🕐 클라이언트: 저장 시작')
    
    try {
      if (selectedEvent) {
        // 기존 이벤트 수정
        await calendarService.updateEvent(selectedEvent.id!, eventData)
        console.log('🕐 클라이언트: API 응답 완료', Date.now() - startTime, 'ms')
        toast.success('이벤트가 수정되었습니다.')
      } else {
        // 새 이벤트 생성
        await calendarService.createEvent(eventData)
        console.log('🕐 클라이언트: API 응답 완료', Date.now() - startTime, 'ms')
        toast.success('이벤트가 생성되었습니다.')
      }
      
      console.log('🕐 클라이언트: 토스트 표시 완료', Date.now() - startTime, 'ms')
      
      await loadEvents()
      console.log('🕐 클라이언트: 이벤트 새로고침 완료', Date.now() - startTime, 'ms')
      
      setIsModalOpen(false)
      console.log('🕐 클라이언트: 모달 닫기 완료', Date.now() - startTime, 'ms')
    } catch (error) {
      console.error('Failed to save event:', error)
      toast.error('이벤트 저장에 실패했습니다.')
    }
  }

  // 이벤트 삭제 핸들러
  const handleDeleteEvent = async (id: string) => {
    try {
      await calendarService.deleteEvent(id)
      toast.success('이벤트가 삭제되었습니다.')
      await loadEvents()
      setIsModalOpen(false)
    } catch (error) {
      console.error('Failed to delete event:', error)
      toast.error('이벤트 삭제에 실패했습니다.')
    }
  }

  return (
    <>
      <div className="h-full w-full relative">
        {/* Vercel 스타일 CSS 주입 */}
        <style dangerouslySetInnerHTML={{ __html: vercelCalendarStyles }} />
        
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: ''
          }}
          events={events}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          height="100%"
          locale="ko"
          timeZone="Asia/Seoul"
          selectable={true}
          dayMaxEvents={4}
          weekends={true}
          dayCellDidMount={(info) => {
            // 각 날짜 셀에 + 버튼 추가
            const button = document.createElement('div')
            button.className = 'add-event-btn'
            button.innerHTML = '+'
            button.title = '이벤트 추가'
            button.onclick = (e) => {
              e.stopPropagation()
              handleDateClick({ dateStr: info.dateStr })
            }
            info.el.querySelector('.fc-daygrid-day-frame')?.appendChild(button)
          }}
        />
        
        {/* 3점 메뉴 - 캘린더 위에 절대 위치 */}
        <div className="absolute top-2 right-2 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="bg-white/80 backdrop-blur-sm border shadow-sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <GoogleCalendarSettings />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* 이벤트 생성/편집 모달 */}
      <EventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        event={selectedEvent}
        selectedDate={selectedDate}
      />
    </>
  )
}