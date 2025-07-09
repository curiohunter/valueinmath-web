"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import type { Student, StudentFilters } from "@/types/student"
import { getStudents, deleteStudent } from "@/lib/student-client"

export function useStudents(
  page = 1,
  pageSize = 10,
  filters: StudentFilters = { search: "", department: "all", status: "all" },
) {
  const router = useRouter()
  const [data, setData] = useState<{ data: Student[]; count: number }>({ data: [], count: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // 데이터 가져오기 함수
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await getStudents(page, pageSize, filters)
      setData(result)
      setError(null)
    } catch (err) {
      console.error("Error fetching students:", err)
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [page, pageSize, filters])

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
