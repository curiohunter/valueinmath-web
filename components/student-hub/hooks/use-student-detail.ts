"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Student, StudentStatus, Department, SchoolType, LeadSource } from "@/types/student"

export function useStudentDetail(studentId: string | null) {
  const [student, setStudent] = useState<Student | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchStudent = useCallback(async () => {
    if (!studentId) {
      setStudent(null)
      return
    }

    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("student_with_school_info")
        .select("*")
        .eq("id", studentId)
        .single()

      if (error) throw error

      setStudent({
        id: data.id,
        name: data.name,
        student_phone: data.student_phone,
        parent_phone: data.parent_phone,
        parent_phone2: data.parent_phone2,
        payment_phone: data.payment_phone,
        status: data.status as StudentStatus,
        department: data.department as Department | null,
        school: data.school,
        school_type: data.school_type as SchoolType | null,
        grade: data.grade,
        lead_source: data.lead_source as LeadSource | null,
        created_by_type: (data.created_by_type as Student["created_by_type"]) || "employee",
        start_date: data.start_date,
        end_date: data.end_date,
        first_contact_date: data.first_contact_date,
        notes: data.notes,
        created_at: data.created_at || "",
        updated_at: data.updated_at || "",
        is_active: data.is_active,
        left_at: data.left_at,
        left_reason: data.left_reason,
        mathflat_student_id: data.mathflat_student_id,
        current_school_id: (data as any).current_school_id,
        school_short_name: (data as any).school_short_name,
        school_province: (data as any).school_province,
        school_district: (data as any).school_district,
      })
    } catch (error) {
      console.error("Failed to load student detail:", error)
      setStudent(null)
    } finally {
      setIsLoading(false)
    }
  }, [studentId])

  useEffect(() => {
    fetchStudent()
  }, [fetchStudent])

  return { student, isLoading, refetch: fetchStudent }
}
