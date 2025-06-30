'use client'

import { useState, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { calendarService } from '@/services/calendar'
import type { CalendarEvent } from '@/types/calendar'

interface DashboardCalendarProps {
  className?: string
}

export interface DashboardCalendarRef {
  refreshEvents: () => Promise<void>
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
  const router = useRouter()
  
  // 이번 주 범위 계산 (API 호출용)
  const now = new Date()
  const weekStart = new Date(now)
  const weekEnd = new Date(now)
  weekEnd.setDate(weekEnd.getDate() + 6)
  
  const weekStartString = weekStart.toISOString().split('T')[0]
  const weekEndString = weekEnd.toISOString().split('T')[0]
  
  // 이벤트 데이터 로딩
  const loadEvents = async () => {
    try {
      setLoading(true)
      setError(null)
      const eventData = await calendarService.getEvents(weekStartString, weekEndString)
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
  }, [weekStartString, weekEndString])

  // 외부에서 새로고침 이벤트 수신
  useEffect(() => {
    const handleRefresh = () => {
      console.log('캘린더 새로고침 이벤트 수신')
      loadEvents()
    }

    window.addEventListener('refreshCalendar', handleRefresh)
    return () => window.removeEventListener('refreshCalendar', handleRefresh)
  }, [weekStartString, weekEndString])
  
  // 시간 포맷팅 (HH:MM)
  const formatEventTime = (timeString: string) => {
    return timeString.split('T')[1]?.slice(0, 5) || ''
  }
  
  // 이번 주 이벤트 필터링 (오늘부터 7일간)
  const { displayEvents, remainingCount } = useMemo(() => {
    const now = new Date()
    const weekStart = new Date(now)
    const weekEnd = new Date(now)
    weekEnd.setDate(weekEnd.getDate() + 6) // 오늘부터 6일 후까지
    
    const allWeekEvents = events
      .filter(event => {
        const eventDate = new Date(event.start_time)
        return eventDate >= weekStart && eventDate <= weekEnd
      })
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
    
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
            이번 주 일정
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/calendar')}
            className="text-xs"
          >
            전체 보기
          </Button>
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
                이번 주 일정이 없습니다.
              </div>
            ) : (
              <>
                {displayEvents.map((event, index) => {
                const eventColor = getEventColor(event.event_type)
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
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    {/* 이벤트 색상 인디케이터 */}
                    <div
                      className="w-1 h-16 rounded-full flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: eventColor }}
                    />
                    
                    {/* 시간 정보 */}
                    <div className="flex flex-col items-center min-w-[60px] text-center">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {dateLabel}
                      </span>
                      <span className="text-lg font-bold text-foreground">
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
                
                {/* "+N개 더 보기" 버튼 */}
                {remainingCount > 0 && (
                  <div className="pt-2">
                    <Button
                      variant="ghost"
                      onClick={() => router.push('/calendar')}
                      className="w-full text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    >
                      +{remainingCount}개 더 보기
                    </Button>
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