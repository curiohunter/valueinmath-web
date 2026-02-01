"use client"

import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface Schedule {
  day_of_week: string
  start_time: string
  end_time: string
}

interface ClassSchedulePreviewProps {
  schedules?: Schedule[]
  subject?: string
}

const DAYS = ['월', '화', '수', '목', '금', '토', '일'] as const

const SUBJECT_DOT_COLORS: Record<string, string> = {
  '수학': 'bg-blue-500',
  '수학특강': 'bg-violet-500',
  '과학': 'bg-emerald-500',
  '과학특강': 'bg-amber-500',
}

export function ClassSchedulePreview({ schedules, subject }: ClassSchedulePreviewProps) {
  if (!schedules || schedules.length === 0) {
    return (
      <span className="text-gray-400 text-xs">시간표 미등록</span>
    )
  }

  // 요일별 스케줄 그룹화
  const schedulesByDay = new Map<string, Schedule[]>()
  schedules.forEach((s) => {
    if (!schedulesByDay.has(s.day_of_week)) {
      schedulesByDay.set(s.day_of_week, [])
    }
    schedulesByDay.get(s.day_of_week)!.push(s)
  })

  // 시간대별로 그룹화 (간략 표시용)
  const timeGroups = new Map<string, string[]>()
  schedules.forEach((s) => {
    const startTime = s.start_time.substring(0, 5)
    const endTime = s.end_time.substring(0, 5)
    const timeKey = `${startTime}-${endTime}`
    if (!timeGroups.has(timeKey)) {
      timeGroups.set(timeKey, [])
    }
    timeGroups.get(timeKey)!.push(s.day_of_week)
  })

  const dotColor = subject ? SUBJECT_DOT_COLORS[subject] || 'bg-gray-400' : 'bg-gray-400'

  // 간략 표시: 요일 도트 + 대표 시간
  const activeDays = DAYS.filter((day) => schedulesByDay.has(day))
  const firstSchedule = schedules[0]
  const displayTime = `${firstSchedule.start_time.substring(0, 5)}-${firstSchedule.end_time.substring(0, 5)}`

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 cursor-help">
            {/* 요일 도트 */}
            <div className="flex items-center gap-0.5">
              {DAYS.map((day) => (
                <div
                  key={day}
                  className={cn(
                    'w-1.5 h-1.5 rounded-full transition-colors',
                    schedulesByDay.has(day) ? dotColor : 'bg-gray-200'
                  )}
                  title={day}
                />
              ))}
            </div>

            {/* 시간 표시 */}
            <span className="text-xs text-gray-600">
              {activeDays.join('')} {displayTime}
              {timeGroups.size > 1 && (
                <span className="text-gray-400 ml-1">+{timeGroups.size - 1}</span>
              )}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-1.5">
            <div className="font-semibold text-xs text-gray-500 mb-2">전체 시간표</div>
            {Array.from(timeGroups.entries()).map(([time, days], index) => (
              <div key={index} className="text-sm">
                <span className="font-medium">{days.join('')}</span>
                <span className="text-gray-500 ml-2">{time}</span>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
