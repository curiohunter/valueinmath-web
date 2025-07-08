"use client"

import useSWR from "swr"
import { useCallback, useMemo } from "react"
import type { ReportTableRow, ReportFilters, ReportsApiResponse } from "@/types/reports"

// API 호출 함수
async function fetchReportStatus(
  year: number,
  month: number,
  filters: Partial<ReportFilters>
): Promise<ReportsApiResponse<ReportTableRow[]>> {
  const params = new URLSearchParams({
    year: year.toString(),
    month: month.toString(),
  })

  // 필터 파라미터 추가
  if (filters.classIds && filters.classIds.length > 0) {
    params.set("classIds", filters.classIds.join(","))
  }
  if (filters.searchTerm) {
    params.set("search", filters.searchTerm)
  }
  if (filters.grade && filters.grade !== "all") {
    params.set("grade", filters.grade.toString())
  }

  const response = await fetch(`/api/reports/status?${params}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'same-origin', // 쿠키 포함
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "보고서 상태 조회 실패")
  }

  return response.json()
}

// 커스텀 훅
export function useMonthlyReports(
  year: number,
  month: number,
  filters: Partial<ReportFilters> = {}
) {
  // SWR 키 생성
  const swrKey = useMemo(
    () => [
      "monthly-reports",
      year,
      month,
      filters.classIds?.join(",") || "",
      filters.searchTerm || "",
      filters.grade || "all"
    ],
    [year, month, filters.classIds, filters.searchTerm, filters.grade]
  )

  // SWR 훅 사용
  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    () => fetchReportStatus(year, month, filters),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  )

  // 보고서 생성 상태 업데이트 함수
  const updateReportStatus = useCallback(
    (studentId: string, status: "generating" | "generated" | "modified", reportId?: string) => {
      mutate(
        (current) => {
          if (!current?.data) return current

          const updatedData = current.data.map((row) => {
            if (row.studentId === studentId) {
              return {
                ...row,
                reportStatus: status as any,
                reportId: reportId || row.reportId,
                generatedAt: status === "generated" ? new Date().toISOString() : row.generatedAt,
                updatedAt: new Date().toISOString(),
              }
            }
            return row
          })

          return {
            ...current,
            data: updatedData,
          }
        },
        false // 재검증하지 않음 (optimistic update)
      )
    },
    [mutate]
  )

  // 다중 보고서 상태 업데이트 함수 (일괄 생성용)
  const updateMultipleReportStatus = useCallback(
    (updates: Array<{ studentId: string; status: "generating" | "generated" | "failed"; reportId?: string }>) => {
      mutate(
        (current) => {
          if (!current?.data) return current

          const updateMap = new Map(updates.map(u => [u.studentId, u]))
          
          const updatedData = current.data.map((row) => {
            const update = updateMap.get(row.studentId)
            if (update && update.status !== "failed") {
              return {
                ...row,
                reportStatus: update.status as any,
                reportId: update.reportId || row.reportId,
                generatedAt: update.status === "generated" ? new Date().toISOString() : row.generatedAt,
                updatedAt: new Date().toISOString(),
              }
            }
            return row
          })

          return {
            ...current,
            data: updatedData,
          }
        },
        false
      )
    },
    [mutate]
  )

  // 전체 새로고침
  const refresh = useCallback(() => {
    mutate()
  }, [mutate])

  return {
    reports: data?.data || [],
    totalCount: data?.totalCount || 0,
    isLoading: !error && !data,
    isError: !!error,
    error,
    mutate,
    refresh,
    updateReportStatus,
    updateMultipleReportStatus,
  }
}