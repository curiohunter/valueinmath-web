'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { calendarService } from '@/services/calendar'
import type { CalendarEvent } from '@/types/calendar'

interface DashboardCalendarProps {
  className?: string
}

// 주차별 날짜 계산 헬퍼 함수 (월요일 시작)
const getWeekRange = (baseDate: Date) => {
  const startOfWeek = new Date(baseDate)
  
  // 월요일을 기준으로 주차 계산 (0=일요일, 1=월요일)
  const dayOfWeek = startOfWeek.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // 일요일이면 -6, 아니면 1-dayOfWeek
  
  startOfWeek.setDate(startOfWeek.getDate() + mondayOffset)
  startOfWeek.setHours(0, 0, 0, 0) // 시간을 00:00:00으로 설정
  
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6) // 월요일부터 일요일까지
  endOfWeek.setHours(23, 59, 59, 999) // 시간을 23:59:59로 설정
  
  return {
    start: startOfWeek,
    end: endOfWeek,
    startString: startOfWeek.toISOString().split('T')[0],
    endString: endOfWeek.toISOString().split('T')[0]
  }
}

// 주차 레이블 생성
const getWeekLabel = (startDate: Date, endDate: Date) => {
  const now = new Date()
  const currentWeek = getWeekRange(now)
  
  const isCurrentWeek = startDate.getTime() === currentWeek.start.getTime()
  
  if (isCurrentWeek) {
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
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0) // 0 = 이번주, -1 = 저번주, 1 = 다음주
  
  // 현재 선택된 주차 범위 계산
  const currentWeekRange = useMemo(() => {
    const now = new Date()
    const targetDate = new Date(now)
    targetDate.setDate(now.getDate() + (currentWeekOffset * 7))
    return getWeekRange(targetDate)
  }, [currentWeekOffset])
  
  // 이벤트 데이터 로딩
  const loadEvents = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const eventData = await calendarService.getEventsByDateRange(
        currentWeekRange.startString, 
        currentWeekRange.endString
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
  }, [currentWeekRange.startString, currentWeekRange.endString])

  // 외부에서 새로고침 이벤트 수신
  useEffect(() => {
    const handleRefresh = () => {
      console.log('캘린더 새로고침 이벤트 수신')
      loadEvents()
    }

    window.addEventListener('refreshCalendar', handleRefresh)
    return () => window.removeEventListener('refreshCalendar', handleRefresh)
  }, [currentWeekRange.startString, currentWeekRange.endString])

  // 주차 네비게이션
  const goToPreviousWeek = () => {
    setCurrentWeekOffset(prev => prev - 1)
  }

  const goToNextWeek = () => {
    setCurrentWeekOffset(prev => prev + 1)
  }

  const goToCurrentWeek = () => {
    setCurrentWeekOffset(0)
  }
  
  // 시간 포맷팅 (HH:MM)
  const formatEventTime = (timeString: string) => {
    return timeString.split('T')[1]?.slice(0, 5) || ''
  }
  
  // 선택된 주차의 이벤트 필터링 및 정렬
  const { displayEvents, remainingCount } = useMemo(() => {
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    
    // 이미 API에서 해당 주차 데이터만 가져오므로 추가 필터링 불필요
    const allWeekEvents = events
      .map(event => ({
        ...event,
        isToday: event.start_time.split('T')[0] === todayStr,
        eventDate: new Date(event.start_time)
      }))
      .sort((a, b) => {
        // 우선순위 정렬: 오늘 일정을 최우선으로 표시
        if (a.isToday && !b.isToday) return -1
        if (!a.isToday && b.isToday) return 1
        
        // 둘 다 오늘이거나 둘 다 오늘이 아닌 경우 시간순 정렬
        return a.start_time.localeCompare(b.start_time)
      })
    
    const displayEvents = allWeekEvents.slice(0, 15) // 최대 15개까지만 표시
    const remainingCount = allWeekEvents.length - 15
    
    return {
      displayEvents,
      remainingCount: remainingCount > 0 ? remainingCount : 0
    }
  }, [events])

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {getWeekLabel(currentWeekRange.start, currentWeekRange.end)} 일정
          </CardTitle>
          
          {/* 주차 네비게이션 */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousWeek}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            {/* 이번주로 돌아가기 버튼 (현재 이번주가 아닐 때만 표시) */}
            {currentWeekOffset !== 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={goToCurrentWeek}
                className="text-xs px-2 h-8"
              >
                이번주
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
        
        {/* 일정 리스트 */}
        {!loading && !error && (
          <div className="space-y-3">
            {displayEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {getWeekLabel(currentWeekRange.start, currentWeekRange.end)} 일정이 없습니다.
              </div>
            ) : (
              <>
                {displayEvents.map((event, index) => {
                const eventColor = getEventColor(event.event_type || '')
                const eventCategory = eventCategories.find(cat => cat.value === event.event_type)
                // UTC 기준으로 날짜 비교 (시간대 변환 무시)
                const eventDateStr = event.start_time.split('T')[0] // YYYY-MM-DD만 추출
                const todayStr = new Date().toISOString().split('T')[0]
                const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0]
                
                const isToday = eventDateStr === todayStr
                const isTomorrow = eventDateStr === tomorrowStr
                
                const eventDate = new Date(event.start_time)
                
                let dateLabel = eventDate.toLocaleDateString('ko-KR', { 
                  month: 'short', 
                  day: 'numeric',
                  weekday: 'short'
                })
                
                if (isToday) dateLabel = '오늘'
                else if (isTomorrow) dateLabel = '내일'
                
                return (
                  <div
                    key={event.id || index}
                    className={`flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors ${
                      isToday ? 'ring-2 ring-blue-200 bg-blue-50/50' : ''
                    }`}
                  >
                    {/* 이벤트 색상 인디케이터 */}
                    <div
                      className="w-1 h-16 rounded-full flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: eventColor }}
                    />
                    
                    {/* 시간 정보 */}
                    <div className="flex flex-col items-center min-w-[60px] text-center">
                      <span className={`text-xs font-medium uppercase tracking-wide ${
                        isToday ? 'text-blue-600 font-bold' : 'text-muted-foreground'
                      }`}>
                        {dateLabel}
                      </span>
                      <span className={`text-lg font-bold ${
                        isToday ? 'text-blue-600' : 'text-foreground'
                      }`}>
                        {formatEventTime(event.start_time)}
                      </span>
                    </div>
                    
                    {/* 이벤트 내용 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-foreground truncate">
                          {event.title}
                        </h4>
                        <span 
                          className="text-xs px-2 py-1 rounded-full text-white flex-shrink-0"
                          style={{ backgroundColor: eventColor }}
                        >
                          {eventCategory?.label || event.event_type}
                        </span>
                      </div>
                      
                      {event.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {event.description}
                        </p>
                      )}
                      
                      {event.location && (
                        <p className="text-xs text-muted-foreground mt-1">
                          📍 {event.location}
                        </p>
                      )}
                    </div>
                  </div>
                )
                })}
                
                {/* 더 많은 일정이 있는 경우 알림 */}
                {remainingCount > 0 && (
                  <div className="pt-2 text-center">
                    <span className="text-sm text-muted-foreground">
                      +{remainingCount}개의 일정이 더 있습니다
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}