"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { getTodayScheduledMakeups } from "@/services/makeup-service"
import type { Attendance } from "@/types/attendance"
import type { ClassInfo, TeacherInfo, ClassStudent } from "@/types/learning"
import type { MakeupClassWithStudent } from "@/services/makeup-service"

interface ClassSchedule {
  class_id: string
  day_of_week: string
  start_time: string
  end_time: string
}

interface StudentInfo {
  id: string
  name: string
}

export interface ClassWithSchedule extends ClassInfo {
  schedule: { start_time: string; end_time: string }
  students: StudentInfo[]
  teacherName: string
}

export interface SummaryStats {
  totalStudents: number
  present: number
  late: number
  absent: number
  pending: number
}

const DAY_OF_WEEK_KR = ["일", "월", "화", "수", "목", "금", "토"] as const

function getToday(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function useAllAttendance() {
  const supabaseRef = useRef(createClient())
  const date = getToday()

  // Master data (fetched once)
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [classStudents, setClassStudents] = useState<ClassStudent[]>([])
  const [students, setStudents] = useState<StudentInfo[]>([])
  const [teachers, setTeachers] = useState<TeacherInfo[]>([])
  const [classSchedules, setClassSchedules] = useState<ClassSchedule[]>([])
  const [masterLoaded, setMasterLoaded] = useState(false)

  // Attendance data (refreshed after actions)
  const [attendances, setAttendances] = useState<Attendance[]>([])
  const [scheduledMakeups, setScheduledMakeups] = useState<MakeupClassWithStudent[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch master data - runs once
  const fetchMasterData = useCallback(async () => {
    const supabase = supabaseRef.current
    try {
      const [classRes, csRes, studentRes, teacherRes, scheduleRes] = await Promise.all([
        supabase.from("classes").select("id, name, teacher_id").eq("is_active", true),
        supabase.from("class_students").select("class_id, student_id"),
        supabase.from("students").select("id, name, status").eq("is_active", true),
        supabase.from("employees").select("id, name"),
        supabase.from("class_schedules").select("class_id, day_of_week, start_time, end_time"),
      ])

      setClasses(classRes.data || [])
      setClassStudents(csRes.data || [])
      setStudents(
        (studentRes.data || []).filter((s) =>
          s.status?.trim().includes("재원")
        )
      )
      setTeachers(teacherRes.data || [])
      setClassSchedules(
        (scheduleRes.data || []).map((s) => ({
          class_id: s.class_id,
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
        }))
      )
      setMasterLoaded(true)
    } catch (e) {
      console.error("Error fetching master data:", e)
    }
  }, [])

  // Fetch attendance data only - fast refresh after actions
  const refreshAttendances = useCallback(async () => {
    const supabase = supabaseRef.current
    try {
      const [attRes, makeups] = await Promise.all([
        supabase
          .from("attendances")
          .select("*, students:student_id (name), classes:class_id (name)")
          .eq("attendance_date", date),
        getTodayScheduledMakeups(date),
      ])
      setAttendances((attRes.data || []) as unknown as Attendance[])
      setScheduledMakeups(makeups)
    } catch (e) {
      console.error("Error fetching attendance data:", e)
    }
  }, [date])

  // Initial load: master + attendance in parallel
  useEffect(() => {
    async function init() {
      setIsLoading(true)
      await Promise.all([fetchMasterData(), refreshAttendances()])
      setIsLoading(false)
    }
    init()
  }, [fetchMasterData, refreshAttendances])

  const todayClasses = useMemo((): ClassWithSchedule[] => {
    if (!masterLoaded) return []
    const dayKr = DAY_OF_WEEK_KR[new Date(date + "T00:00:00+09:00").getDay()]
    const scheduleMap = new Map<string, { start_time: string; end_time: string }>()
    for (const s of classSchedules) {
      if (s.day_of_week === dayKr) {
        scheduleMap.set(s.class_id, {
          start_time: s.start_time.substring(0, 5),
          end_time: s.end_time.substring(0, 5),
        })
      }
    }

    const studentIdsByClass = new Map<string, string[]>()
    for (const cs of classStudents) {
      const arr = studentIdsByClass.get(cs.class_id) || []
      arr.push(cs.student_id)
      studentIdsByClass.set(cs.class_id, arr)
    }

    const studentMap = new Map(students.map((s) => [s.id, s]))

    return classes
      .filter((c) => scheduleMap.has(c.id))
      .map((c) => {
        const schedule = scheduleMap.get(c.id)!
        const ids = studentIdsByClass.get(c.id) || []
        const classStudentList = ids
          .map((id) => studentMap.get(id))
          .filter((s): s is StudentInfo => !!s)
          .sort((a, b) => a.name.localeCompare(b.name, "ko"))
        const teacherName = teachers.find((t) => t.id === c.teacher_id)?.name || "미배정"

        return { ...c, schedule, students: classStudentList, teacherName }
      })
      .sort((a, b) => {
        if (a.teacherName !== b.teacherName)
          return a.teacherName.localeCompare(b.teacherName, "ko")
        return a.schedule.start_time.localeCompare(b.schedule.start_time)
      })
  }, [classes, classSchedules, classStudents, students, teachers, date, masterLoaded])

  const attendancesByClass = useMemo((): Record<string, Attendance[]> => {
    const map: Record<string, Attendance[]> = {}
    for (const att of attendances) {
      const key = att.class_id
      if (!map[key]) map[key] = []
      map[key].push(att)
    }
    return map
  }, [attendances])

  const makeupAttendances = useMemo(
    () => attendances.filter((a) => a.is_makeup),
    [attendances]
  )

  const summaryStats = useMemo((): SummaryStats => {
    let totalStudents = 0
    let present = 0
    let late = 0
    let absent = 0

    for (const cls of todayClasses) {
      totalStudents += cls.students.length
      const classAtts = attendancesByClass[cls.id] || []
      for (const att of classAtts) {
        if (att.is_makeup) continue
        if (att.status === "present" || att.status === "early_leave") present++
        else if (att.status === "late") late++
        else if (att.status === "absent") absent++
      }
    }

    return {
      totalStudents,
      present,
      late,
      absent,
      pending: totalStudents - present - late - absent,
    }
  }, [todayClasses, attendancesByClass])

  const teacherGroups = useMemo(() => {
    const map = new Map<string, ClassWithSchedule[]>()
    for (const cls of todayClasses) {
      const arr = map.get(cls.teacherName) || []
      arr.push(cls)
      map.set(cls.teacherName, arr)
    }
    return Array.from(map.entries()).map(([teacherName, classes]) => ({
      teacherName,
      classes,
    }))
  }, [todayClasses])

  // Find which class is currently in session (for auto-expand)
  const currentClassIds = useMemo((): Set<string> => {
    const now = new Date()
    const kstHours = parseInt(
      now.toLocaleTimeString("en-US", { timeZone: "Asia/Seoul", hour12: false, hour: "2-digit" })
    )
    const kstMinutes = parseInt(
      now.toLocaleTimeString("en-US", { timeZone: "Asia/Seoul", hour12: false, minute: "2-digit" })
    )
    const currentMinutes = kstHours * 60 + kstMinutes

    const ids = new Set<string>()
    for (const cls of todayClasses) {
      const [sh, sm] = cls.schedule.start_time.split(":").map(Number)
      const [eh, em] = cls.schedule.end_time.split(":").map(Number)
      const start = sh * 60 + sm - 30 // 30min before class
      const end = eh * 60 + em + 10 // 10min after class
      if (currentMinutes >= start && currentMinutes <= end) {
        ids.add(cls.id)
      }
    }
    return ids
  }, [todayClasses])

  return {
    date,
    isLoading,
    todayClasses,
    attendancesByClass,
    makeupAttendances,
    scheduledMakeups,
    summaryStats,
    teacherGroups,
    currentClassIds,
    students,
    refresh: refreshAttendances,
  }
}
