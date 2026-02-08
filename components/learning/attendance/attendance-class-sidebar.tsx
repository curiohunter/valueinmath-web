"use client"

import { useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Users, ChevronRight, Clock } from "lucide-react"
import clsx from "clsx"
import type { ClassInfo, TeacherInfo } from "@/types/learning"

interface ClassSchedule {
  class_id: string
  day_of_week: string
  start_time: string
  end_time: string
}

interface Props {
  date: string
  onDateChange: (date: string) => void
  classes: ClassInfo[]
  teachers: TeacherInfo[]
  classSchedules: ClassSchedule[]
  selectedClassId: string | null
  onClassSelect: (classId: string) => void
  attendanceCounts: Record<string, { total: number; checked: number }>
}

const DAY_OF_WEEK_KR = ["일", "월", "화", "수", "목", "금", "토"] as const

export function AttendanceClassSidebar({
  date,
  onDateChange,
  classes,
  teachers,
  classSchedules,
  selectedClassId,
  onClassSelect,
  attendanceCounts,
}: Props) {
  const dayKr = useMemo(() => {
    const d = new Date(date + "T00:00:00+09:00")
    return DAY_OF_WEEK_KR[d.getDay()]
  }, [date])

  // Filter classes that have schedule on selected day
  const todayClasses = useMemo(() => {
    const todayScheduleClassIds = new Set(
      classSchedules
        .filter((s) => s.day_of_week === dayKr)
        .map((s) => s.class_id)
    )
    return classes.filter((c) => todayScheduleClassIds.has(c.id))
  }, [classes, classSchedules, dayKr])

  // Group by teacher
  const groupedByTeacher = useMemo(() => {
    const groups: Record<string, ClassInfo[]> = {}
    for (const cls of todayClasses) {
      const tid = cls.teacher_id || "unassigned"
      if (!groups[tid]) groups[tid] = []
      groups[tid].push(cls)
    }
    // Sort teachers by name
    const sorted = Object.entries(groups).sort(([a], [b]) => {
      if (a === "unassigned") return 1
      if (b === "unassigned") return -1
      const nameA = teachers.find((t) => t.id === a)?.name || ""
      const nameB = teachers.find((t) => t.id === b)?.name || ""
      return nameA.localeCompare(nameB, "ko")
    })
    return sorted
  }, [todayClasses, teachers])

  // Get schedule time for a class
  const getScheduleTime = (classId: string): string => {
    const schedule = classSchedules.find(
      (s) => s.class_id === classId && s.day_of_week === dayKr
    )
    if (!schedule) return ""
    return `${schedule.start_time.substring(0, 5)}~${schedule.end_time.substring(0, 5)}`
  }

  return (
    <div className="w-72 flex-shrink-0 space-y-3">
      {/* Date Picker */}
      <Card className="border-0 shadow-md overflow-hidden">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-slate-300" />
            <span className="font-semibold text-slate-200 text-sm">날짜 선택</span>
          </div>
          <input
            type="date"
            className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent backdrop-blur-sm"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {new Date(date).toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/30 text-xs">
              {dayKr}요일
            </Badge>
          </div>
        </div>
      </Card>

      {/* Today's Classes */}
      <Card className="border-0 shadow-md">
        <div className="p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-600" />
              <span className="font-semibold text-slate-700 text-sm">
                오늘 수업반
              </span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {todayClasses.length}개
            </Badge>
          </div>

          {todayClasses.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm">
              {dayKr}요일에 수업이 없습니다
            </div>
          ) : (
            <div className="space-y-3">
              {groupedByTeacher.map(([teacherId, teacherClasses]) => {
                const teacherName =
                  teachers.find((t) => t.id === teacherId)?.name ||
                  (teacherId === "unassigned" ? "미배정" : "")
                return (
                  <div key={teacherId}>
                    <div className="px-2 py-1 mb-1.5">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        {teacherName} 선생님
                      </span>
                    </div>
                    <div className="space-y-1">
                      {teacherClasses.map((cls) => {
                        const isSelected = selectedClassId === cls.id
                        const counts = attendanceCounts[cls.id]
                        const scheduleTime = getScheduleTime(cls.id)
                        return (
                          <button
                            key={cls.id}
                            onClick={() => onClassSelect(cls.id)}
                            className={clsx(
                              "w-full text-left px-3 py-2.5 rounded-lg transition-all duration-150",
                              isSelected
                                ? "bg-slate-900 text-white shadow-md"
                                : "hover:bg-slate-50 text-slate-700"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">
                                  {cls.name}
                                </div>
                                {scheduleTime && (
                                  <div
                                    className={clsx(
                                      "flex items-center gap-1 mt-0.5 text-xs",
                                      isSelected
                                        ? "text-slate-400"
                                        : "text-slate-500"
                                    )}
                                  >
                                    <Clock className="w-3 h-3" />
                                    {scheduleTime}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {counts && (
                                  <span
                                    className={clsx(
                                      "text-xs font-medium tabular-nums",
                                      isSelected
                                        ? "text-teal-300"
                                        : "text-slate-400"
                                    )}
                                  >
                                    {counts.checked}/{counts.total}
                                  </span>
                                )}
                                <ChevronRight
                                  className={clsx(
                                    "w-3.5 h-3.5 transition-transform",
                                    isSelected
                                      ? "text-slate-400"
                                      : "text-slate-300"
                                  )}
                                />
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
