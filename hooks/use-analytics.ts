"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import type { 
  MonthlyReportData, 
  StudentInfo, 
  BookProgress,
  AnalyticsFilters 
} from "@/types/analytics"
import { 
  getMonthlyAnalytics, 
  generateMonthlyReport, 
  getStudentsForAnalytics,
  getTeachersForAnalytics,
  getBookProgressAnalysis 
} from "@/services/analytics-service"

// 월별 분석 데이터를 위한 훅
export function useAnalytics(studentId: string, year: number, month: number) {
  const router = useRouter()
  const [data, setData] = useState<MonthlyReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // 데이터 가져오기 함수
  const fetchData = useCallback(async () => {
    if (!studentId || studentId === "all") {
      setData(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const result = await getMonthlyAnalytics(studentId, year, month)
      
      if (result.success && result.data) {
        setData(result.data)
        setError(null)
      } else {
        throw new Error(result.error || "데이터 조회에 실패했습니다.")
      }
    } catch (err) {
      console.error("Error fetching analytics:", err)
      setError(err as Error)
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [studentId, year, month])

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

// 월별 보고서 생성을 위한 훅
export function useMonthlyReport(studentId: string, year: number, month: number) {
  const [reportText, setReportText] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // 보고서 생성 함수
  const generateReport = useCallback(async () => {
    if (!studentId || studentId === "all") {
      setError(new Error("학생을 선택해주세요."))
      return { success: false, error: "학생을 선택해주세요." }
    }

    setIsGenerating(true)
    setError(null)
    
    try {
      const result = await generateMonthlyReport(studentId, year, month)
      
      if (result.success && result.data) {
        setReportText(result.data)
        return { success: true, data: result.data }
      } else {
        throw new Error(result.error || "보고서 생성에 실패했습니다.")
      }
    } catch (err) {
      console.error("Error generating report:", err)
      setError(err as Error)
      return { success: false, error: (err as Error).message }
    } finally {
      setIsGenerating(false)
    }
  }, [studentId, year, month])

  // 보고서 초기화
  const clearReport = useCallback(() => {
    setReportText(null)
    setError(null)
  }, [])

  return {
    reportText,
    isGenerating,
    error,
    generateReport,
    clearReport
  }
}

// 학생 목록을 위한 훅
export function useStudentsForAnalytics() {
  const [students, setStudents] = useState<StudentInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // 데이터 가져오기 함수
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await getStudentsForAnalytics()
      
      if (result.success && result.data) {
        setStudents(result.data)
        setError(null)
      } else {
        throw new Error(result.error || "학생 목록 조회에 실패했습니다.")
      }
    } catch (err) {
      console.error("Error fetching students for analytics:", err)
      setError(err as Error)
      setStudents([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 컴포넌트 마운트 시 데이터 가져오기
  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    students,
    isLoading,
    error,
    mutate: fetchData
  }
}

// 선생님 목록을 위한 훅
export function useTeachersForAnalytics() {
  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // 데이터 가져오기 함수
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await getTeachersForAnalytics()
      
      if (result.success && result.data) {
        setTeachers(result.data)
        setError(null)
      } else {
        throw new Error(result.error || "선생님 목록 조회에 실패했습니다.")
      }
    } catch (err) {
      console.error("Error fetching teachers for analytics:", err)
      setError(err as Error)
      setTeachers([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 컴포넌트 마운트 시 데이터 가져오기
  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    teachers,
    isLoading,
    error,
    mutate: fetchData
  }
}

// 교재 진도 분석을 위한 훅
export function useBookProgress(studentId: string, year: number, month: number) {
  const [bookProgresses, setBookProgresses] = useState<BookProgress[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // 데이터 가져오기 함수
  const fetchData = useCallback(async () => {
    if (!studentId || studentId === "all") {
      setBookProgresses([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const result = await getBookProgressAnalysis(studentId, year, month)
      
      if (result.success && result.data) {
        setBookProgresses(result.data)
        setError(null)
      } else {
        throw new Error(result.error || "교재 진도 분석에 실패했습니다.")
      }
    } catch (err) {
      console.error("Error fetching book progress:", err)
      setError(err as Error)
      setBookProgresses([])
    } finally {
      setIsLoading(false)
    }
  }, [studentId, year, month])

  // 컴포넌트 마운트 시 데이터 가져오기
  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    bookProgresses,
    isLoading,
    error,
    mutate: fetchData
  }
}

// 종합 analytics 데이터를 위한 메인 훅
export function useAnalyticsData(filters: AnalyticsFilters) {
  const { studentId, year, month } = filters
  
  // 각각의 훅 사용
  const analyticsResult = useAnalytics(studentId, year, month)
  const studentsResult = useStudentsForAnalytics()
  const teachersResult = useTeachersForAnalytics()
  const bookProgressResult = useBookProgress(studentId, year, month)
  const reportResult = useMonthlyReport(studentId, year, month)

  // 전체 로딩 상태
  const isLoading = analyticsResult.isLoading || 
                   studentsResult.isLoading || 
                   teachersResult.isLoading ||
                   bookProgressResult.isLoading

  // 전체 에러 상태
  const error = analyticsResult.error || 
               studentsResult.error || 
               teachersResult.error ||
               bookProgressResult.error ||
               reportResult.error

  // 전체 데이터 새로고침
  const refreshAll = useCallback(() => {
    analyticsResult.mutate()
    studentsResult.mutate()
    teachersResult.mutate()
    bookProgressResult.mutate()
    reportResult.clearReport()
  }, [analyticsResult, studentsResult, teachersResult, bookProgressResult, reportResult])

  // 현재 선택된 학생 정보
  const selectedStudent = studentsResult.students.find(s => s.id === studentId) || null

  return {
    // 개별 데이터
    monthlyData: analyticsResult.data,
    students: studentsResult.students,
    teachers: teachersResult.teachers,
    bookProgresses: bookProgressResult.bookProgresses,
    reportText: reportResult.reportText,
    
    // 선택된 학생
    selectedStudent,
    
    // 상태
    isLoading,
    error,
    isGeneratingReport: reportResult.isGenerating,
    
    // 액션
    refreshAll,
    generateReport: reportResult.generateReport,
    clearReport: reportResult.clearReport,
    
    // 개별 mutate 함수들
    mutate: {
      analytics: analyticsResult.mutate,
      students: studentsResult.mutate,
      teachers: teachersResult.mutate,
      bookProgress: bookProgressResult.mutate
    }
  }
}

// 차트 데이터를 위한 유틸리티 훅
export function useChartData(monthlyData: MonthlyReportData | null) {
  const [chartData, setChartData] = useState<{
    testScores: Array<{ date: string; score: number; testName: string }>
    attendanceData: Array<{ date: string; attendance: number; homework: number; focus: number }>
  }>({
    testScores: [],
    attendanceData: []
  })

  useEffect(() => {
    if (!monthlyData) {
      setChartData({ testScores: [], attendanceData: [] })
      return
    }

    // 시험 점수 차트 데이터
    const testScores = monthlyData.testLogs
      .filter(log => log.test_score !== null)
      .map(log => ({
        date: log.date,
        score: log.test_score!,
        testName: log.test || "시험"
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // 출석/과제/집중도 차트 데이터
    const attendanceData = monthlyData.studyLogs
      .filter(log => 
        log.attendance_status !== null || 
        log.homework !== null || 
        log.focus !== null
      )
      .map(log => ({
        date: log.date,
        attendance: log.attendance_status || 0,
        homework: log.homework || 0,
        focus: log.focus || 0
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    setChartData({ testScores, attendanceData })
  }, [monthlyData])

  return chartData
}