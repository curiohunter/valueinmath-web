// @ts-nocheck
"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { supabaseClient } from "@/lib/supabase/client"
import type { TuitionRow, PaymentStatus } from "@/types/tuition"

// 학원비 이력 필터 인터페이스
export interface TuitionHistoryFilters {
  dateRange: { from: string; to: string }
  classId?: string
  studentId?: string
  paymentStatus?: PaymentStatus
}

// 페이지네이션 인터페이스
export interface PaginationInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

// 학원비 이력 훅 응답 인터페이스
export interface TuitionHistoryResponse {
  data: TuitionRow[]
  pagination: PaginationInfo
  isLoading: boolean
  error: string | null
  refresh: () => void
  setPage: (page: number) => void
  setFilters: (filters: Partial<TuitionHistoryFilters>) => void
  filters: TuitionHistoryFilters
}

// 반/학생 옵션 인터페이스
export interface SelectOption {
  id: string
  name: string
}

// 메타데이터 훅 (반/학생 목록 조회)
export function useTuitionHistoryMeta() {
  const [classOptions, setClassOptions] = useState<SelectOption[]>([])
  const [studentOptions, setStudentOptions] = useState<SelectOption[]>([])
  const [classMap, setClassMap] = useState<{ [id: string]: string }>({})
  const [studentMap, setStudentMap] = useState<{ [id: string]: string }>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMeta = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const [classesResult, studentsResult] = await Promise.all([
        supabaseClient.from("classes").select("id,name").eq("is_active", true),
        supabaseClient.from("students").select("id,name").eq("is_active", true)
      ])

      if (classesResult.error) throw classesResult.error
      if (studentsResult.error) throw studentsResult.error

      const classes = classesResult.data || []
      const students = studentsResult.data || []

      setClassOptions(classes)
      setStudentOptions(students)
      setClassMap(Object.fromEntries(classes.map(c => [c.id, c.name])))
      setStudentMap(Object.fromEntries(students.map(s => [s.id, s.name])))
    } catch (e) {
      console.error("메타데이터 fetch 에러:", e)
      setError("반/학생 정보를 불러오는 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMeta()
  }, [fetchMeta])

  return {
    classOptions,
    studentOptions,
    classMap,
    studentMap,
    isLoading,
    error,
    refresh: fetchMeta
  }
}

// 학원비 이력 데이터 훅
export function useTuitionHistoryWithFilters(
  initialFilters?: Partial<TuitionHistoryFilters>,
  pageSize = 12
): TuitionHistoryResponse {
  // 기본 필터 설정 (이번 달)
  const defaultFilters = useMemo(() => {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth() + 1
    const firstDay = `${year}-${month.toString().padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const lastDayStr = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`
    
    return {
      dateRange: { from: firstDay, to: lastDayStr },
      classId: "",
      studentId: "",
      paymentStatus: undefined
    } as TuitionHistoryFilters
  }, [])

  // 상태 관리
  const [filters, setFiltersState] = useState<TuitionHistoryFilters>({
    ...defaultFilters,
    ...initialFilters
  })
  const [allData, setAllData] = useState<TuitionRow[]>([])
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 페이지네이션된 데이터 계산
  const paginatedData = useMemo(() => {
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    return allData.slice(startIndex, endIndex)
  }, [allData, page, pageSize])

  // 페이지네이션 정보 계산
  const pagination = useMemo<PaginationInfo>(() => ({
    page,
    pageSize,
    total: allData.length,
    totalPages: Math.ceil(allData.length / pageSize)
  }), [allData.length, page, pageSize])

  // 데이터 페칭 함수
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      let query = supabaseClient
        .from("tuition_fees")
        .select(`
          id,
          class_id,
          student_id,
          year,
          month,
          is_sibling,
          class_type,
          amount,
          note,
          payment_status,
          payment_date,
          classes!inner(name),
          students!inner(name)
        `)

      // 날짜 범위 필터 (YYYY-MM 형식을 년/월로 변환)
      if (filters.dateRange.from) {
        const [fromYear, fromMonth] = filters.dateRange.from.split('-').map(Number)
        if (fromYear && fromMonth) {
          // 시작 연월 조건: (year > fromYear) OR (year = fromYear AND month >= fromMonth)
          query = query.or(`year.gt.${fromYear},and(year.eq.${fromYear},month.gte.${fromMonth})`)
        }
      }
      
      if (filters.dateRange.to) {
        const [toYear, toMonth] = filters.dateRange.to.split('-').map(Number)
        if (toYear && toMonth) {
          // 종료 연월 조건: (year < toYear) OR (year = toYear AND month <= toMonth)
          query = query.or(`year.lt.${toYear},and(year.eq.${toYear},month.lte.${toMonth})`)
        }
      }

      // 반 필터
      if (filters.classId) {
        query = query.eq("class_id", filters.classId)
      }

      // 학생 필터
      if (filters.studentId) {
        query = query.eq("student_id", filters.studentId)
      }

      // 납부 상태 필터
      if (filters.paymentStatus) {
        query = query.eq("payment_status", filters.paymentStatus)
      }

      // 정렬: 최신 순 (년도 내림차순, 월 내림차순)
      query = query.order("year", { ascending: false }).order("month", { ascending: false })

      const { data, error: queryError } = await query

      if (queryError) throw queryError

      // 데이터 변환
      const transformedData: TuitionRow[] = (data || []).map(item => ({
        id: item.id,
        classId: item.class_id,
        className: (item.classes as any)?.name || '',
        studentId: item.student_id,
        studentName: (item.students as any)?.name || '',
        year: item.year,
        month: item.month,
        isSibling: item.is_sibling || false,
        classType: item.class_type,
        amount: item.amount,
        note: item.note || '',
        paymentStatus: item.payment_status,
        paymentDate: item.payment_date || undefined
      }))

      // 클라이언트 사이드에서 반 이름으로 추가 정렬
      transformedData.sort((a, b) => {
        // 먼저 년도로 비교 (내림차순)
        if (a.year !== b.year) return b.year - a.year;
        // 같은 년도면 월로 비교 (내림차순)
        if (a.month !== b.month) return b.month - a.month;
        // 같은 년월이면 반 이름으로 비교 (오름차순)
        return a.className.localeCompare(b.className, 'ko');
      })

      setAllData(transformedData)
      setPage(1) // 새 검색 시 첫 페이지로
    } catch (e) {
      console.error("학원비 이력 fetch 에러:", e)
      setError("데이터를 불러오는 중 오류가 발생했습니다.")
      setAllData([])
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  // 필터 업데이트 함수
  const setFilters = useCallback((newFilters: Partial<TuitionHistoryFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }))
  }, [])

  // 페이지 설정 함수 (범위 검증 포함)
  const setPageSafe = useCallback((newPage: number) => {
    const maxPage = Math.ceil(allData.length / pageSize)
    const validPage = Math.max(1, Math.min(newPage, maxPage || 1))
    setPage(validPage)
  }, [allData.length, pageSize])

  // 새로고침 함수
  const refresh = useCallback(() => {
    fetchData()
  }, [fetchData])

  // 필터 변경 시 자동 데이터 페칭
  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data: paginatedData,
    pagination,
    isLoading,
    error,
    refresh,
    setPage: setPageSafe,
    setFilters,
    filters
  }
}

// 검색 헬퍼 함수 (반/학생 이름을 ID로 변환)
export function useSearchHelpers(classOptions: SelectOption[], studentOptions: SelectOption[]) {
  const searchClassByName = useCallback((name: string): string => {
    if (!name.trim()) return ""
    const found = classOptions.find(c => 
      c.name.toLowerCase().includes(name.toLowerCase())
    )
    return found?.id || ""
  }, [classOptions])

  const searchStudentByName = useCallback((name: string): string => {
    if (!name.trim()) return ""
    const found = studentOptions.find(s => 
      s.name.toLowerCase().includes(name.toLowerCase())
    )
    return found?.id || ""
  }, [studentOptions])

  return { searchClassByName, searchStudentByName }
}

// 편의 통합 훅
export function useTuitionHistory(initialFilters?: Partial<TuitionHistoryFilters>, pageSize = 12) {
  const historyResult = useTuitionHistoryWithFilters(initialFilters, pageSize)
  const metaResult = useTuitionHistoryMeta()
  const searchHelpers = useSearchHelpers(metaResult.classOptions, metaResult.studentOptions)

  return {
    ...historyResult,
    meta: metaResult,
    search: searchHelpers
  }
}