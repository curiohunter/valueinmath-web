"use client"

import { useMemo, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { ScheduleBlock } from './ScheduleBlock'
import { ScheduleLegend } from './ScheduleLegend'
import {
  ClassWithSchedule,
  Teacher,
  ScheduleSlot,
  DAYS,
  START_HOUR,
  END_HOUR,
  timeToMinutes,
  TOTAL_MINUTES,
} from './types'

interface WeeklyScheduleGridProps {
  classes: ClassWithSchedule[]
  teachers: Teacher[]
  studentsCountMap: Record<string, number>
  onClassClick: (classData: ClassWithSchedule) => void
}

// 겹치는 슬롯 그룹 계산
function calculateOverlapGroups(slots: ScheduleSlot[]): Map<ScheduleSlot, { columnIndex: number; totalColumns: number }> {
  const result = new Map<ScheduleSlot, { columnIndex: number; totalColumns: number }>()

  if (slots.length === 0) return result

  // 시작 시간 순으로 정렬
  const sortedSlots = [...slots].sort((a, b) => a.startMinutes - b.startMinutes)

  // 각 슬롯의 겹치는 그룹 찾기
  const groups: ScheduleSlot[][] = []

  sortedSlots.forEach((slot) => {
    // 이 슬롯과 겹치는 기존 그룹 찾기
    let addedToGroup = false

    for (const group of groups) {
      const overlapsWithGroup = group.some(
        (existingSlot) =>
          slot.startMinutes < existingSlot.endMinutes &&
          slot.endMinutes > existingSlot.startMinutes
      )

      if (overlapsWithGroup) {
        group.push(slot)
        addedToGroup = true
        break
      }
    }

    if (!addedToGroup) {
      groups.push([slot])
    }
  })

  // 각 그룹 내에서 column 할당
  groups.forEach((group) => {
    if (group.length === 1) {
      result.set(group[0], { columnIndex: 0, totalColumns: 1 })
      return
    }

    // 그룹 내 슬롯들을 시작 시간 순으로 정렬
    const sortedGroup = [...group].sort((a, b) => a.startMinutes - b.startMinutes)

    // 각 슬롯에 column 할당 (greedy algorithm)
    const columnEndTimes: number[] = []

    sortedGroup.forEach((slot) => {
      // 사용 가능한 가장 왼쪽 column 찾기
      let assignedColumn = -1
      for (let i = 0; i < columnEndTimes.length; i++) {
        if (columnEndTimes[i] <= slot.startMinutes) {
          assignedColumn = i
          columnEndTimes[i] = slot.endMinutes
          break
        }
      }

      if (assignedColumn === -1) {
        assignedColumn = columnEndTimes.length
        columnEndTimes.push(slot.endMinutes)
      }

      result.set(slot, { columnIndex: assignedColumn, totalColumns: 0 }) // totalColumns는 나중에 설정
    })

    // 그룹의 총 column 수 설정
    const totalColumns = columnEndTimes.length
    sortedGroup.forEach((slot) => {
      const existing = result.get(slot)!
      result.set(slot, { ...existing, totalColumns })
    })
  })

  return result
}

export function WeeklyScheduleGrid({
  classes,
  teachers,
  studentsCountMap,
  onClassClick,
}: WeeklyScheduleGridProps) {
  const [currentTime, setCurrentTime] = useState<Date | null>(null)

  // 현재 시간 표시 (클라이언트에서만)
  useEffect(() => {
    setCurrentTime(new Date())
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // 1분마다 업데이트

    return () => clearInterval(interval)
  }, [])

  // 모든 스케줄을 슬롯으로 변환
  const scheduleSlots = useMemo(() => {
    const slots: ScheduleSlot[] = []

    classes.forEach((classData) => {
      if (!classData.schedules) return

      classData.schedules.forEach((schedule) => {
        const dayIndex = DAYS.indexOf(schedule.day_of_week as typeof DAYS[number])
        if (dayIndex === -1) return

        const startMinutes = timeToMinutes(schedule.start_time)
        const endMinutes = timeToMinutes(schedule.end_time)

        // 시간 범위 체크 (시작 시간이 범위 밖이면 건너뜀)
        if (startMinutes < 0 || endMinutes > TOTAL_MINUTES) return

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

  // 요일별로 그룹화 + 겹침 계산
  const slotsByDayWithLayout = useMemo(() => {
    const grouped: Record<number, { slot: ScheduleSlot; layout: { columnIndex: number; totalColumns: number } }[]> = {}

    DAYS.forEach((_, dayIndex) => {
      const daySlots = scheduleSlots.filter((slot) => slot.dayIndex === dayIndex)
      const overlapInfo = calculateOverlapGroups(daySlots)

      grouped[dayIndex] = daySlots.map((slot) => ({
        slot,
        layout: overlapInfo.get(slot) || { columnIndex: 0, totalColumns: 1 },
      }))
    })

    return grouped
  }, [scheduleSlots])

  // 현재 시간 표시기 위치 계산
  const nowIndicatorPosition = useMemo(() => {
    if (!currentTime) return null

    const hours = currentTime.getHours()
    const minutes = currentTime.getMinutes()

    // 범위 체크
    if (hours < START_HOUR || hours >= END_HOUR) return null

    const totalMinutes = (hours - START_HOUR) * 60 + minutes
    return (totalMinutes / 60) * 64 // 64px = 1시간
  }, [currentTime])

  // 현재 요일 확인 (0: 일, 1: 월, ...)
  const currentDayIndex = currentTime ? currentTime.getDay() - 1 : -1 // 월=0, 토=5

  // 시간 라벨 생성
  const hourLabels = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

  return (
    <div className="space-y-4">
      {/* 범례 */}
      <div className="flex items-center justify-between">
        <ScheduleLegend />
        <div className="text-sm text-gray-500">
          총 {classes.length}개 반 | {scheduleSlots.length}개 수업
        </div>
      </div>

      {/* 그리드 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-200 bg-gray-50">
          <div className="p-3 text-center text-xs font-medium text-gray-500">시간</div>
          {DAYS.map((day, index) => (
            <div
              key={day}
              className={cn(
                'p-3 text-center text-sm font-semibold border-l border-gray-200',
                index === currentDayIndex && 'bg-blue-50 text-blue-600'
              )}
            >
              {day}
              <span className="text-xs font-normal ml-1 text-gray-400">요일</span>
            </div>
          ))}
        </div>

        {/* 시간표 본문 */}
        <div className="relative">
          <div
            className="grid grid-cols-[60px_repeat(7,1fr)]"
            style={{ height: `${(END_HOUR - START_HOUR) * 64}px` }}
          >
            {/* 시간 라벨 열 */}
            <div className="relative border-r border-gray-200 bg-gray-50/50">
              {hourLabels.map((hour) => (
                <div
                  key={hour}
                  className="absolute left-0 right-0 flex items-start justify-end pr-2 text-xs text-gray-500"
                  style={{ top: `${(hour - START_HOUR) * 64}px` }}
                >
                  <span className="relative -top-2 bg-gray-50 px-1">
                    {hour.toString().padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            {/* 요일별 열 */}
            {DAYS.map((day, dayIndex) => (
              <div
                key={day}
                className={cn(
                  'relative border-l border-gray-200',
                  dayIndex === currentDayIndex && 'bg-blue-50/30'
                )}
              >
                {/* 시간 격자선 */}
                {hourLabels.map((hour) => (
                  <div
                    key={hour}
                    className="absolute left-0 right-0 border-t border-gray-100"
                    style={{ top: `${(hour - START_HOUR) * 64}px` }}
                  />
                ))}
                {/* 30분 격자선 */}
                {hourLabels.map((hour) => (
                  <div
                    key={`${hour}-30`}
                    className="absolute left-0 right-0 border-t border-gray-50 border-dashed"
                    style={{ top: `${(hour - START_HOUR) * 64 + 32}px` }}
                  />
                ))}

                {/* 수업 블록 */}
                {slotsByDayWithLayout[dayIndex].map(({ slot, layout }, index) => (
                  <ScheduleBlock
                    key={`${slot.classData.id}-${slot.schedule.day_of_week}-${index}`}
                    slot={slot}
                    onClick={onClassClick}
                    studentCount={studentsCountMap[slot.classData.id]}
                    columnIndex={layout.columnIndex}
                    totalColumns={layout.totalColumns}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* 현재 시간 표시기 */}
          {nowIndicatorPosition !== null && currentDayIndex >= 0 && currentDayIndex < 7 && (
            <div
              className="absolute left-[60px] right-0 h-0.5 bg-red-500 z-20"
              style={{ top: `${nowIndicatorPosition}px` }}
            >
              <div className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-red-500 rounded-full" />
            </div>
          )}
        </div>
      </div>

      {/* 안내 메시지 */}
      {scheduleSlots.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-4">📅</div>
          <div className="text-lg font-medium mb-2">표시할 시간표가 없습니다</div>
          <div className="text-sm">필터를 조정하거나 반에 시간표를 등록해주세요</div>
        </div>
      )}
    </div>
  )
}
