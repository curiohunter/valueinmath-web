"use client"

import useSWR from "swr"
import { useCallback } from "react"
import { getEmployeesClient, deleteEmployee as deleteEmployeeService } from "@/services/employee-service"
import type { Employee, EmployeeFilters } from "@/types/employee"

export function useEmployees(page = 1, pageSize = 10, filters: EmployeeFilters) {
  const { data, error, isLoading, mutate } = useSWR(
    [`employees`, page, pageSize, filters],
    () => getEmployeesClient(page, pageSize, filters),
    {
      revalidateOnFocus: false,
    },
  )

  const deleteEmployee = useCallback(
    async (id: string) => {
      try {
        const result = await deleteEmployeeService(id)

        if (!result.error) {
          // 삭제 성공 시 캐시 업데이트
          mutate()
          return { success: true }
        }

        return { success: false, error: result.error }
      } catch (error) {
        console.error("Error deleting employee:", error)
        return { success: false, error }
      }
    },
    [mutate],
  )

  return {
    employees: data?.employees || ([] as Employee[]),
    totalCount: data?.totalCount || 0,
    isLoading,
    error,
    mutate,
    deleteEmployee,
  }
}
