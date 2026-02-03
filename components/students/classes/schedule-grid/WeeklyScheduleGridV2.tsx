"use client"

import { useMemo, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  ClassWithSchedule,
  Teacher,
  ScheduleSlot,
  DAYS,
  SubjectType,
} from './types'
import { Users, Clock } from 'lucide-react'

interface WeeklyScheduleGridV2Props {
  classes: ClassWithSchedule[]
  teachers: Teacher[]
  studentsCountMap: Record<string, number>
  onClassClick: (classData: ClassWithSchedule) => void
}

// 과목별 색상
const SUBJECT_STYLES: Record<SubjectType, { bg: string; border: string }> = {
  '수학': { bg: 'bg-blue-500', border: 'border-l-blue-600' },
  '수학특강': { bg: 'bg-violet-500', border: 'border-l-violet-600' },
  '과학': { bg: 'bg-emerald-500', border: 'border-l-emerald-600' },
  '과학특강': { bg: 'bg-amber-500', border: 'border-l-amber-600' },
}

// 시간 문자열을 분 단위로 변환 (절대값)
function timeToAbsoluteMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

// 분을 시간 문자열로 변환
function absoluteMinutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

// 겹치는 슬롯들을 행으로 분리
function assignRows(slots: ScheduleSlot[]): { slot: ScheduleSlot; row: number }[] {
  if (slots.length === 0) return []

  // 시작 시간순 정렬
  const sorted = [...slots].sort((a, b) => a.startMinutes - b.startMinutes)

  const result: { slot: ScheduleSlot; row: number }[] = []
  const rowEndTimes: number[] = [] // 각 row의 종료 시간

  sorted.forEach((slot) => {
    // 사용 가능한 row 찾기
    let assignedRow = -1
    for (let i = 0; i < rowEndTimes.length; i++) {
      if (rowEndTimes[i] <= slot.startMinutes) {
        assignedRow = i
        rowEndTimes[i] = slot.endMinutes
        break
      }
    }

    // 새 row 필요
    if (assignedRow === -1) {
      assignedRow = rowEndTimes.length
      rowEndTimes.push(slot.endMinutes)
    }

    result.push({ slot, row: assignedRow })
  })

  return result
}

// 스케줄 블록 컴포넌트
function ScheduleBlockItem({
  slot,
  studentCount,
  onClick,
  startHour,
  hourHeight,
}: {
  slot: ScheduleSlot
  studentCount?: number
  onClick: () => void
  startHour: number
  hourHeight: number
}) {
  const { classData, schedule, teacher, startMinutes, endMinutes } = slot
  const duration = endMinutes - startMinutes

  // 위치 계산 (startHour 기준)
  const startOffset = startMinutes - startHour * 60
  const top = (startOffset / 60) * hourHeight
  const height = (duration / 60) * hourHeight

  const style = SUBJECT_STYLES[classData.subject as SubjectType] || SUBJECT_STYLES['수학']
  const startTime = schedule.start_time.substring(0, 5)
  const endTime = schedule.end_time.substring(0, 5)

  // 높이에 따른 컴팩트 모드
  const isCompact = height < 50

  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={cn(
              "absolute left-1 right-1 rounded-md border-l-4 px-2 py-1",
              "text-white text-left overflow-hidden",
              "transition-all duration-150 hover:shadow-lg hover:brightness-110 hover:z-20",
              "cursor-pointer",
              style.bg,
              style.border
            )}
            style={{
              top: `${top}px`,
              height: `${Math.max(height - 2, 24)}px`,
            }}
          >
            {isCompact ? (
              <div className="flex items-center justify-between h-full gap-1">
                <span className="text-xs font-bold truncate">{classData.name}</span>
                {teacher && (
                  <span className="text-[10px] opacity-80 shrink-0">{teacher.name}</span>
                )}
              </div>
            ) : (
              <div className="flex flex-col h-full justify-between">
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <div className="text-sm font-bold truncate">{classData.name}</div>
                    {teacher && (
                      <div className="text-xs opacity-90">{teacher.name}</div>
                    )}
                  </div>
                  {studentCount !== undefined && (
                    <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded shrink-0">
                      {studentCount}명
                    </span>
                  )}
                </div>
                <div className="text-xs opacity-80">
                  {startTime}-{endTime}
                </div>
              </div>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-1.5">
            <div className="font-bold">{classData.name}</div>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {startTime} - {endTime}
              </span>
              {studentCount !== undefined && (
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {studentCount}명
                </span>
              )}
            </div>
            <div className="text-sm">
              <span className="text-gray-500">과목:</span> {classData.subject}
            </div>
            {teacher && (
              <div className="text-sm">
                <span className="text-gray-500">담당:</span> {teacher.name}
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

export function WeeklyScheduleGridV2({
  classes,
  teachers,
  studentsCountMap,
  onClassClick,
}: WeeklyScheduleGridV2Props) {
  const [currentTime, setCurrentTime] = useState<Date | null>(null)

  useEffect(() => {
    setCurrentTime(new Date())
    const interval = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  // 모든 스케줄을 슬롯으로 변환
  const { scheduleSlots, startHour, endHour } = useMemo(() => {
    const slots: ScheduleSlot[] = []
    let minStart = 24 * 60
    let maxEnd = 0

    classes.forEach((classData) => {
      if (!classData.schedules) return

      classData.schedules.forEach((schedule) => {
        const dayIndex = DAYS.indexOf(schedule.day_of_week as typeof DAYS[number])
        if (dayIndex === -1) return

        const startMinutes = timeToAbsoluteMinutes(schedule.start_time)
        const endMinutes = timeToAbsoluteMinutes(schedule.end_time)

        minStart = Math.min(minStart, startMinutes)
        maxEnd = Math.max(maxEnd, endMinutes)

        const teacher = teachers.find((t) => t.id === classData.teacher_id)

        slots.push({
          classData,
          schedule,
          teacher,
          dayIndex,
          startMinutes,
          endMinutes,
        })
      })
    })

    // 시간 범위 계산 (1시간 단위로 반올림, 최소 범위 보장)
    const start = slots.length > 0 ? Math.floor(minStart / 60) : 13
    const end = slots.length > 0 ? Math.ceil(maxEnd / 60) : 22

    return {
      scheduleSlots: slots,
      startHour: Math.max(start, 9), // 최소 9시
      endHour: Math.min(end, 24), // 최대 24시
    }
  }, [classes, teachers])

  // 요일별로 그룹화 + 행 할당
  const slotsByDay = useMemo(() => {
    const grouped: Record<number, { slot: ScheduleSlot; row: number }[]> = {}
    const maxRows: Record<number, number> = {}

    DAYS.forEach((_, dayIndex) => {
      const daySlots = scheduleSlots.filter((slot) => slot.dayIndex === dayIndex)
      const assigned = assignRows(daySlots)
      grouped[dayIndex] = assigned
      maxRows[dayIndex] = assigned.length > 0
        ? Math.max(...assigned.map((a) => a.row)) + 1
        : 1
    })

    return { grouped, maxRows }
  }, [scheduleSlots])

  // 시간 범위 및 높이 계산
  const totalHours = endHour - startHour
  const hourHeight = 64 // 1시간 = 64px
  const hourLabels = Array.from({ length: totalHours }, (_, i) => startHour + i)

  // 현재 시간 표시
  const nowIndicator = useMemo(() => {
    if (!currentTime) return null

    const hours = currentTime.getHours()
    const minutes = currentTime.getMinutes()

    if (hours < startHour || hours >= endHour) return null

    const totalMinutes = hours * 60 + minutes
    const offset = totalMinutes - startHour * 60
    return (offset / 60) * hourHeight
  }, [currentTime, startHour, endHour, hourHeight])

  const currentDayIndex = currentTime ? currentTime.getDay() - 1 : -1

  // 범례
  const Legend = () => (
    <div className="flex items-center gap-4 text-xs mb-4">
      <span className="text-slate-500 font-medium">과목:</span>
      {Object.entries(SUBJECT_STYLES).map(([subject, style]) => (
        <div key={subject} className="flex items-center gap-1.5">
          <div className={cn("w-3 h-3 rounded", style.bg)} />
          <span className="text-slate-600">{subject}</span>
        </div>
      ))}
      <div className="ml-auto text-slate-500">
        총 {classes.length}개 반 | {scheduleSlots.length}개 수업
      </div>
    </div>
  )

  return (
    <div className="space-y-2">
      <Legend />

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-slate-200 bg-slate-50">
          <div className="p-2 text-center text-xs font-medium text-slate-500">시간</div>
          {DAYS.map((day, index) => (
            <div
              key={day}
              className={cn(
                'p-2 text-center text-sm font-semibold border-l border-slate-200',
                index === currentDayIndex && 'bg-blue-50 text-blue-600'
              )}
            >
              {day}
              <span className="text-xs font-normal ml-0.5 text-slate-400">요일</span>
            </div>
          ))}
        </div>

        {/* 시간표 본문 */}
        <div className="relative">
          <div
            className="grid grid-cols-[56px_repeat(7,1fr)]"
            style={{ height: `${totalHours * hourHeight}px` }}
          >
            {/* 시간 라벨 열 */}
            <div className="relative border-r border-slate-200 bg-slate-50/50">
              {hourLabels.map((hour, idx) => (
                <div
                  key={hour}
                  className="absolute left-0 right-0 flex items-start justify-end pr-1.5 text-xs text-slate-500"
                  style={{ top: `${idx * hourHeight}px` }}
                >
                  <span className="relative -top-2 bg-slate-50 px-1 font-mono">
                    {hour.toString().padStart(2, '0')}
                  </span>
                </div>
              ))}
            </div>

            {/* 요일별 열 */}
            {DAYS.map((day, dayIndex) => (
              <div
                key={day}
                className={cn(
                  'relative border-l border-slate-200',
                  dayIndex === currentDayIndex && 'bg-blue-50/20'
                )}
              >
                {/* 시간 격자선 */}
                {hourLabels.map((hour, idx) => (
                  <div
                    key={hour}
                    className="absolute left-0 right-0 border-t border-slate-100"
                    style={{ top: `${idx * hourHeight}px` }}
                  />
                ))}
                {/* 30분 격자선 */}
                {hourLabels.map((hour, idx) => (
                  <div
                    key={`${hour}-30`}
                    className="absolute left-0 right-0 border-t border-slate-50 border-dashed"
                    style={{ top: `${idx * hourHeight + hourHeight / 2}px` }}
                  />
                ))}

                {/* 수업 블록들 (행별로 분리) */}
                {slotsByDay.grouped[dayIndex].map(({ slot, row }) => {
                  const maxRows = slotsByDay.maxRows[dayIndex]
                  // 겹치는 블록이 있으면 가로로 나눔
                  const widthPercent = 100 / maxRows
                  const leftPercent = row * widthPercent

                  return (
                    <div
                      key={`${slot.classData.id}-${slot.schedule.day_of_week}-${row}`}
                      className="absolute"
                      style={{
                        left: `${leftPercent}%`,
                        width: `${widthPercent}%`,
                        top: 0,
                        bottom: 0,
                      }}
                    >
                      <ScheduleBlockItem
                        slot={slot}
                        studentCount={studentsCountMap[slot.classData.id]}
                        onClick={() => onClassClick(slot.classData)}
                        startHour={startHour}
                        hourHeight={hourHeight}
                      />
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          {/* 현재 시간 표시기 */}
          {nowIndicator !== null && currentDayIndex >= 0 && currentDayIndex < 7 && (
            <div
              className="absolute left-[56px] right-0 h-0.5 bg-red-500 z-30 pointer-events-none"
              style={{ top: `${nowIndicator}px` }}
            >
              <div className="absolute -left-1 -top-1 w-2 h-2 bg-red-500 rounded-full" />
            </div>
          )}
        </div>
      </div>

      {/* 빈 상태 */}
      {scheduleSlots.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <div className="text-4xl mb-4">📅</div>
          <div className="text-lg font-medium mb-2">표시할 시간표가 없습니다</div>
          <div className="text-sm">필터를 조정하거나 반에 시간표를 등록해주세요</div>
        </div>
      )}
    </div>
  )
}
