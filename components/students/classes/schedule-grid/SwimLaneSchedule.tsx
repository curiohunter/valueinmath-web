"use client"

import { useMemo, useState } from 'react'
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
  START_HOUR,
  END_HOUR,
  timeToMinutes,
  SubjectType,
} from './types'
import { Users, Clock } from 'lucide-react'

interface SwimLaneScheduleProps {
  classes: ClassWithSchedule[]
  teachers: Teacher[]
  studentsCountMap: Record<string, number>
  onClassClick: (classData: ClassWithSchedule) => void
  selectedDay?: number // 0-6 (월-일), undefined면 전체
}

// 과목별 색상 (더 뚜렷한 대비)
const SUBJECT_STYLES: Record<SubjectType, { bg: string; border: string; text: string }> = {
  '수학': {
    bg: 'bg-blue-500',
    border: 'border-blue-400',
    text: 'text-white'
  },
  '수학특강': {
    bg: 'bg-violet-500',
    border: 'border-violet-400',
    text: 'text-white'
  },
  '과학': {
    bg: 'bg-emerald-500',
    border: 'border-emerald-400',
    text: 'text-white'
  },
  '과학특강': {
    bg: 'bg-amber-500',
    border: 'border-amber-400',
    text: 'text-white'
  },
}

// 시간을 픽셀로 변환 (1시간 = 120px)
const HOUR_WIDTH = 120
const TOTAL_HOURS = END_HOUR - START_HOUR
const TOTAL_WIDTH = TOTAL_HOURS * HOUR_WIDTH

function minutesToPixels(minutes: number): number {
  return (minutes / 60) * HOUR_WIDTH
}

// 요일 탭 컴포넌트
function DayTabs({
  selectedDay,
  onSelectDay,
  slotsCountByDay
}: {
  selectedDay: number | undefined
  onSelectDay: (day: number | undefined) => void
  slotsCountByDay: Record<number, number>
}) {
  return (
    <div className="flex items-center gap-1 mb-4 p-1 bg-slate-100 rounded-lg w-fit">
      <button
        onClick={() => onSelectDay(undefined)}
        className={cn(
          "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
          selectedDay === undefined
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
        )}
      >
        전체
      </button>
      {DAYS.map((day, index) => {
        const count = slotsCountByDay[index] || 0
        return (
          <button
            key={day}
            onClick={() => onSelectDay(index)}
            className={cn(
              "px-3 py-1.5 text-sm font-medium rounded-md transition-all relative",
              selectedDay === index
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50",
              count === 0 && "opacity-50"
            )}
          >
            {day}
            {count > 0 && (
              <span className={cn(
                "ml-1 text-xs",
                selectedDay === index ? "text-blue-600" : "text-slate-400"
              )}>
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// 스케줄 블록 컴포넌트
function ScheduleBlockItem({
  slot,
  studentCount,
  onClick,
}: {
  slot: ScheduleSlot
  studentCount?: number
  onClick: () => void
}) {
  const { classData, schedule, startMinutes, endMinutes } = slot
  const duration = endMinutes - startMinutes
  const width = minutesToPixels(duration)
  const left = minutesToPixels(startMinutes)

  const style = SUBJECT_STYLES[classData.subject as SubjectType] || SUBJECT_STYLES['수학']
  const startTime = schedule.start_time.substring(0, 5)
  const endTime = schedule.end_time.substring(0, 5)

  // 블록이 너무 좁으면 간략 표시
  const isNarrow = width < 100
  const isVeryNarrow = width < 60

  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={cn(
              "absolute top-1 bottom-1 rounded-md border-l-4 px-2 py-1",
              "flex flex-col justify-center overflow-hidden",
              "transition-all duration-150 hover:shadow-lg hover:scale-[1.02] hover:z-10",
              "cursor-pointer text-left",
              style.bg,
              style.border,
              style.text
            )}
            style={{
              left: `${left}px`,
              width: `${width - 4}px`,
            }}
          >
            {isVeryNarrow ? (
              <span className="text-[10px] font-bold truncate leading-tight">
                {classData.name.substring(0, 4)}
              </span>
            ) : isNarrow ? (
              <>
                <span className="text-xs font-bold truncate leading-tight">
                  {classData.name}
                </span>
                {studentCount !== undefined && (
                  <span className="text-[10px] opacity-80">{studentCount}명</span>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-bold truncate">{classData.name}</span>
                  {studentCount !== undefined && (
                    <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded shrink-0">
                      {studentCount}명
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs opacity-90 mt-0.5">
                  <span>{startTime}-{endTime}</span>
                  <span className="px-1 bg-white/20 rounded text-[10px]">
                    {classData.subject}
                  </span>
                </div>
              </>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="bg-slate-900 text-white border-slate-700 max-w-xs"
        >
          <div className="space-y-1.5 py-1">
            <div className="font-bold text-base">{classData.name}</div>
            <div className="flex items-center gap-4 text-sm text-slate-300">
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
              <span className="text-slate-400">과목:</span>{' '}
              <span className={cn(
                "px-1.5 py-0.5 rounded text-xs",
                style.bg
              )}>
                {classData.subject}
              </span>
            </div>
            {slot.teacher && (
              <div className="text-sm">
                <span className="text-slate-400">담당:</span> {slot.teacher.name}
              </div>
            )}
            {classData.monthly_fee && (
              <div className="text-sm">
                <span className="text-slate-400">원비:</span> {classData.monthly_fee.toLocaleString()}원
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// 선생님 레인 컴포넌트
function TeacherLane({
  teacher,
  slots,
  studentsCountMap,
  onClassClick,
}: {
  teacher: Teacher | { id: string; name: string }
  slots: ScheduleSlot[]
  studentsCountMap: Record<string, number>
  onClassClick: (classData: ClassWithSchedule) => void
}) {
  // 같은 시간대에 겹치는 블록 그룹화
  const groupedSlots = useMemo(() => {
    if (slots.length === 0) return []

    // 시작시간 순 정렬
    const sorted = [...slots].sort((a, b) => a.startMinutes - b.startMinutes)

    // 겹치는 그룹 찾기
    const groups: ScheduleSlot[][] = []
    let currentGroup: ScheduleSlot[] = [sorted[0]]
    let currentEnd = sorted[0].endMinutes

    for (let i = 1; i < sorted.length; i++) {
      const slot = sorted[i]
      if (slot.startMinutes < currentEnd) {
        // 겹침 - 같은 그룹
        currentGroup.push(slot)
        currentEnd = Math.max(currentEnd, slot.endMinutes)
      } else {
        // 안 겹침 - 새 그룹
        groups.push(currentGroup)
        currentGroup = [slot]
        currentEnd = slot.endMinutes
      }
    }
    groups.push(currentGroup)

    return groups
  }, [slots])

  // 최대 겹침 수 계산 (레인 높이 결정)
  const maxOverlap = Math.max(1, ...groupedSlots.map(g => g.length))
  const laneHeight = Math.max(48, maxOverlap * 44 + 8) // 최소 48px, 블록당 44px

  return (
    <div className="flex border-b border-slate-200 last:border-b-0">
      {/* 선생님 이름 */}
      <div
        className="w-24 shrink-0 px-3 py-2 bg-slate-50 border-r border-slate-200 flex items-center"
        style={{ minHeight: `${laneHeight}px` }}
      >
        <span className="text-sm font-semibold text-slate-700 truncate">
          {teacher.name}
        </span>
      </div>

      {/* 타임라인 */}
      <div
        className="relative flex-1 overflow-hidden"
        style={{
          minWidth: `${TOTAL_WIDTH}px`,
          height: `${laneHeight}px`
        }}
      >
        {/* 시간 격자선 */}
        {Array.from({ length: TOTAL_HOURS }, (_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 border-l border-slate-100"
            style={{ left: `${i * HOUR_WIDTH}px` }}
          />
        ))}

        {/* 겹치는 블록들을 행으로 나눔 */}
        {groupedSlots.map((group, groupIndex) => (
          <div key={groupIndex}>
            {group.map((slot, rowIndex) => (
              <div
                key={`${slot.classData.id}-${slot.schedule.day_of_week}`}
                className="absolute"
                style={{
                  top: `${4 + rowIndex * 44}px`,
                  height: '40px',
                  left: `${minutesToPixels(slot.startMinutes)}px`,
                  width: `${minutesToPixels(slot.endMinutes - slot.startMinutes)}px`,
                }}
              >
                <ScheduleBlockItem
                  slot={slot}
                  studentCount={studentsCountMap[slot.classData.id]}
                  onClick={() => onClassClick(slot.classData)}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function SwimLaneSchedule({
  classes,
  teachers,
  studentsCountMap,
  onClassClick,
}: SwimLaneScheduleProps) {
  const [selectedDay, setSelectedDay] = useState<number | undefined>(undefined)

  // 모든 스케줄을 슬롯으로 변환
  const allSlots = useMemo(() => {
    const slots: ScheduleSlot[] = []

    classes.forEach((classData) => {
      if (!classData.schedules) return

      classData.schedules.forEach((schedule) => {
        const dayIndex = DAYS.indexOf(schedule.day_of_week as typeof DAYS[number])
        if (dayIndex === -1) return

        const startMinutes = timeToMinutes(schedule.start_time)
        const endMinutes = timeToMinutes(schedule.end_time)

        if (startMinutes < 0) return

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

    return slots
  }, [classes, teachers])

  // 요일별 슬롯 수
  const slotsCountByDay = useMemo(() => {
    const counts: Record<number, number> = {}
    allSlots.forEach((slot) => {
      counts[slot.dayIndex] = (counts[slot.dayIndex] || 0) + 1
    })
    return counts
  }, [allSlots])

  // 선택된 요일 필터링
  const filteredSlots = useMemo(() => {
    if (selectedDay === undefined) return allSlots
    return allSlots.filter((slot) => slot.dayIndex === selectedDay)
  }, [allSlots, selectedDay])

  // 선생님별 그룹화
  const slotsByTeacher = useMemo(() => {
    const grouped = new Map<string, { teacher: Teacher | { id: string; name: string }; slots: ScheduleSlot[] }>()

    // 미배정 슬롯용
    const unassigned: ScheduleSlot[] = []

    filteredSlots.forEach((slot) => {
      const teacherId = slot.classData.teacher_id
      if (!teacherId) {
        unassigned.push(slot)
        return
      }

      if (!grouped.has(teacherId)) {
        const teacher = teachers.find((t) => t.id === teacherId)
        grouped.set(teacherId, {
          teacher: teacher || { id: teacherId, name: '알 수 없음' },
          slots: [],
        })
      }
      grouped.get(teacherId)!.slots.push(slot)
    })

    // 선생님 이름순 정렬
    const sorted = Array.from(grouped.values()).sort((a, b) =>
      a.teacher.name.localeCompare(b.teacher.name)
    )

    // 미배정이 있으면 맨 뒤에 추가
    if (unassigned.length > 0) {
      sorted.push({
        teacher: { id: 'unassigned', name: '미배정' },
        slots: unassigned,
      })
    }

    return sorted
  }, [filteredSlots, teachers])

  // 시간 라벨
  const hourLabels = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i)

  return (
    <div className="space-y-4">
      {/* 요일 탭 */}
      <div className="flex items-center justify-between">
        <DayTabs
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          slotsCountByDay={slotsCountByDay}
        />
        <div className="text-sm text-slate-500">
          {selectedDay !== undefined && `${DAYS[selectedDay]}요일 `}
          {filteredSlots.length}개 수업
        </div>
      </div>

      {/* 범례 */}
      <div className="flex items-center gap-4 text-xs">
        <span className="text-slate-500">과목:</span>
        {Object.entries(SUBJECT_STYLES).map(([subject, style]) => (
          <div key={subject} className="flex items-center gap-1.5">
            <div className={cn("w-3 h-3 rounded", style.bg)} />
            <span className="text-slate-600">{subject}</span>
          </div>
        ))}
      </div>

      {/* 스윔레인 그리드 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {/* 시간 헤더 */}
        <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
          <div className="w-24 shrink-0 px-3 py-2 border-r border-slate-200">
            <span className="text-xs font-medium text-slate-500">선생님</span>
          </div>
          <div
            className="flex-1 overflow-x-auto"
            style={{ minWidth: `${TOTAL_WIDTH}px` }}
          >
            <div className="flex">
              {hourLabels.map((hour) => (
                <div
                  key={hour}
                  className="text-center text-xs font-medium text-slate-500 py-2 border-l border-slate-200 first:border-l-0"
                  style={{ width: `${HOUR_WIDTH}px` }}
                >
                  {hour.toString().padStart(2, '0')}:00
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 선생님별 레인 */}
        <div className="overflow-x-auto">
          {slotsByTeacher.length > 0 ? (
            slotsByTeacher.map(({ teacher, slots }) => (
              <TeacherLane
                key={teacher.id}
                teacher={teacher}
                slots={slots}
                studentsCountMap={studentsCountMap}
                onClassClick={onClassClick}
              />
            ))
          ) : (
            <div className="text-center py-16 text-slate-500">
              <div className="text-4xl mb-4">📅</div>
              <div className="text-lg font-medium mb-2">표시할 시간표가 없습니다</div>
              <div className="text-sm">
                {selectedDay !== undefined
                  ? `${DAYS[selectedDay]}요일에 등록된 수업이 없습니다`
                  : '필터를 조정하거나 반에 시간표를 등록해주세요'
                }
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
