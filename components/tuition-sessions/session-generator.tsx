"use client"

import { useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Calendar,
  Users,
  ChevronRight,
  Calculator,
  Sparkles,
  Clock,
} from "lucide-react"
import clsx from "clsx"

interface ClassInfo {
  id: string
  name: string
  teacher_id: string | null
  monthly_fee: number | null
  sessions_per_month: number | null
}

interface TeacherInfo {
  id: string
  name: string
}

interface Props {
  classes: ClassInfo[]
  teachers: TeacherInfo[]
  selectedClassId: string | null
  onClassSelect: (classId: string) => void
  periodStartDate: string
  onPeriodStartDateChange: (date: string) => void
  targetSessions: number
  onTargetSessionsChange: (count: number) => void
  onGenerate: () => void
  isGenerating: boolean
}

export function SessionGenerator({
  classes,
  teachers,
  selectedClassId,
  onClassSelect,
  periodStartDate,
  onPeriodStartDateChange,
  targetSessions,
  onTargetSessionsChange,
  onGenerate,
  isGenerating,
}: Props) {
  // Group classes by teacher
  const groupedClasses = useMemo(() => {
    const groups: Record<string, ClassInfo[]> = {}
    for (const cls of classes) {
      const tid = cls.teacher_id || "unassigned"
      if (!groups[tid]) groups[tid] = []
      groups[tid].push(cls)
    }
    return Object.entries(groups).sort(([a], [b]) => {
      if (a === "unassigned") return 1
      if (b === "unassigned") return -1
      const nameA = teachers.find((t) => t.id === a)?.name || ""
      const nameB = teachers.find((t) => t.id === b)?.name || ""
      return nameA.localeCompare(nameB, "ko")
    })
  }, [classes, teachers])

  const selectedClass = classes.find((c) => c.id === selectedClassId)

  return (
    <div className="w-80 flex-shrink-0 space-y-3">
      {/* Period Settings */}
      <Card className="border-0 shadow-md overflow-hidden">
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="w-4 h-4 text-indigo-300" />
            <span className="font-semibold text-indigo-200 text-sm">
              세션 설정
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-indigo-300 mb-1">
                시작일
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-teal-400 backdrop-blur-sm"
                value={periodStartDate}
                onChange={(e) => onPeriodStartDateChange(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs text-indigo-300 mb-1">
                목표 회차
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={20}
                  className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-teal-400 backdrop-blur-sm"
                  value={targetSessions}
                  onChange={(e) =>
                    onTargetSessionsChange(parseInt(e.target.value) || 1)
                  }
                />
                <span className="text-sm text-indigo-300">회</span>
              </div>
            </div>

            {selectedClass && (
              <div className="pt-2 border-t border-white/10">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-indigo-400">월 수강료</span>
                  <span className="text-white font-medium">
                    {(selectedClass.monthly_fee ?? 0).toLocaleString()}원
                  </span>
                </div>
                {selectedClass.sessions_per_month && (
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="text-indigo-400">월 수업횟수</span>
                    <span className="text-white font-medium">
                      {selectedClass.sessions_per_month}회
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <Button
            onClick={onGenerate}
            disabled={!selectedClassId || isGenerating}
            className="w-full mt-4 bg-teal-500 hover:bg-teal-600 text-white font-medium disabled:opacity-40"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                계산 중...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                세션 생성
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Class Selection */}
      <Card className="border-0 shadow-md">
        <div className="p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-600" />
              <span className="font-semibold text-slate-700 text-sm">
                반 선택
              </span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {classes.length}개
            </Badge>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {groupedClasses.map(([teacherId, teacherClasses]) => {
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
                      return (
                        <button
                          key={cls.id}
                          onClick={() => onClassSelect(cls.id)}
                          className={clsx(
                            "w-full text-left px-3 py-2.5 rounded-lg transition-all duration-150",
                            isSelected
                              ? "bg-indigo-900 text-white shadow-md"
                              : "hover:bg-slate-50 text-slate-700"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">
                                {cls.name}
                              </div>
                              <div
                                className={clsx(
                                  "text-xs mt-0.5",
                                  isSelected
                                    ? "text-indigo-300"
                                    : "text-slate-400"
                                )}
                              >
                                {(cls.monthly_fee ?? 0).toLocaleString()}원
                                {cls.sessions_per_month &&
                                  ` / ${cls.sessions_per_month}회`}
                              </div>
                            </div>
                            <ChevronRight
                              className={clsx(
                                "w-3.5 h-3.5",
                                isSelected
                                  ? "text-indigo-400"
                                  : "text-slate-300"
                              )}
                            />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </Card>
    </div>
  )
}
