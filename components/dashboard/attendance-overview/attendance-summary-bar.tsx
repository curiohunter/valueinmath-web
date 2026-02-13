"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, Calendar } from "lucide-react"
import type { SummaryStats, ClassWithSchedule } from "@/hooks/use-all-attendance"
import type { Attendance } from "@/types/attendance"
import { ATTENDANCE_STATUS_LABELS } from "@/types/attendance"

interface SearchResult {
  studentId: string
  studentName: string
  classId: string
  className: string
  status: string
  checkInAt: string | null
}

interface Props {
  date: string
  stats: SummaryStats
  todayClasses: ClassWithSchedule[]
  attendancesByClass: Record<string, Attendance[]>
  onStudentSelect: (classId: string, studentId: string) => void
}

function formatDateKR(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00+09:00")
  const days = ["일", "월", "화", "수", "목", "금", "토"]
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`
}

export function AttendanceSummaryBar({
  date,
  stats,
  todayClasses,
  attendancesByClass,
  onStudentSelect,
}: Props) {
  const [query, setQuery] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const searchResults = useMemo((): SearchResult[] => {
    if (!query.trim()) return []
    const q = query.trim().toLowerCase()
    const results: SearchResult[] = []

    for (const cls of todayClasses) {
      const classAtts = attendancesByClass[cls.id] || []
      for (const student of cls.students) {
        if (!student.name.toLowerCase().includes(q)) continue
        const att = classAtts.find(
          (a) => a.student_id === student.id && !a.is_makeup
        )
        results.push({
          studentId: student.id,
          studentName: student.name,
          classId: cls.id,
          className: cls.name,
          status: att
            ? ATTENDANCE_STATUS_LABELS[att.status]
            : "미처리",
          checkInAt: att?.check_in_at ?? null,
        })
      }
    }
    return results
  }, [query, todayClasses, attendancesByClass])

  const handleSelect = (result: SearchResult) => {
    onStudentSelect(result.classId, result.studentId)
    setQuery("")
    setIsFocused(false)
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-white rounded-lg border shadow-sm">
      {/* Date */}
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700 whitespace-nowrap">
        <Calendar className="w-4 h-4 text-slate-400" />
        {formatDateKR(date)}
      </div>

      {/* Stats badges */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant="outline" className="text-xs">
          총 {stats.totalStudents}
        </Badge>
        <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
          출석 {stats.present}
        </Badge>
        {stats.late > 0 && (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">
            지각 {stats.late}
          </Badge>
        )}
        {stats.absent > 0 && (
          <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">
            결석 {stats.absent}
          </Badge>
        )}
        {stats.pending > 0 && (
          <Badge className="bg-gray-100 text-gray-700 border-gray-200 text-xs">
            미처리 {stats.pending}
          </Badge>
        )}
      </div>

      {/* Search */}
      <div className="relative ml-auto w-full sm:w-56" ref={containerRef}>
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <Input
          className="pl-8 h-8 text-sm"
          placeholder="학생 검색..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
        />
        {isFocused && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
            {searchResults.map((r) => (
              <button
                key={`${r.classId}-${r.studentId}`}
                className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between text-sm border-b last:border-b-0"
                onClick={() => handleSelect(r)}
              >
                <div>
                  <span className="font-medium text-slate-800">{r.studentName}</span>
                  <span className="text-xs text-slate-400 ml-2">{r.className}</span>
                </div>
                <span className="text-xs text-slate-500">{r.status}</span>
              </button>
            ))}
          </div>
        )}
        {isFocused && query.trim() && searchResults.length === 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-50 p-3 text-center text-sm text-slate-400">
            검색 결과 없음
          </div>
        )}
      </div>
    </div>
  )
}
