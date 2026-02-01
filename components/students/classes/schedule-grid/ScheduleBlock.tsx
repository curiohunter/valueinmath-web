"use client"

import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ScheduleSlot, SubjectType } from './types'

interface ScheduleBlockProps {
  slot: ScheduleSlot
  onClick: (classData: ScheduleSlot['classData']) => void
  studentCount?: number
  columnIndex?: number
  totalColumns?: number
}

// 과목별 그라디언트 스타일 (인라인)
const SUBJECT_GRADIENT_STYLES: Record<SubjectType, React.CSSProperties> = {
  '수학': {
    background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
    color: 'white',
  },
  '수학특강': {
    background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
    color: 'white',
  },
  '과학': {
    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    color: 'white',
  },
  '과학특강': {
    background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    color: 'white',
  },
}

export function ScheduleBlock({ slot, onClick, studentCount, columnIndex = 0, totalColumns = 1 }: ScheduleBlockProps) {
  const { classData, schedule, teacher, startMinutes, endMinutes } = slot

  const duration = endMinutes - startMinutes
  const heightPercent = (duration / 60) * 64 // 64px = 1시간

  const gradientStyle = SUBJECT_GRADIENT_STYLES[classData.subject as SubjectType] || SUBJECT_GRADIENT_STYLES['수학']

  const startTime = schedule.start_time.substring(0, 5)
  const endTime = schedule.end_time.substring(0, 5)

  // 블록이 작으면 간략하게 표시
  const isCompact = duration <= 30 || totalColumns > 2
  const isMedium = !isCompact && (duration > 30 && duration <= 60)

  // 가로 위치 계산 (겹치는 블록 처리)
  const widthPercent = 100 / totalColumns
  const leftPercent = columnIndex * widthPercent
  const gap = 2 // px

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'absolute rounded-lg p-1.5 cursor-pointer overflow-hidden',
              'shadow-md hover:shadow-lg transition-all duration-200',
              'hover:z-10'
            )}
            style={{
              top: `${(startMinutes / 60) * 64}px`,
              height: `${heightPercent}px`,
              minHeight: '24px',
              left: `calc(${leftPercent}% + ${gap}px)`,
              width: `calc(${widthPercent}% - ${gap * 2}px)`,
              ...gradientStyle,
            }}
            onClick={() => onClick(classData)}
          >
            {isCompact ? (
              <div className="flex items-center justify-between h-full px-1">
                <span className="text-[10px] font-semibold truncate">{classData.name}</span>
              </div>
            ) : isMedium ? (
              <div className="flex flex-col h-full justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold truncate">{classData.name}</span>
                  {studentCount !== undefined && (
                    <span className="text-[10px] opacity-80">{studentCount}명</span>
                  )}
                </div>
                <span className="text-[10px] opacity-90">{startTime}-{endTime}</span>
              </div>
            ) : (
              <div className="flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold truncate">{classData.name}</span>
                    {studentCount !== undefined && (
                      <span className="text-xs opacity-80 bg-white/20 px-1.5 py-0.5 rounded">
                        {studentCount}명
                      </span>
                    )}
                  </div>
                  {teacher && (
                    <span className="text-xs opacity-90 block mt-0.5">{teacher.name}</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs opacity-90">{startTime} - {endTime}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-white/20 rounded">
                    {classData.subject}
                  </span>
                </div>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-1">
            <div className="font-semibold">{classData.name}</div>
            <div className="text-sm text-gray-500">
              {schedule.day_of_week}요일 {startTime} - {endTime}
            </div>
            <div className="text-sm">
              <span className="text-gray-500">과목:</span> {classData.subject}
            </div>
            {teacher && (
              <div className="text-sm">
                <span className="text-gray-500">담당:</span> {teacher.name}
              </div>
            )}
            {studentCount !== undefined && (
              <div className="text-sm">
                <span className="text-gray-500">학생:</span> {studentCount}명
              </div>
            )}
            {classData.monthly_fee && (
              <div className="text-sm">
                <span className="text-gray-500">원비:</span> {classData.monthly_fee.toLocaleString()}원
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
