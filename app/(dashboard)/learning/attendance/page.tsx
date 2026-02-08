"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import LearningTabs from "@/components/learning/LearningTabs"
import { AttendanceClassSidebar } from "@/components/learning/attendance/attendance-class-sidebar"
import { AttendanceTable } from "@/components/learning/attendance/attendance-table"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { getAttendances, getMakeupAttendances } from "@/services/attendance-service"
import { getTodayScheduledMakeups } from "@/services/makeup-service"
import type { MakeupClassWithStudent } from "@/services/makeup-service"
import type { Attendance } from "@/types/attendance"
import type { ClassInfo, TeacherInfo, ClassStudent } from "@/types/learning"
import { ClipboardCheck, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ClassSchedule {
  class_id: string
  day_of_week: string
  start_time: string
  end_time: string
}

const DAY_OF_WEEK_KR = ["일", "월", "화", "수", "목", "금", "토"] as const

function getToday(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export default function AttendancePage() {
  const supabase = createClient()
  const [date, setDate] = useState(getToday)
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  // Master data
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [classStudents, setClassStudents] = useState<ClassStudent[]>([])
  const [students, setStudents] = useState<{ id: string; name: string }[]>([])
  const [teachers, setTeachers] = useState<TeacherInfo[]>([])
  const [classSchedules, setClassSchedules] = useState<ClassSchedule[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Attendance data
  const [attendances, setAttendances] = useState<Attendance[]>([])
  const [makeupAttendances, setMakeupAttendances] = useState<Attendance[]>([])
  const [scheduledMakeups, setScheduledMakeups] = useState<MakeupClassWithStudent[]>([])
  const [allAttendanceCounts, setAllAttendanceCounts] = useState<
    Record<string, { total: number; checked: number }>
  >({})

  // Fetch master data
  useEffect(() => {
    async function fetchMaster() {
      setIsLoading(true)
      try {
        const [classRes, csRes, studentRes, teacherRes, scheduleRes] =
          await Promise.all([
            supabase
              .from("classes")
              .select("id, name, teacher_id")
              .eq("is_active", true),
            supabase.from("class_students").select("class_id, student_id"),
            supabase
              .from("students")
              .select("id, name, status")
              .eq("is_active", true),
            supabase.from("employees").select("id, name"),
            supabase
              .from("class_schedules")
              .select("class_id, day_of_week, start_time, end_time"),
          ])

        const classData = classRes.data || []
        const teacherData = teacherRes.data || []

        const sortedClasses = [...classData].sort((a, b) => {
          const tA = teacherData.find((t) => t.id === a.teacher_id)?.name || "ㅎ"
          const tB = teacherData.find((t) => t.id === b.teacher_id)?.name || "ㅎ"
          if (tA !== tB) return tA.localeCompare(tB, "ko")
          return a.name.localeCompare(b.name, "ko")
        })

        setClasses(sortedClasses)
        setClassStudents(csRes.data || [])
        setStudents(
          (studentRes.data || []).filter((s) =>
            s.status?.trim().includes("재원")
          )
        )
        setTeachers(teacherData)
        setClassSchedules(
          (scheduleRes.data || []).map((s) => ({
            class_id: s.class_id,
            day_of_week: s.day_of_week,
            start_time: s.start_time,
            end_time: s.end_time,
          }))
        )
      } catch (e) {
        console.error("Error fetching master data:", e)
      } finally {
        setIsLoading(false)
      }
    }
    fetchMaster()
  }, [])

  // Compute today's classes for counting
  const todayClasses = useMemo(() => {
    const dayKr = DAY_OF_WEEK_KR[new Date(date + "T00:00:00+09:00").getDay()]
    const todayClassIds = new Set(
      classSchedules
        .filter((s) => s.day_of_week === dayKr)
        .map((s) => s.class_id)
    )
    return classes.filter((c) => todayClassIds.has(c.id))
  }, [classes, classSchedules, date])

  // Fetch attendance counts for all today classes
  const refreshAllCounts = useCallback(async () => {
    const counts: Record<string, { total: number; checked: number }> = {}
    for (const cls of todayClasses) {
      const studentIds = classStudents
        .filter((cs) => cs.class_id === cls.id)
        .map((cs) => cs.student_id)
      const activeStudents = students.filter((s) => studentIds.includes(s.id))
      const total = activeStudents.length

      try {
        const atts = await getAttendances(cls.id, date)
        const checked = atts.filter(
          (a) => !a.is_makeup && (a.check_in_at || a.status === "absent")
        ).length
        counts[cls.id] = { total, checked }
      } catch {
        counts[cls.id] = { total, checked: 0 }
      }
    }
    setAllAttendanceCounts(counts)
  }, [todayClasses, classStudents, students, date])

  useEffect(() => {
    if (!isLoading && todayClasses.length > 0) {
      refreshAllCounts()
    }
  }, [isLoading, todayClasses, refreshAllCounts])

  // Fetch attendances for selected class + all makeup
  const refreshAttendances = useCallback(async () => {
    if (!selectedClassId) return
    try {
      const [regular, makeup, scheduled] = await Promise.all([
        getAttendances(selectedClassId, date),
        getMakeupAttendances(date),
        getTodayScheduledMakeups(date),
      ])
      setAttendances(regular)
      setMakeupAttendances(makeup)
      setScheduledMakeups(scheduled)
    } catch (e) {
      console.error("Error fetching attendances:", e)
    }
  }, [selectedClassId, date])

  useEffect(() => {
    if (selectedClassId) {
      refreshAttendances()
    }
  }, [selectedClassId, date, refreshAttendances])

  const handleRefresh = useCallback(() => {
    refreshAttendances()
    refreshAllCounts()
  }, [refreshAttendances, refreshAllCounts])

  // Get students for selected class
  const selectedClassStudents = useMemo(() => {
    if (!selectedClassId) return []
    const ids = classStudents
      .filter((cs) => cs.class_id === selectedClassId)
      .map((cs) => cs.student_id)
    return students
      .filter((s) => ids.includes(s.id))
      .sort((a, b) => a.name.localeCompare(b.name, "ko"))
  }, [selectedClassId, classStudents, students])

  // Get schedule for selected class
  const selectedSchedule = useMemo(() => {
    if (!selectedClassId) return null
    const dayKr = DAY_OF_WEEK_KR[new Date(date + "T00:00:00+09:00").getDay()]
    return classSchedules.find(
      (s) => s.class_id === selectedClassId && s.day_of_week === dayKr
    )
  }, [selectedClassId, classSchedules, date])

  const selectedClassName = useMemo(() => {
    return classes.find((c) => c.id === selectedClassId)?.name || ""
  }, [classes, selectedClassId])

  // Auto-select first class
  useEffect(() => {
    if (todayClasses.length > 0 && !selectedClassId) {
      setSelectedClassId(todayClasses[0].id)
    }
  }, [todayClasses, selectedClassId])

  // Reset selection when date changes
  useEffect(() => {
    setSelectedClassId(null)
    setAttendances([])
    setMakeupAttendances([])
    setScheduledMakeups([])
  }, [date])

  // Re-select first class after date change
  useEffect(() => {
    if (todayClasses.length > 0 && !selectedClassId) {
      setSelectedClassId(todayClasses[0].id)
    }
  }, [todayClasses, selectedClassId])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LearningTabs />
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-500 mx-auto mb-4" />
          <div className="text-slate-400 text-sm">로딩 중...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <LearningTabs />

      <div className="flex gap-4 relative">
        {/* Sidebar */}
        <div
          className={
            "transition-all duration-300 " +
            (isSidebarOpen ? "w-72" : "w-0 overflow-hidden")
          }
        >
          <AttendanceClassSidebar
            date={date}
            onDateChange={setDate}
            classes={classes}
            teachers={teachers}
            classSchedules={classSchedules}
            selectedClassId={selectedClassId}
            onClassSelect={setSelectedClassId}
            attendanceCounts={allAttendanceCounts}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {selectedClassId && selectedSchedule ? (
            <AttendanceTable
              date={date}
              classId={selectedClassId}
              className={selectedClassName}
              scheduleStart={selectedSchedule.start_time.substring(0, 5)}
              scheduleEnd={selectedSchedule.end_time.substring(0, 5)}
              students={selectedClassStudents}
              attendances={attendances}
              makeupAttendances={makeupAttendances}
              scheduledMakeups={scheduledMakeups}
              onRefresh={handleRefresh}
              isSidebarOpen={isSidebarOpen}
              onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            />
          ) : (
            <Card className="bg-white rounded-xl shadow border overflow-hidden">
              <div className="flex items-center gap-3 p-4 border-b bg-gradient-to-r from-slate-50 to-gray-50">
                {!isSidebarOpen && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsSidebarOpen(true)}
                    className="h-8 w-8 p-0 bg-white border shadow-sm hover:bg-gray-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
                <h2 className="text-lg font-bold text-slate-800">출석부</h2>
                <Badge className="bg-teal-100 text-teal-700 border-teal-200 text-xs font-bold">
                  베타
                </Badge>
              </div>
              <div className="p-16 text-center">
                <ClipboardCheck className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <h3 className="text-lg font-semibold text-slate-600 mb-2">
                  {todayClasses.length === 0
                    ? "오늘 수업이 없습니다"
                    : "반을 선택하세요"}
                </h3>
                <p className="text-sm text-slate-400">
                  {todayClasses.length === 0
                    ? "왼쪽에서 다른 날짜를 선택해보세요"
                    : "왼쪽 사이드바에서 반을 클릭하면 출석부가 표시됩니다"}
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
