"use client"

import { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"
import type { CohortData, GradeBreakdown, EnrolledGradeBreakdown, PeriodFilter, ChartDataPoint } from "../types"

export function useCohortData() {
  const [cohortData, setCohortData] = useState<CohortData[]>([])
  const [cohortAggregated, setCohortAggregated] = useState<CohortData[]>([])
  const [cohortLeadSources, setCohortLeadSources] = useState<string[]>([])
  const [selectedLeadSource, setSelectedLeadSource] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [expandedCohorts, setExpandedCohorts] = useState<Set<string>>(new Set())
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("1year")
  const [isCohortTableExpanded, setIsCohortTableExpanded] = useState(true)
  const [cohortGradeData, setCohortGradeData] = useState<Record<string, GradeBreakdown[]>>({})
  const [cohortEnrolledGradeData, setCohortEnrolledGradeData] = useState<Record<string, EnrolledGradeBreakdown[]>>({})
  const [loadingCohortDetails, setLoadingCohortDetails] = useState<Set<string>>(new Set())

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/funnel/cohort")
      if (res.ok) {
        const data = await res.json()
        setCohortData(data.data || [])
        setCohortAggregated(data.aggregated || [])
        setCohortLeadSources(data.leadSources || [])
      }
    } catch (error) {
      console.error("Failed to load cohort data:", error)
      toast.error("코호트 데이터를 불러오는데 실패했습니다.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // 기간 필터 적용된 코호트 데이터
  const filteredCohortData = useMemo(() => {
    const baseData = selectedLeadSource === "all" ? cohortAggregated : cohortData.filter(d => d.lead_source === selectedLeadSource)

    if (periodFilter === "all") {
      return baseData
    }

    const now = new Date()
    const monthsBack = periodFilter === "6months" ? 6 : 12
    const cutoffDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1)
    const cutoffStr = cutoffDate.toISOString().slice(0, 7)

    return baseData.filter(d => d.cohort_month >= cutoffStr)
  }, [cohortData, cohortAggregated, selectedLeadSource, periodFilter])

  // 코호트별 학년 데이터 가져오기
  const fetchCohortGradeData = async (cohortMonth: string, leadSource: string | null) => {
    const cacheKey = `${cohortMonth}-${leadSource || 'all'}`

    if (loadingCohortDetails.has(cacheKey) || cohortGradeData[cacheKey]) {
      return
    }

    setLoadingCohortDetails(prev => new Set(prev).add(cacheKey))

    try {
      const params = new URLSearchParams({ cohort_month: cohortMonth })
      if (leadSource && leadSource !== 'all') {
        params.append('lead_source', leadSource)
      }

      const res = await fetch(`/api/funnel/cohort/details?${params}`)
      if (res.ok) {
        const data = await res.json()
        setCohortGradeData(prev => ({
          ...prev,
          [cacheKey]: data.gradeBreakdown || []
        }))
        setCohortEnrolledGradeData(prev => ({
          ...prev,
          [cacheKey]: data.enrolledGradeBreakdown || []
        }))
      }
    } catch (error) {
      console.error('Failed to fetch cohort grade data:', error)
    } finally {
      setLoadingCohortDetails(prev => {
        const next = new Set(prev)
        next.delete(cacheKey)
        return next
      })
    }
  }

  // 코호트 행 토글
  const toggleCohortExpand = (cohortKey: string, cohortMonth: string, leadSource: string | undefined) => {
    setExpandedCohorts(prev => {
      const next = new Set(prev)
      if (next.has(cohortKey)) {
        next.delete(cohortKey)
      } else {
        next.add(cohortKey)
        fetchCohortGradeData(cohortMonth, leadSource || null)
      }
      return next
    })
  }

  // 코호트 요약 통계
  const cohortSummary = useMemo(() => {
    const data = filteredCohortData
    if (data.length === 0) return null

    const completedCohorts = data.filter(c => !c.is_ongoing)
    const recent3Months = completedCohorts.slice(0, 3)
    const older3Months = completedCohorts.slice(3, 6)

    const recent3Avg = recent3Months.length > 0
      ? recent3Months.reduce((sum, c) => sum + c.final_conversion_rate, 0) / recent3Months.length
      : 0

    const older3Avg = older3Months.length > 0
      ? older3Months.reduce((sum, c) => sum + c.final_conversion_rate, 0) / older3Months.length
      : 0

    const conversionChange = recent3Avg - older3Avg

    const ongoingCohorts = data.filter(c => c.is_ongoing)
    const totalOngoing = ongoingCohorts.reduce((sum, c) => sum + c.total_students, 0)
    const convertedOngoing = ongoingCohorts.reduce((sum, c) => sum + c.enroll_total, 0)

    const cohortsWithDays = completedCohorts.filter(c => c.avg_days_to_enroll !== null)
    const avgDaysToEnroll = cohortsWithDays.length > 0
      ? cohortsWithDays.reduce((sum, c) => sum + (c.avg_days_to_enroll || 0), 0) / cohortsWithDays.length
      : null

    const allCohorts = data
    const bestCohort = allCohorts.length > 0
      ? allCohorts.reduce((best, c) => c.final_conversion_rate > best.final_conversion_rate ? c : best)
      : null
    const worstCohort = allCohorts.length > 0
      ? allCohorts.reduce((worst, c) => c.final_conversion_rate < worst.final_conversion_rate ? c : worst)
      : null

    return {
      recent3Avg: Math.round(recent3Avg * 10) / 10,
      conversionChange: Math.round(conversionChange * 10) / 10,
      totalOngoing,
      convertedOngoing,
      ongoingConversionRate: totalOngoing > 0 ? Math.round((convertedOngoing / totalOngoing) * 1000) / 10 : 0,
      avgDaysToEnroll: avgDaysToEnroll !== null ? Math.round(avgDaysToEnroll) : null,
      bestCohort,
      worstCohort,
    }
  }, [filteredCohortData])

  // 차트 데이터 (YoY 포함)
  const chartData = useMemo((): ChartDataPoint[] => {
    const sorted = [...filteredCohortData].sort((a, b) => a.cohort_month.localeCompare(b.cohort_month))

    const monthMap = new Map<string, number>()
    sorted.forEach(c => {
      monthMap.set(c.cohort_month, c.final_conversion_rate)
    })

    return sorted.map(c => {
      const [year, month] = c.cohort_month.split('-')
      const prevYearMonth = `${parseInt(year) - 1}-${month}`
      const prevYearRate = monthMap.get(prevYearMonth)

      let yoyChange: number | null = null
      if (prevYearRate !== undefined && prevYearRate > 0) {
        yoyChange = Math.round((c.final_conversion_rate - prevYearRate) * 10) / 10
      }

      return {
        month: c.cohort_month.slice(5),
        fullMonth: c.cohort_month,
        year: year,
        전환율: c.final_conversion_rate,
        총원: c.total_students,
        등록: c.enroll_total,
        isOngoing: c.is_ongoing,
        yoyChange,
        prevYearRate,
      }
    })
  }, [filteredCohortData])

  // 유틸리티 함수들
  const getConversionColor = (rate: number, isOngoing: boolean) => {
    if (isOngoing) return "text-gray-500"
    if (rate >= 50) return "text-emerald-600"
    if (rate >= 30) return "text-sky-600"
    if (rate >= 15) return "text-amber-600"
    return "text-red-600"
  }

  const getConversionBadgeClass = (rate: number, isOngoing: boolean) => {
    if (isOngoing) return "bg-gray-100 text-gray-600 border-gray-200"
    if (rate >= 40) return "bg-emerald-100 text-emerald-700 border-emerald-200"
    if (rate >= 20) return "bg-amber-100 text-amber-700 border-amber-200"
    return "bg-red-100 text-red-700 border-red-200"
  }

  const getDaysBadge = (days: number | null) => {
    if (days === null) return null
    if (days <= 14) return { label: "즉시등록", class: "bg-emerald-100 text-emerald-700" }
    if (days <= 30) return { label: "빠른등록", class: "bg-sky-100 text-sky-700" }
    if (days <= 60) return { label: "일반", class: "bg-gray-100 text-gray-600" }
    return { label: "지연등록", class: "bg-amber-100 text-amber-700" }
  }

  return {
    cohortData,
    cohortAggregated,
    cohortLeadSources,
    selectedLeadSource,
    setSelectedLeadSource,
    loading,
    loadData,
    expandedCohorts,
    periodFilter,
    setPeriodFilter,
    isCohortTableExpanded,
    setIsCohortTableExpanded,
    cohortGradeData,
    cohortEnrolledGradeData,
    loadingCohortDetails,
    filteredCohortData,
    toggleCohortExpand,
    cohortSummary,
    chartData,
    getConversionColor,
    getConversionBadgeClass,
    getDaysBadge,
  }
}
