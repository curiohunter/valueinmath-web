"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import StudentClassTabs from "@/components/students/StudentClassTabs"
import { SessionGenerator } from "@/components/tuition-sessions/session-generator"
import { SessionTable } from "@/components/tuition-sessions/session-table"
import { createClient } from "@/lib/supabase/client"
import { generateSessionDates } from "@/services/tuition-session-service"
import { toast } from "sonner"
import type { SessionGenerationResult } from "@/types/tuition-session"

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

interface StudentInfo {
  id: string
  name: string
}

function getFirstDayOfMonth(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}-01`
}

export default function TuitionSessionsPage() {
  const supabase = createClient()

  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [teachers, setTeachers] = useState<TeacherInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [periodStartDate, setPeriodStartDate] = useState(getFirstDayOfMonth)
  const [targetSessions, setTargetSessions] = useState(8)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<SessionGenerationResult | null>(null)

  // 반 학생 목록
  const [classStudents, setClassStudents] = useState<StudentInfo[]>([])

  // Fetch classes with sessions_per_month and monthly_fee
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      try {
        const [classRes, teacherRes] = await Promise.all([
          supabase
            .from("classes")
            .select("id, name, teacher_id, monthly_fee, sessions_per_month")
            .eq("is_active", true)
            .order("name"),
          supabase.from("employees").select("id, name"),
        ])

        const classData = (classRes.data || []) as ClassInfo[]
        const teacherData = (teacherRes.data || []) as TeacherInfo[]

        const sorted = [...classData].sort((a, b) => {
          const tA =
            teacherData.find((t) => t.id === a.teacher_id)?.name || "ㅎ"
          const tB =
            teacherData.find((t) => t.id === b.teacher_id)?.name || "ㅎ"
          if (tA !== tB) return tA.localeCompare(tB, "ko")
          return a.name.localeCompare(b.name, "ko")
        })

        setClasses(sorted)
        setTeachers(teacherData)
      } catch (e) {
        console.error("Error fetching data:", e)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  // Update target sessions when class changes
  useEffect(() => {
    if (!selectedClassId) return
    const cls = classes.find((c) => c.id === selectedClassId)
    if (cls?.sessions_per_month) {
      setTargetSessions(cls.sessions_per_month)
    }
  }, [selectedClassId, classes])

  // 반 선택 시 학생 목록 로드
  useEffect(() => {
    if (!selectedClassId) {
      setClassStudents([])
      return
    }

    async function fetchStudents() {
      const { data } = await supabase
        .from("class_students")
        .select("student_id, students:student_id(id, name)")
        .eq("class_id", selectedClassId!)

      const students: StudentInfo[] = (data ?? [])
        .map((row: any) => row.students)
        .filter((s: any): s is StudentInfo => s !== null)
        .sort((a: StudentInfo, b: StudentInfo) => a.name.localeCompare(b.name, "ko"))

      setClassStudents(students)
    }
    fetchStudents()
  }, [selectedClassId])

  const handleClassSelect = useCallback((classId: string) => {
    setSelectedClassId(classId)
    setResult(null)
  }, [])

  const handleGenerate = useCallback(async () => {
    if (!selectedClassId) {
      toast.error("반을 선택하세요")
      return
    }

    setIsGenerating(true)
    try {
      const res = await generateSessionDates({
        classId: selectedClassId,
        periodStartDate,
        targetSessionCount: targetSessions,
      })
      setResult(res)
      toast.success(
        `${res.billableCount}회 세션이 생성되었습니다 (휴원 ${res.closureDays}일 제외)`
      )
    } catch (error: unknown) {
      const err = error as Error
      toast.error(err.message || "세션 생성 실패")
    } finally {
      setIsGenerating(false)
    }
  }, [selectedClassId, periodStartDate, targetSessions])

  const selectedClassName = useMemo(() => {
    return classes.find((c) => c.id === selectedClassId)?.name || ""
  }, [classes, selectedClassId])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <StudentClassTabs />
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500 mx-auto mb-4" />
          <div className="text-slate-400 text-sm">로딩 중...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <StudentClassTabs />

      <div className="flex gap-4 relative">
        {/* Sidebar */}
        <div
          className={
            "transition-all duration-300 " +
            (isSidebarOpen ? "w-80" : "w-0 overflow-hidden")
          }
        >
          <SessionGenerator
            classes={classes}
            teachers={teachers}
            selectedClassId={selectedClassId}
            onClassSelect={handleClassSelect}
            periodStartDate={periodStartDate}
            onPeriodStartDateChange={setPeriodStartDate}
            targetSessions={targetSessions}
            onTargetSessionsChange={setTargetSessions}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <SessionTable
            className={selectedClassName}
            classId={selectedClassId}
            result={result}
            students={classStudents}
            periodStartDate={periodStartDate}
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          />
        </div>
      </div>
    </div>
  )
}
