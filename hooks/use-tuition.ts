"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import type { 
  TuitionRow, 
  TuitionFilters,
  TuitionSummary,
  TuitionFeeInput,
  ClassWithStudents,
  BulkTuitionGeneration 
} from "@/types/tuition"
import { 
  getTuitionFees, 
  getTuitionFeesByRange,
  saveTuitionFee,
  saveTuitionFees,
  getTuitionSummary,
  getClassesWithStudents,
  generateMonthlyTuition,
  deleteTuitionFee
} from "@/services/tuition-service"

// 월별 학원비 데이터를 위한 훅
export function useTuitionFees(year: number, month: number, classId?: string, studentId?: string) {
  const router = useRouter()
  const [data, setData] = useState<TuitionRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // 데이터 가져오기 함수
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await getTuitionFees(year, month, classId, studentId)
      
      if (result.success && result.data) {
        setData(result.data)
        setError(null)
      } else {
        throw new Error(result.error || "학원비 데이터 조회에 실패했습니다.")
      }
    } catch (err) {
      console.error("Error fetching tuition fees:", err)
      setError(err as Error)
      setData([])
    } finally {
      setIsLoading(false)
    }
  }, [year, month, classId, studentId])

  // 컴포넌트 마운트 시 데이터 가져오기
  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    isLoading,
    error,
    mutate: fetchData,
    refresh: () => {
      fetchData()
      router.refresh()
    }
  }
}

// 월 범위 학원비 데이터를 위한 훅
export function useTuitionFeesByRange(
  startYear: number, 
  startMonth: number, 
  endYear: number, 
  endMonth: number, 
  classId?: string, 
  studentId?: string
) {
  const router = useRouter()
  const [data, setData] = useState<TuitionRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // 데이터 가져오기 함수
  const fetchData = useCallback(async () => {
    // 유효하지 않은 연도인 경우 조회하지 않음
    if (startYear >= 9999 || endYear >= 9999) {
      setIsLoading(false)
      setData([])
      setError(null)
      return
    }
    
    setIsLoading(true)
    try {
      const result = await getTuitionFeesByRange(startYear, startMonth, endYear, endMonth, classId, studentId)
      
      if (result.success && result.data) {
        setData(result.data)
        setError(null)
      } else {
        throw new Error(result.error || "학원비 데이터 조회에 실패했습니다.")
      }
    } catch (err) {
      console.error("Error fetching tuition fees by range:", err)
      setError(err as Error)
      setData([])
    } finally {
      setIsLoading(false)
    }
  }, [startYear, startMonth, endYear, endMonth, classId, studentId])

  // 컴포넌트 마운트 시 데이터 가져오기
  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    isLoading,
    error,
    mutate: fetchData,
    refresh: () => {
      fetchData()
      router.refresh()
    }
  }
}

// 학원비 저장을 위한 훅
export function useTuitionMutate() {
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // 단일 학원비 저장
  const saveSingle = useCallback(async (data: TuitionFeeInput) => {
    setIsSaving(true)
    setError(null)
    
    try {
      const result = await saveTuitionFee(data)
      
      if (result.success) {
        return { success: true, data: result.data }
      } else {
        throw new Error(result.error || "학원비 저장에 실패했습니다.")
      }
    } catch (err) {
      console.error("Error saving tuition fee:", err)
      setError(err as Error)
      return { success: false, error: (err as Error).message }
    } finally {
      setIsSaving(false)
    }
  }, [])

  // 일괄 학원비 저장
  const saveBulk = useCallback(async (tuitionFees: TuitionFeeInput[]) => {
    setIsSaving(true)
    setError(null)
    
    try {
      const result = await saveTuitionFees(tuitionFees)
      
      if (result.success) {
        return { success: true, data: result.data }
      } else {
        throw new Error(result.error || "일괄 학원비 저장에 실패했습니다.")
      }
    } catch (err) {
      console.error("Error saving tuition fees:", err)
      setError(err as Error)
      return { success: false, error: (err as Error).message }
    } finally {
      setIsSaving(false)
    }
  }, [])

  // 월별 학원비 자동 생성
  const generateMonthly = useCallback(async (params: BulkTuitionGeneration) => {
    setIsGenerating(true)
    setError(null)
    
    try {
      const result = await generateMonthlyTuition(params)
      
      if (result.success) {
        return { success: true, data: result.data }
      } else {
        throw new Error(result.error || "월별 학원비 생성에 실패했습니다.")
      }
    } catch (err) {
      console.error("Error generating monthly tuition:", err)
      setError(err as Error)
      return { success: false, error: (err as Error).message }
    } finally {
      setIsGenerating(false)
    }
  }, [])

  // 학원비 삭제
  const deleteSingle = useCallback(async (id: string) => {
    setIsSaving(true)
    setError(null)
    
    try {
      const result = await deleteTuitionFee(id)
      
      if (result.success) {
        return { success: true, data: result.data }
      } else {
        throw new Error(result.error || "학원비 삭제에 실패했습니다.")
      }
    } catch (err) {
      console.error("Error deleting tuition fee:", err)
      setError(err as Error)
      return { success: false, error: (err as Error).message }
    } finally {
      setIsSaving(false)
    }
  }, [])

  return {
    isSaving,
    isGenerating,
    error,
    saveSingle,
    saveBulk,
    generateMonthly,
    deleteSingle
  }
}

// 학원비 요약 정보를 위한 훅
export function useTuitionSummary(year: number, month: number) {
  const [summary, setSummary] = useState<TuitionSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // 데이터 가져오기 함수
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await getTuitionSummary(year, month)
      
      if (result.success && result.data) {
        setSummary(result.data)
        setError(null)
      } else {
        throw new Error(result.error || "학원비 요약 조회에 실패했습니다.")
      }
    } catch (err) {
      console.error("Error fetching tuition summary:", err)
      setError(err as Error)
      setSummary(null)
    } finally {
      setIsLoading(false)
    }
  }, [year, month])

  // 컴포넌트 마운트 시 데이터 가져오기
  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    summary,
    isLoading,
    error,
    mutate: fetchData
  }
}

// 반별 학생 정보를 위한 훅
export function useClassesWithStudents() {
  const [classesWithStudents, setClassesWithStudents] = useState<ClassWithStudents[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // 데이터 가져오기 함수
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await getClassesWithStudents()
      
      if (result.success && result.data) {
        setClassesWithStudents(result.data)
        setError(null)
      } else {
        throw new Error(result.error || "반별 학생 정보 조회에 실패했습니다.")
      }
    } catch (err) {
      console.error("Error fetching classes with students:", err)
      setError(err as Error)
      setClassesWithStudents([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 컴포넌트 마운트 시 데이터 가져오기
  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data: classesWithStudents,
    isLoading,
    error,
    mutate: fetchData
  }
}

// 종합 tuition 데이터를 위한 메인 훅
export function useTuitionData(filters: TuitionFilters) {
  const { year, month, classId } = filters
  
  // 각각의 훅 사용
  const tuitionFeesResult = useTuitionFees(year, month, classId)
  const summaryResult = useTuitionSummary(year, month)
  const classesResult = useClassesWithStudents()
  const mutateResult = useTuitionMutate()

  // 전체 로딩 상태
  const isLoading = tuitionFeesResult.isLoading || 
                   summaryResult.isLoading || 
                   classesResult.isLoading

  // 전체 에러 상태
  const error = tuitionFeesResult.error || 
               summaryResult.error || 
               classesResult.error ||
               mutateResult.error

  // 전체 데이터 새로고침
  const refreshAll = useCallback(() => {
    tuitionFeesResult.mutate()
    summaryResult.mutate()
    classesResult.mutate()
  }, [tuitionFeesResult, summaryResult, classesResult])

  // 필터링된 학원비 데이터
  const filteredTuitionFees = tuitionFeesResult.data.filter(fee => {
    if (filters.studentName && !fee.studentName.includes(filters.studentName)) {
      return false
    }
    if (filters.paymentStatus && fee.paymentStatus !== filters.paymentStatus) {
      return false
    }
    if (filters.classType && fee.classType !== filters.classType) {
      return false
    }
    return true
  })

  return {
    // 개별 데이터
    tuitionFees: filteredTuitionFees,
    allTuitionFees: tuitionFeesResult.data,
    summary: summaryResult.summary,
    classesWithStudents: classesResult.data,
    
    // 상태
    isLoading,
    error,
    isSaving: mutateResult.isSaving,
    isGenerating: mutateResult.isGenerating,
    
    // 액션
    refreshAll,
    saveSingle: mutateResult.saveSingle,
    saveBulk: mutateResult.saveBulk,
    generateMonthly: mutateResult.generateMonthly,
    deleteSingle: mutateResult.deleteSingle,
    
    // 개별 mutate 함수들
    mutate: {
      tuitionFees: tuitionFeesResult.mutate,
      summary: summaryResult.mutate,
      classes: classesResult.mutate
    }
  }
}

// 학원비 통계를 위한 유틸리티 훅
export function useTuitionStats(tuitionFees: TuitionRow[]) {
  const [stats, setStats] = useState<{
    monthlyStats: {
      totalAmount: number
      paidAmount: number
      unpaidAmount: number
      collectionRate: number
    }
    classStats: Array<{ className: string; totalAmount: number; paidCount: number; totalCount: number }>
    paymentStats: Array<{ status: string; count: number; percentage: number }>
  }>({
    monthlyStats: { totalAmount: 0, paidAmount: 0, unpaidAmount: 0, collectionRate: 0 },
    classStats: [],
    paymentStats: []
  })

  useEffect(() => {
    if (!tuitionFees.length) {
      setStats({
        monthlyStats: { totalAmount: 0, paidAmount: 0, unpaidAmount: 0, collectionRate: 0 },
        classStats: [],
        paymentStats: []
      })
      return
    }

    // 월별 통계
    const totalAmount = tuitionFees.reduce((sum, fee) => sum + fee.amount, 0)
    const paidAmount = tuitionFees
      .filter(fee => fee.paymentStatus === '완납')
      .reduce((sum, fee) => sum + fee.amount, 0)
    const unpaidAmount = totalAmount - paidAmount
    const collectionRate = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0

    // 반별 통계
    const classMap = new Map<string, { totalAmount: number; paidCount: number; totalCount: number }>()
    
    tuitionFees.forEach(fee => {
      const className = fee.className
      if (!classMap.has(className)) {
        classMap.set(className, { totalAmount: 0, paidCount: 0, totalCount: 0 })
      }
      
      const classData = classMap.get(className)!
      classData.totalAmount += fee.amount
      classData.totalCount++
      
      if (fee.paymentStatus === '완납') {
        classData.paidCount++
      }
    })

    const classStats = Array.from(classMap.entries()).map(([className, data]) => ({
      className,
      ...data
    }))

    // 납부 상태별 통계
    const statusMap = new Map<string, number>()
    tuitionFees.forEach(fee => {
      const status = fee.paymentStatus
      statusMap.set(status, (statusMap.get(status) || 0) + 1)
    })

    const paymentStats = Array.from(statusMap.entries()).map(([status, count]) => ({
      status,
      count,
      percentage: (count / tuitionFees.length) * 100
    }))

    setStats({
      monthlyStats: { totalAmount, paidAmount, unpaidAmount, collectionRate },
      classStats,
      paymentStats
    })
  }, [tuitionFees])

  return stats
}