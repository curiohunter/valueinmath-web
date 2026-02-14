"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { StudentStatus, Department } from "@/types/student"

export interface StudentListItem {
  id: string
  name: string
  status: StudentStatus
  department: Department | null
  grade: number | null
  school: string | null
  student_phone: string | null
  parent_phone: string | null
}

interface UseStudentListOptions {
  search?: string
  statusFilter?: StudentStatus | "all"
  departmentFilter?: Department | "all"
}

export function useStudentList(options: UseStudentListOptions = {}) {
  const { search = "", statusFilter = "all", departmentFilter = "all" } = options
  const [students, setStudents] = useState<StudentListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchStudents = useCallback(async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      let query = supabase
        .from("student_with_school_info")
        .select("id, name, status, department, grade, school, student_phone, parent_phone")
        .eq("is_active", true)
        .order("name", { ascending: true })

      const { data, error } = await query

      if (error) throw error
      setStudents(
        (data || []).map((row) => ({
          id: row.id,
          name: row.name,
          status: row.status as StudentStatus,
          department: row.department as Department | null,
          grade: row.grade,
          school: row.school,
          student_phone: row.student_phone,
          parent_phone: row.parent_phone,
        }))
      )
    } catch (error) {
      console.error("Failed to load student list:", error)
      setStudents([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (search && !s.name.includes(search)) return false
      if (statusFilter !== "all" && s.status !== statusFilter) return false
      if (departmentFilter !== "all" && s.department !== departmentFilter) return false
      return true
    })
  }, [students, search, statusFilter, departmentFilter])

  return {
    students: filteredStudents,
    allStudents: students,
    isLoading,
    refetch: fetchStudents,
  }
}
