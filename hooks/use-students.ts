"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { Student, StudentFilters, StudentStatus, Department, SchoolType, LeadSource } from "@/types/student"
import { getStudents, deleteStudent } from "@/lib/student-client"

// 특정 상태의 학생만 가져오는 훅 (신규상담용)
export function useStudentsByStatus(status?: string) {
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchStudents = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const supabase = createClient()
      let query = supabase
        .from('students')
        .select('*')
        .order('name', { ascending: true })
      
      // 상태 필터링
      if (status) {
        query = query.eq('status', status)
      }
      
      const { data, error: fetchError } = await query
      
      if (fetchError) {
        throw fetchError
      }
      
      // 타입 변환 - database 타입을 Student 타입으로 매핑
      const mappedStudents: Student[] = (data || []).map(row => ({
        id: row.id,
        name: row.name,
        student_phone: row.student_phone,
        parent_phone: row.parent_phone,
        parent_phone2: row.parent_phone2,
        payment_phone: row.payment_phone,
        status: row.status as StudentStatus,
        department: row.department as Department | null,
        school: row.school,
        school_type: row.school_type as SchoolType | null,
        grade: row.grade,
        lead_source: row.lead_source as LeadSource | null,
        created_by_type: (row.created_by_type as Student["created_by_type"]) || 'employee',
        start_date: row.start_date,
        end_date: row.end_date,
        first_contact_date: row.first_contact_date,
        notes: row.notes,
        created_at: row.created_at || '',
        updated_at: row.updated_at || '',
        is_active: row.is_active,
        left_at: row.left_at,
        left_reason: row.left_reason
      }))
      
      setStudents(mappedStudents)
    } catch (err) {
      console.error("Error fetching students by status:", err)
      setError(err as Error)
      setStudents([])
    } finally {
      setIsLoading(false)
    }
  }, [status])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  return {
    data: students,
    isLoading,
    error,
    refetch: fetchStudents
  }
}

// 신규상담 학생만 가져오는 특화 훅
export function useNewConsultStudents() {
  return useStudentsByStatus('신규상담')
}

export function useStudents(
  page = 1,
  pageSize = 10,
  filters: StudentFilters = { search: "", department: "all", status: "all", school_type: "all", grade: "all" },
  sortBy: string = "name",
  sortOrder: "asc" | "desc" = "asc"
) {
  const router = useRouter()
  const [data, setData] = useState<{ data: Student[]; count: number }>({ data: [], count: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // 데이터 가져오기 함수
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await getStudents(page, pageSize, filters, sortBy, sortOrder)
      setData(result)
      setError(null)
    } catch (err) {
      console.error("Error fetching students:", err)
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [page, pageSize, filters, sortBy, sortOrder])

  // 학생 삭제 함수
  const handleDeleteStudent = useCallback(
    async (id: string) => {
      try {
        const { error } = await deleteStudent(id)
        if (error) throw error

        // 데이터 다시 가져오기
        fetchData()
        // 라우터 리프레시
        router.refresh()

        return { success: true }
      } catch (err) {
        console.error("Error deleting student:", err)
        return { success: false, error: err }
      }
    },
    [fetchData, router],
  )

  // 컴포넌트 마운트 시 데이터 가져오기
  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    students: data.data,
    totalCount: data.count,
    isLoading,
    error,
    mutate: fetchData,
    deleteStudent: handleDeleteStudent,
  }
}
