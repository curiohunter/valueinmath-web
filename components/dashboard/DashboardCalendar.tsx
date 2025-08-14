'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { calendarService } from '@/services/calendar'
import EventModal from '@/components/calendar/EventModal'
import { toast } from 'sonner'
import type { CalendarEvent } from '@/types/calendar'

interface DashboardCalendarProps {
  className?: string
}

// 날짜 범위 계산 헬퍼 함수 (오늘 기준 1주일)
const getDateRange = (baseDate: Date, offsetDays: number = 0) => {
  const targetDate = new Date(baseDate)
  targetDate.setDate(baseDate.getDate() + offsetDays)
  
  // 오늘부터 6일 후까지 (총 7일)
  const startDate = new Date(targetDate)
  startDate.setHours(0, 0, 0, 0)
  
  const endDate = new Date(targetDate)
  endDate.setDate(startDate.getDate() + 6)
  endDate.setHours(23, 59, 59, 999)
  
  return {
    start: startDate,
    end: endDate,
    startString: startDate.toISOString().split('T')[0],
    endString: endDate.toISOString().split('T')[0]
  }
}

// 날짜 범위 레이블 생성
const getDateRangeLabel = (startDate: Date, endDate: Date) => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const rangeStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
  
  const isCurrentRange = today.getTime() === rangeStart.getTime()
  
  if (isCurrentRange) {
    return '이번주'
  }
  
  const startMonth = startDate.getMonth() + 1
  const startDay = startDate.getDate()
  const endMonth = endDate.getMonth() + 1
  const endDay = endDate.getDate()
  
  if (startMonth === endMonth) {
    return `${startMonth}월 ${startDay}일~${endDay}일`
  } else {
    return `${startMonth}월 ${startDay}일~${endMonth}월 ${endDay}일`
  }
}


const eventCategories = [
  { value: 'notice', label: '공지사항', color: '#ef4444' }, // red-500
  { value: 'work', label: '근무관련', color: '#3b82f6' }, // blue-500
  { value: 'makeup', label: '보강', color: '#10b981' }, // emerald-500
  { value: 'absence', label: '결석', color: '#f59e0b' }, // amber-500
  { value: 'entrance_test', label: '입학테스트', color: '#8b5cf6' }, // violet-500
  { value: 'new_consultation', label: '신규상담', color: '#ec4899' }, // pink-500
  { value: 'new_enrollment', label: '신규등원', color: '#14b8a6' }, // teal-500
  { value: 'regular_consultation', label: '정기상담', color: '#6366f1' }, // indigo-500
  { value: 'school_exam', label: '학교시험', color: '#84cc16' }, // lime-500
  { value: 'last_minute_makeup', label: '직전보강', color: '#f97316' }, // orange-500
  { value: 'holiday', label: '휴강', color: '#6b7280' }, // gray-500
]

// 이벤트 타입에 따른 색상 반환
const getEventColor = (eventType: string): string => {
  const category = eventCategories.find(cat => cat.value === eventType)
  return category ? category.color : '#6b7280' // 기본값: gray-500
}


export default function DashboardCalendar({ className }: DashboardCalendarProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentDateOffset, setCurrentDateOffset] = useState(0) // 0 = 오늘부터, -7 = 7일 전부터, 7 = 7일 후부터
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // 현재 선택된 날짜 범위 계산
  const currentDateRange = useMemo(() => {
    const now = new Date()
    return getDateRange(now, currentDateOffset)
  }, [currentDateOffset])
  
  // 이벤트 데이터 로딩
  const loadEvents = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const eventData = await calendarService.getEventsByDateRange(
        currentDateRange.startString, 
        currentDateRange.endString
      )
      
      setEvents(eventData)
    } catch (err) {
      console.error('Failed to load events:', err)
      setError('일정을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEvents()
  }, [currentDateRange.startString, currentDateRange.endString])

  // 외부에서 새로고침 이벤트 수신
  useEffect(() => {
    const handleRefresh = () => {
      console.log('캘린더 새로고침 이벤트 수신')
      loadEvents()
    }

    window.addEventListener('refreshCalendar', handleRefresh)
    return () => window.removeEventListener('refreshCalendar', handleRefresh)
  }, [currentDateRange.startString, currentDateRange.endString])

  // 날짜 네비게이션
  const goToPreviousWeek = () => {
    setCurrentDateOffset(prev => prev - 7)
  }

  const goToNextWeek = () => {
    setCurrentDateOffset(prev => prev + 7)
  }

  const goToCurrentWeek = () => {
    setCurrentDateOffset(0)
  }
  
  // 이벤트 클릭 핸들러
  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setIsModalOpen(true)
  }
  
  // 모달 닫기
  const handleModalClose = () => {
    setSelectedEvent(null)
    setIsModalOpen(false)
  }
  
  // 이벤트 저장 (수정)
  const handleEventSave = async (eventData: Omit<CalendarEvent, 'id' | 'created_by' | 'created_at' | 'updated_at'>) => {
    if (!selectedEvent?.id) return
    
    try {
      await calendarService.updateEvent(selectedEvent.id, eventData)
      toast.success('일정이 수정되었습니다.')
      handleModalClose()
      loadEvents() // 목록 새로고침
    } catch (error) {
      console.error('Failed to update event:', error)
      toast.error('일정 수정에 실패했습니다.')
    }
  }
  
  // 이벤트 삭제
  const handleEventDelete = async (id: string) => {
    if (!window.confirm('정말로 이 일정을 삭제하시겠습니까?')) return
    
    try {
      await calendarService.deleteEvent(id)
      toast.success('일정이 삭제되었습니다.')
      handleModalClose()
      loadEvents() // 목록 새로고침
    } catch (error) {
      console.error('Failed to delete event:', error)
      toast.error('일정 삭제에 실패했습니다.')
    }
  }
  
  // 시간 포맷팅 (HH:MM)
  const formatEventTime = (timeString: string) => {
    return timeString.split('T')[1]?.slice(0, 5) || ''
  }
  
  // 구글 캘린더 스타일로 날짜별 그룹핑된 이벤트 생성
  const groupedEventsByDate = useMemo(() => {
    // 날짜별로 이벤트 그룹핑
    const grouped = new Map<string, CalendarEvent[]>()
    
    events.forEach(event => {
      const dateStr = event.start_time.split('T')[0]
      if (!grouped.has(dateStr)) {
        grouped.set(dateStr, [])
      }
      grouped.get(dateStr)!.push(event)
    })
    
    // 날짜 순으로 정렬하고 구글 캘린더 스타일로 구성
    const sortedDates = Array.from(grouped.keys()).sort()
    
    return sortedDates.map(dateStr => {
      const date = new Date(dateStr + 'T00:00:00')
      const dayEvents = grouped.get(dateStr)!.sort((a, b) => 
        a.start_time.localeCompare(b.start_time)
      )
      
      return {
        date: dateStr,
        dateObj: date,
        dayLabel: date.toLocaleDateString('ko-KR', { 
          month: 'short', 
          day: 'numeric',
          weekday: 'short'
        }),
        events: dayEvents
      }
    })
  }, [events])

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {getDateRangeLabel(currentDateRange.start, currentDateRange.end)} 일정
          </CardTitle>
          
          {/* 날짜 네비게이션 */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousWeek}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            {/* 오늘로 돌아가기 버튼 (현재 범위가 아닐 때만 표시) */}
            {currentDateOffset !== 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={goToCurrentWeek}
                className="text-xs px-2 h-8"
              >
                오늘
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextWeek}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-3">
        {/* 로딩 상태 */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">일정을 불러오는 중...</div>
          </div>
        )}
        
        {/* 에러 상태 */}
        {error && (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-destructive">{error}</div>
          </div>
        )}
        
        {/* 구글 캘린더 스타일 일정 리스트 */}
        {!loading && !error && (
          <div className="space-y-4">
            {groupedEventsByDate.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {getDateRangeLabel(currentDateRange.start, currentDateRange.end)} 일정이 없습니다.
              </div>
            ) : (
              <>
                {groupedEventsByDate.map((dayGroup, dayIndex) => {
                  const today = new Date()
                  const todayStr = today.getFullYear() + '-' + 
                                  String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                                  String(today.getDate()).padStart(2, '0')
                  const isToday = dayGroup.date === todayStr
                  
                  return (
                    <div key={dayGroup.date} className="space-y-2">
                      {/* 날짜 헤더 */}
                      <div className={`flex items-center gap-3 pb-2 border-b ${
                        isToday ? 'border-blue-200' : 'border-border'
                      }`}>
                        <div className={`text-lg font-bold ${
                          isToday ? 'text-blue-600' : 'text-foreground'
                        }`}>
                          {dayGroup.dateObj.getDate()}
                        </div>
                        <div className="flex-1">
                          <div className={`text-sm font-medium ${
                            isToday ? 'text-blue-600' : 'text-foreground'
                          }`}>
                            {dayGroup.dayLabel}
                          </div>
                          {isToday && (
                            <div className="text-xs text-blue-500 font-medium">오늘</div>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {dayGroup.events.length}개 일정
                        </div>
                      </div>
                      
                      {/* 해당 날짜의 이벤트들 */}
                      <div className="space-y-1 ml-6">
                        {dayGroup.events.map((event, eventIndex) => {
                          const eventColor = getEventColor(event.event_type || '')
                          const eventCategory = eventCategories.find(cat => cat.value === event.event_type)
                          
                          return (
                            <div
                              key={event.id || `${dayIndex}-${eventIndex}`}
                              className={`flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer ${
                                isToday ? 'bg-blue-50/30' : ''
                              }`}
                              onClick={() => handleEventClick(event)}
                            >
                              {/* 이벤트 색상 도트 */}
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: eventColor }}
                              />
                              
                              {/* 시간 */}
                              <div className="text-sm font-medium text-muted-foreground min-w-[60px]">
                                {formatEventTime(event.start_time)}
                              </div>
                              
                              {/* 이벤트 제목 */}
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-foreground truncate">
                                  {event.title}
                                </div>
                                {event.description && (
                                  <div className="text-xs text-muted-foreground truncate">
                                    {event.description}
                                  </div>
                                )}
                              </div>
                              
                              {/* 카테고리 뱃지 */}
                              <div 
                                className="text-xs px-2 py-1 rounded-full text-white flex-shrink-0"
                                style={{ backgroundColor: eventColor }}
                              >
                                {eventCategory?.label || event.event_type}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}
      </CardContent>
      
      {/* 이벤트 편집 모달 */}
      {selectedEvent && (
        <EventModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onSave={handleEventSave}
          onDelete={handleEventDelete}
          event={selectedEvent}
        />
      )}
    </Card>
  )
}