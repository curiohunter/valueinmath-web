"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import AnalyticsTabs from "@/components/analytics/AnalyticsTabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Loader2, Phone, MessageSquare, Users, TrendingUp, CheckCircle2, AlertTriangle, XCircle, ArrowUpDown, ChevronUp, ChevronDown, ChevronRight, Trophy, Clock, Target, BarChart3 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, Cell } from "recharts"

interface Bottleneck {
  stage: string
  dropOffRate: number
  avgDaysStuck: number
}

interface BottleneckDetail {
  stage: string
  studentCount: number
  avgConsultations: number
  avgPhone: number
  avgText: number
  avgVisit: number
  avgDaysSinceLastContact: number | null
  dropoutRate: number
}

interface LeadSourceMetrics {
  source: string
  firstContacts: number
  tests: number
  enrollments: number
  conversionRate: number
  testRate: number
  testToEnrollRate: number
  avgDaysToEnroll: number | null
  avgConsultations: number | null
  totalCost: number | null
  costPerLead: number | null
  costPerEnrollment: number | null
}

interface CohortData {
  cohort_month: string
  cohort_date: string
  lead_source?: string
  total_students: number
  test_month_0: number
  test_month_1: number
  test_month_2: number
  test_month_3: number
  test_total: number
  enroll_month_0: number
  enroll_month_1: number
  enroll_month_2: number
  enroll_month_3: number
  enroll_total: number
  final_conversion_rate: number
  avg_days_to_enroll: number | null
  is_ongoing: boolean
}

interface GradeBreakdown {
  school_type: string
  grade: number
  grade_label: string
  total_count: number
  with_test_count: number
  without_test_count: number
}

interface EnrolledGradeBreakdown {
  school_type: string
  grade: number
  grade_label: string
  total_count: number
  same_month_count: number
  delayed_count: number
}

type PeriodFilter = "6months" | "1year" | "all"

type SortField = "source" | "firstContacts" | "tests" | "enrollments" | "conversionRate" | "testRate" | "testToEnrollRate" | "avgDaysToEnroll" | "avgConsultations" | "totalCost"
type SortDirection = "asc" | "desc"

export function FunnelAnalysisPageClient() {
  const [bottlenecks, setBottlenecks] = useState<Bottleneck[]>([])
  const [bottleneckDetails, setBottleneckDetails] = useState<BottleneckDetail[]>([])
  const [successPattern, setSuccessPattern] = useState<BottleneckDetail | null>(null)
  const [leadSourceMetrics, setLeadSourceMetrics] = useState<LeadSourceMetrics[]>([])
  const [leadSourceSummary, setLeadSourceSummary] = useState<LeadSourceMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  // 코호트 관련 상태
  const [cohortData, setCohortData] = useState<CohortData[]>([])
  const [cohortAggregated, setCohortAggregated] = useState<CohortData[]>([])
  const [cohortLeadSources, setCohortLeadSources] = useState<string[]>([])
  const [selectedLeadSource, setSelectedLeadSource] = useState<string>("all")
  const [cohortLoading, setCohortLoading] = useState(false)
  const [expandedCohorts, setExpandedCohorts] = useState<Set<string>>(new Set())
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("1year")
  const [isCohortTableExpanded, setIsCohortTableExpanded] = useState(true) // 디폴트 펼침
  const [cohortGradeData, setCohortGradeData] = useState<Record<string, GradeBreakdown[]>>({})
  const [cohortEnrolledGradeData, setCohortEnrolledGradeData] = useState<Record<string, EnrolledGradeBreakdown[]>>({})
  const [loadingCohortDetails, setLoadingCohortDetails] = useState<Set<string>>(new Set())

  // 리드소스 테이블 정렬 상태
  const [sortField, setSortField] = useState<SortField>("firstContacts")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [bottlenecksRes, leadSourceRes, cohortRes] = await Promise.all([
        fetch("/api/funnel/bottlenecks"),
        fetch("/api/funnel/by-source"),
        fetch("/api/funnel/cohort"),
      ])

      if (bottlenecksRes.ok) {
        const bottlenecksData = await bottlenecksRes.json()
        setBottlenecks(bottlenecksData.data)
        setBottleneckDetails(bottlenecksData.details || [])
        setSuccessPattern(bottlenecksData.successPattern || null)
      }

      if (leadSourceRes.ok) {
        const leadSourceData = await leadSourceRes.json()
        setLeadSourceMetrics(leadSourceData.data || [])
        setLeadSourceSummary(leadSourceData.summary || null)
      }

      if (cohortRes.ok) {
        const cohortResult = await cohortRes.json()
        setCohortData(cohortResult.data || [])
        setCohortAggregated(cohortResult.aggregated || [])
        setCohortLeadSources(cohortResult.leadSources || [])
      }
    } catch (error) {
      console.error("Failed to load funnel data:", error)
      toast.error("퍼널 데이터를 불러오는데 실패했습니다.")
    } finally {
      setLoading(false)
    }
  }


  // 병목 단계에 해당하는 상세 데이터 찾기
  const getDetailForStage = (stageName: string): BottleneckDetail | null => {
    const stageMapping: Record<string, string> = {
      "첫 상담 → 입학테스트": "테스트미완료",
      "입학테스트 → 등록완료": "테스트완료-미등록",
    }
    const detailStage = stageMapping[stageName]
    return bottleneckDetails.find(d => d.stage === detailStage) || null
  }

  // 상담 횟수 상태 판단
  const getConsultationStatus = (current: number, baseline: number) => {
    const ratio = current / baseline
    if (ratio < 0.5) return { status: "critical", color: "text-red-600", bg: "bg-red-50", label: "매우 부족" }
    if (ratio < 0.8) return { status: "warning", color: "text-amber-600", bg: "bg-amber-50", label: "부족" }
    if (ratio <= 1.2) return { status: "normal", color: "text-gray-600", bg: "bg-gray-50", label: "적정" }
    return { status: "excess", color: "text-blue-600", bg: "bg-blue-50", label: "기준 초과" }
  }

  // 액션 포인트 생성
  const getActionPoints = (detail: BottleneckDetail, success: BottleneckDetail | null): string[] => {
    const actions: string[] = []
    if (!success) return actions

    if (detail.stage === "테스트미완료") {
      const gap = success.avgConsultations - detail.avgConsultations
      if (gap > 0.5) {
        actions.push(`상담 횟수가 기준 대비 ${gap.toFixed(1)}회 부족합니다. 최소 2회 이상 상담 권장`)
      }
      if (detail.avgDaysSinceLastContact && detail.avgDaysSinceLastContact > 14) {
        actions.push(`${detail.studentCount}명이 평균 ${Math.round(detail.avgDaysSinceLastContact)}일 방치 상태입니다. 즉시 팔로업 필요`)
      }
      if (detail.avgPhone < success.avgPhone) {
        actions.push(`전화 상담 비율을 높이세요 (현재 ${detail.avgPhone}회 → 목표 ${success.avgPhone}회)`)
      }
    } else if (detail.stage === "테스트완료-미등록") {
      if (detail.avgConsultations >= success.avgConsultations) {
        actions.push(`상담 횟수는 충분합니다 (${detail.avgConsultations}회). 가격/거리/경쟁학원 등 다른 요인 분석 필요`)
      }
      if (detail.avgVisit > success.avgVisit) {
        actions.push(`대면 상담이 많음에도 이탈. 상담 내용/제안 방식 점검 권장`)
      }
      if (detail.avgDaysSinceLastContact && detail.avgDaysSinceLastContact > 14) {
        actions.push(`${detail.studentCount}명 미등록 상태로 ${Math.round(detail.avgDaysSinceLastContact)}일 경과. 마지막 설득 시도 권장`)
      }
    }
    return actions
  }

  // 리드소스 테이블 정렬
  const sortedLeadSourceMetrics = useMemo(() => {
    const sorted = [...leadSourceMetrics].sort((a, b) => {
      let aVal: any = a[sortField]
      let bVal: any = b[sortField]

      // null 처리
      if (aVal === null) aVal = -Infinity
      if (bVal === null) bVal = -Infinity

      if (sortDirection === "asc") {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0
      }
    })
    return sorted
  }, [leadSourceMetrics, sortField, sortDirection])

  // 정렬 토글
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  // 정렬 아이콘
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />
    return sortDirection === "asc"
      ? <ChevronUp className="h-3 w-3 ml-1" />
      : <ChevronDown className="h-3 w-3 ml-1" />
  }

  // 기간 필터 적용된 코호트 데이터
  const periodFilteredCohortData = useMemo(() => {
    const baseData = selectedLeadSource === "all" ? cohortAggregated : cohortData.filter(d => d.lead_source === selectedLeadSource)

    if (periodFilter === "all") {
      return baseData
    }

    const now = new Date()
    const monthsBack = periodFilter === "6months" ? 6 : 12
    const cutoffDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1)
    const cutoffStr = cutoffDate.toISOString().slice(0, 7) // "YYYY-MM"

    return baseData.filter(d => d.cohort_month >= cutoffStr)
  }, [cohortData, cohortAggregated, selectedLeadSource, periodFilter])

  // 코호트 데이터 필터링 (하위 호환용)
  const filteredCohortData = periodFilteredCohortData

  // 전환율 색상
  const getConversionColor = (rate: number, isOngoing: boolean) => {
    if (isOngoing) return "text-gray-500"
    if (rate >= 50) return "text-emerald-600"
    if (rate >= 30) return "text-sky-600"
    if (rate >= 15) return "text-amber-600"
    return "text-red-600"
  }

  // 전환율 배지 색상
  const getConversionBadgeClass = (rate: number, isOngoing: boolean) => {
    if (isOngoing) return "bg-gray-100 text-gray-600 border-gray-200"
    if (rate >= 40) return "bg-emerald-100 text-emerald-700 border-emerald-200"
    if (rate >= 20) return "bg-amber-100 text-amber-700 border-amber-200"
    return "bg-red-100 text-red-700 border-red-200"
  }

  // 소요일 배지
  const getDaysBadge = (days: number | null) => {
    if (days === null) return null
    if (days <= 14) return { label: "즉시등록", class: "bg-emerald-100 text-emerald-700" }
    if (days <= 30) return { label: "빠른등록", class: "bg-sky-100 text-sky-700" }
    if (days <= 60) return { label: "일반", class: "bg-gray-100 text-gray-600" }
    return { label: "지연등록", class: "bg-amber-100 text-amber-700" }
  }

  // 코호트별 학년 데이터 가져오기 (미등록 + 등록)
  const fetchCohortGradeData = async (cohortMonth: string, leadSource: string | null) => {
    const cacheKey = `${cohortMonth}-${leadSource || 'all'}`

    // 이미 로딩 중이거나 데이터가 있으면 스킵
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
        // 미등록 학년 데이터
        setCohortGradeData(prev => ({
          ...prev,
          [cacheKey]: data.gradeBreakdown || []
        }))
        // 등록 학년 데이터
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
        // 확장될 때 학년 데이터 가져오기
        fetchCohortGradeData(cohortMonth, leadSource || null)
      }
      return next
    })
  }

  // 코호트 요약 통계 계산
  const cohortSummary = useMemo(() => {
    const data = filteredCohortData
    if (data.length === 0) return null

    // 최근 3개월 (진행중 제외)
    const completedCohorts = data.filter(c => !c.is_ongoing)
    const recent3Months = completedCohorts.slice(0, 3)
    const older3Months = completedCohorts.slice(3, 6)

    // 최근 3개월 평균 전환율
    const recent3Avg = recent3Months.length > 0
      ? recent3Months.reduce((sum, c) => sum + c.final_conversion_rate, 0) / recent3Months.length
      : 0

    // 이전 3개월 평균 전환율 (비교용)
    const older3Avg = older3Months.length > 0
      ? older3Months.reduce((sum, c) => sum + c.final_conversion_rate, 0) / older3Months.length
      : 0

    const conversionChange = recent3Avg - older3Avg

    // 진행중 코호트
    const ongoingCohorts = data.filter(c => c.is_ongoing)
    const totalOngoing = ongoingCohorts.reduce((sum, c) => sum + c.total_students, 0)
    const convertedOngoing = ongoingCohorts.reduce((sum, c) => sum + c.enroll_total, 0)

    // 평균 등록 소요일 (완료된 코호트만)
    const cohortsWithDays = completedCohorts.filter(c => c.avg_days_to_enroll !== null)
    const avgDaysToEnroll = cohortsWithDays.length > 0
      ? cohortsWithDays.reduce((sum, c) => sum + (c.avg_days_to_enroll || 0), 0) / cohortsWithDays.length
      : null

    // Best/Worst 코호트 (진행중 포함)
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

  // 차트용 데이터 (월 오름차순) + YoY 계산
  const chartData = useMemo(() => {
    const sorted = [...filteredCohortData].sort((a, b) => a.cohort_month.localeCompare(b.cohort_month))

    // 연도-월별로 매핑해서 전년 동월 찾기
    const monthMap = new Map<string, number>()
    sorted.forEach(c => {
      monthMap.set(c.cohort_month, c.final_conversion_rate)
    })

    return sorted.map(c => {
      const [year, month] = c.cohort_month.split('-')
      const prevYearMonth = `${parseInt(year) - 1}-${month}`
      const prevYearRate = monthMap.get(prevYearMonth)

      // YoY 변화율 계산 (전년 데이터 있을 때만)
      let yoyChange: number | null = null
      if (prevYearRate !== undefined && prevYearRate > 0) {
        yoyChange = Math.round((c.final_conversion_rate - prevYearRate) * 10) / 10
      }

      return {
        month: c.cohort_month.slice(5), // "2024-09" -> "09"
        fullMonth: c.cohort_month,
        year: year,
        전환율: c.final_conversion_rate,
        총원: c.total_students,
        등록: c.enroll_total,
        isOngoing: c.is_ongoing,
        yoyChange, // YoY 변화 (전년 대비 %p 차이)
        prevYearRate, // 전년도 전환율
      }
    })
  }, [filteredCohortData])


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">통계 분석</h1>
      <AnalyticsTabs />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* 병목 구간 분석 */}
          <Card>
            <CardHeader>
              <CardTitle>병목 구간 상세 분석</CardTitle>
              <CardDescription>
                이탈 구간별 상담 패턴과 등록 성공 패턴을 비교하여 액션 포인트를 도출합니다. (2024년 9월 이후)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 등록 성공 패턴 기준 배너 */}
              {successPattern && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-emerald-700 font-semibold mb-3">
                    <CheckCircle2 className="h-5 w-5" />
                    등록 성공 패턴 ({successPattern.studentCount}명 기준)
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                      <span>평균 <strong>{successPattern.avgConsultations}회</strong> 상담</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-emerald-600" />
                      <span>전화 <strong>{successPattern.avgPhone}회</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-emerald-600" />
                      <span>문자 <strong>{successPattern.avgText}회</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-emerald-600" />
                      <span>대면 <strong>{successPattern.avgVisit}회</strong></span>
                    </div>
                  </div>
                </div>
              )}

              {/* 병목 단계별 상세 분석 - 좌우 배치 */}
              {bottlenecks.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {bottlenecks.map((bottleneck, index) => {
                    const detail = getDetailForStage(bottleneck.stage)
                    const consultStatus = detail && successPattern
                      ? getConsultationStatus(detail.avgConsultations, successPattern.avgConsultations)
                      : null
                    const actions = detail ? getActionPoints(detail, successPattern) : []

                    return (
                      <div
                        key={index}
                        className={`rounded-lg border-2 overflow-hidden ${
                          bottleneck.dropOffRate > 40
                            ? "border-red-200"
                            : bottleneck.dropOffRate > 20
                            ? "border-amber-200"
                            : "border-gray-200"
                        }`}
                      >
                        {/* 헤더 */}
                        <div className={`px-4 py-3 flex items-center justify-between ${
                          bottleneck.dropOffRate > 40
                            ? "bg-red-50"
                            : bottleneck.dropOffRate > 20
                            ? "bg-amber-50"
                            : "bg-gray-50"
                        }`}>
                          <div className="flex items-center gap-3">
                            {bottleneck.dropOffRate > 40 ? (
                              <XCircle className="h-5 w-5 text-red-500" />
                            ) : bottleneck.dropOffRate > 20 ? (
                              <AlertTriangle className="h-5 w-5 text-amber-500" />
                            ) : (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            )}
                            <div>
                              <p className="font-semibold">{bottleneck.stage}</p>
                              {detail && (
                                <p className="text-sm text-muted-foreground">{detail.studentCount}명 해당</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-2xl font-bold ${
                              bottleneck.dropOffRate > 40
                                ? "text-red-600"
                                : bottleneck.dropOffRate > 20
                                ? "text-amber-600"
                                : "text-green-600"
                            }`}>
                              {bottleneck.dropOffRate}%
                            </div>
                            <p className="text-xs text-muted-foreground">이탈률</p>
                          </div>
                        </div>

                        {/* 상세 내용 */}
                        {detail && (
                          <div className="p-4 space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div className={`p-3 rounded-lg ${consultStatus?.bg || "bg-gray-50"}`}>
                                <div className="text-xs text-muted-foreground mb-1">상담 횟수</div>
                                <div className={`text-xl font-bold ${consultStatus?.color || "text-gray-600"}`}>
                                  {detail.avgConsultations}회
                                </div>
                                {successPattern && (
                                  <div className="text-xs mt-1">
                                    {detail.avgConsultations < successPattern.avgConsultations ? (
                                      <span className="text-red-500">
                                        ▼ {(successPattern.avgConsultations - detail.avgConsultations).toFixed(1)}회 부족
                                      </span>
                                    ) : detail.avgConsultations > successPattern.avgConsultations ? (
                                      <span className="text-blue-500">
                                        ▲ {(detail.avgConsultations - successPattern.avgConsultations).toFixed(1)}회 초과
                                      </span>
                                    ) : (
                                      <span className="text-green-500">기준 충족</span>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className={`p-3 rounded-lg ${
                                successPattern && detail.avgPhone < successPattern.avgPhone * 0.7
                                  ? "bg-red-50"
                                  : "bg-gray-50"
                              }`}>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                                  <Phone className="h-3 w-3" /> 전화
                                </div>
                                <div className="text-xl font-bold">{detail.avgPhone}회</div>
                                {successPattern && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    기준 {successPattern.avgPhone}회
                                  </div>
                                )}
                              </div>

                              <div className="p-3 rounded-lg bg-gray-50">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                                  <MessageSquare className="h-3 w-3" /> 문자
                                </div>
                                <div className="text-xl font-bold">{detail.avgText}회</div>
                                {successPattern && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    기준 {successPattern.avgText}회
                                  </div>
                                )}
                              </div>

                              <div className={`p-3 rounded-lg ${
                                successPattern && detail.avgVisit > successPattern.avgVisit * 1.5
                                  ? "bg-blue-50"
                                  : "bg-gray-50"
                              }`}>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                                  <Users className="h-3 w-3" /> 대면
                                </div>
                                <div className="text-xl font-bold">{detail.avgVisit}회</div>
                                {successPattern && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    기준 {successPattern.avgVisit}회
                                  </div>
                                )}
                              </div>
                            </div>

                            {actions.length > 0 && (
                              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 text-amber-700 font-medium mb-2">
                                  <AlertTriangle className="h-4 w-4" />
                                  액션 포인트
                                </div>
                                <ul className="space-y-1.5 text-sm text-amber-800">
                                  {actions.map((action, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                      <span className="text-amber-500 mt-0.5">•</span>
                                      {action}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        {!detail && (
                          <div className="p-4 text-center text-muted-foreground">
                            상세 분석 데이터가 없습니다.
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  병목 분석 데이터가 없습니다.
                </div>
              )}
            </CardContent>
          </Card>

          {/* 리드소스 성과 & 코호트 분석 탭 */}
          <Card>
            <CardHeader>
              <CardTitle>리드소스 분석</CardTitle>
              <CardDescription>유입 채널별 성과 및 월별 코호트 추적 (2024년 9월 이후)</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="lead-source" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="lead-source">리드소스별 성과</TabsTrigger>
                  <TabsTrigger value="cohort">월별 코호트 추적</TabsTrigger>
                </TabsList>

                {/* 리드소스별 성과 탭 */}
                <TabsContent value="lead-source" className="mt-4 space-y-4">
                  {/* 테이블 상단 설명 */}
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">유입 채널별 전환율 및 비용 효율 분석</p>
                  </div>

                  {sortedLeadSourceMetrics.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/30">
                            <th
                              className="text-left p-2 cursor-pointer hover:bg-muted/50 select-none"
                              onClick={() => handleSort("source")}
                            >
                              <div className="flex items-center">
                                소스 <SortIcon field="source" />
                              </div>
                            </th>
                            <th
                              className="text-center p-2 cursor-pointer hover:bg-muted/50 select-none"
                              onClick={() => handleSort("firstContacts")}
                            >
                              <div className="flex items-center justify-center">
                                첫상담 <SortIcon field="firstContacts" />
                              </div>
                            </th>
                            <th
                              className="text-center p-2 cursor-pointer hover:bg-muted/50 select-none"
                              onClick={() => handleSort("tests")}
                            >
                              <div className="flex items-center justify-center">
                                테스트 <SortIcon field="tests" />
                              </div>
                            </th>
                            <th
                              className="text-center p-2 cursor-pointer hover:bg-muted/50 select-none"
                              onClick={() => handleSort("enrollments")}
                            >
                              <div className="flex items-center justify-center">
                                등록 <SortIcon field="enrollments" />
                              </div>
                            </th>
                            <th
                              className="text-center p-2 cursor-pointer hover:bg-muted/50 select-none"
                              onClick={() => handleSort("testRate")}
                            >
                              <div className="flex items-center justify-center">
                                리드→테스트 <SortIcon field="testRate" />
                              </div>
                            </th>
                            <th
                              className="text-center p-2 cursor-pointer hover:bg-muted/50 select-none"
                              onClick={() => handleSort("testToEnrollRate")}
                            >
                              <div className="flex items-center justify-center">
                                테스트→등록 <SortIcon field="testToEnrollRate" />
                              </div>
                            </th>
                            <th
                              className="text-center p-2 cursor-pointer hover:bg-muted/50 select-none"
                              onClick={() => handleSort("conversionRate")}
                            >
                              <div className="flex items-center justify-center">
                                전체전환율 <SortIcon field="conversionRate" />
                              </div>
                            </th>
                            <th
                              className="text-center p-2 cursor-pointer hover:bg-muted/50 select-none"
                              onClick={() => handleSort("avgDaysToEnroll")}
                            >
                              <div className="flex items-center justify-center">
                                소요일 <SortIcon field="avgDaysToEnroll" />
                              </div>
                            </th>
                            <th
                              className="text-center p-2 cursor-pointer hover:bg-muted/50 select-none"
                              onClick={() => handleSort("avgConsultations")}
                            >
                              <div className="flex items-center justify-center">
                                상담횟수 <SortIcon field="avgConsultations" />
                              </div>
                            </th>
                            <th
                              className="text-center p-2 cursor-pointer hover:bg-muted/50 select-none"
                              onClick={() => handleSort("totalCost")}
                            >
                              <div className="flex items-center justify-center">
                                비용 <SortIcon field="totalCost" />
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedLeadSourceMetrics.map((source) => (
                            <tr key={source.source} className="border-b hover:bg-muted/50">
                              <td className="p-2 font-medium">{source.source}</td>
                              <td className="p-2 text-center">{source.firstContacts}</td>
                              <td className="p-2 text-center">{source.tests}</td>
                              <td className="p-2 text-center font-bold text-green-600">
                                {source.enrollments}
                              </td>
                              <td className="p-2 text-center">
                                <Badge
                                  className={
                                    source.testRate >= 70
                                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                      : source.testRate >= 50
                                      ? "bg-sky-100 text-sky-700 hover:bg-sky-100"
                                      : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                                  }
                                >
                                  {source.testRate}%
                                </Badge>
                              </td>
                              <td className="p-2 text-center">
                                <Badge
                                  className={
                                    source.testToEnrollRate >= 60
                                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                      : source.testToEnrollRate >= 40
                                      ? "bg-sky-100 text-sky-700 hover:bg-sky-100"
                                      : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                                  }
                                >
                                  {source.testToEnrollRate}%
                                </Badge>
                              </td>
                              <td className="p-2 text-center">
                                <Badge
                                  className={
                                    source.conversionRate >= 30
                                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                      : source.conversionRate >= 15
                                      ? "bg-sky-100 text-sky-700 hover:bg-sky-100"
                                      : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                                  }
                                >
                                  {source.conversionRate}%
                                </Badge>
                              </td>
                              <td className="p-2 text-center text-muted-foreground">
                                {source.avgDaysToEnroll !== null ? `${source.avgDaysToEnroll}일` : "-"}
                              </td>
                              <td className="p-2 text-center text-muted-foreground">
                                {source.avgConsultations !== null ? `${source.avgConsultations}회` : "-"}
                              </td>
                              <td className="p-2 text-center text-muted-foreground">
                                {source.totalCost !== null ? `${source.totalCost.toLocaleString()}원` : "-"}
                              </td>
                            </tr>
                          ))}
                          {leadSourceSummary && (
                            <tr className="border-t-2 bg-muted/50 font-semibold">
                              <td className="p-2">{leadSourceSummary.source}</td>
                              <td className="p-2 text-center">{leadSourceSummary.firstContacts}</td>
                              <td className="p-2 text-center">{leadSourceSummary.tests}</td>
                              <td className="p-2 text-center text-green-600">
                                {leadSourceSummary.enrollments}
                              </td>
                              <td className="p-2 text-center">
                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                  {leadSourceSummary.testRate}%
                                </Badge>
                              </td>
                              <td className="p-2 text-center">
                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                  {leadSourceSummary.testToEnrollRate}%
                                </Badge>
                              </td>
                              <td className="p-2 text-center">
                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                  {leadSourceSummary.conversionRate}%
                                </Badge>
                              </td>
                              <td className="p-2 text-center">
                                {leadSourceSummary.avgDaysToEnroll !== null ? `${leadSourceSummary.avgDaysToEnroll}일` : "-"}
                              </td>
                              <td className="p-2 text-center">
                                {leadSourceSummary.avgConsultations !== null ? `${leadSourceSummary.avgConsultations}회` : "-"}
                              </td>
                              <td className="p-2 text-center">
                                {leadSourceSummary.totalCost !== null ? `${leadSourceSummary.totalCost.toLocaleString()}원` : "-"}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                      리드 소스 데이터가 없습니다.
                    </div>
                  )}
                </TabsContent>

                {/* 월별 코호트 추적 탭 */}
                <TabsContent value="cohort" className="mt-4 space-y-6">
                  {/* 필터 영역 */}
                  <div className="flex flex-wrap items-center gap-4">
                    {/* 기간 필터 */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">기간:</span>
                      <Select value={periodFilter} onValueChange={(value: PeriodFilter) => setPeriodFilter(value)}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="6months">최근 6개월</SelectItem>
                          <SelectItem value="1year">최근 1년</SelectItem>
                          <SelectItem value="all">전체</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 리드소스 필터 */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">리드소스:</span>
                      <Select value={selectedLeadSource} onValueChange={setSelectedLeadSource}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="전체" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">전체 (합산)</SelectItem>
                          {cohortLeadSources.map(source => (
                            <SelectItem key={source} value={source}>{source}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* 상단 요약 카드 4개 */}
                  {cohortSummary && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* 최근 3개월 평균 전환율 */}
                      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-4 border border-emerald-200">
                        <div className="flex items-center gap-2 text-emerald-700 mb-2">
                          <Target className="h-4 w-4" />
                          <span className="text-xs font-medium">최근 3개월 평균</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold text-emerald-700">
                            {cohortSummary.recent3Avg}%
                          </span>
                          {cohortSummary.conversionChange !== 0 && (
                            <span className={`text-sm font-medium ${cohortSummary.conversionChange > 0 ? "text-emerald-600" : "text-red-500"}`}>
                              {cohortSummary.conversionChange > 0 ? "▲" : "▼"} {Math.abs(cohortSummary.conversionChange)}%p
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-emerald-600 mt-1">vs 이전 3개월</p>
                      </div>

                      {/* 진행중 코호트 현황 */}
                      <div className="bg-gradient-to-br from-sky-50 to-sky-100/50 rounded-xl p-4 border border-sky-200">
                        <div className="flex items-center gap-2 text-sky-700 mb-2">
                          <BarChart3 className="h-4 w-4" />
                          <span className="text-xs font-medium">진행중 코호트</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold text-sky-700">
                            {cohortSummary.convertedOngoing}/{cohortSummary.totalOngoing}
                          </span>
                          <span className="text-sm text-sky-600">명</span>
                        </div>
                        <p className="text-xs text-sky-600 mt-1">
                          현재 {cohortSummary.ongoingConversionRate}% 전환
                        </p>
                      </div>

                      {/* 평균 등록 소요일 */}
                      <div className="bg-gradient-to-br from-violet-50 to-violet-100/50 rounded-xl p-4 border border-violet-200">
                        <div className="flex items-center gap-2 text-violet-700 mb-2">
                          <Clock className="h-4 w-4" />
                          <span className="text-xs font-medium">평균 등록 소요</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold text-violet-700">
                            {cohortSummary.avgDaysToEnroll !== null ? cohortSummary.avgDaysToEnroll : "-"}
                          </span>
                          {cohortSummary.avgDaysToEnroll !== null && (
                            <span className="text-sm text-violet-600">일</span>
                          )}
                        </div>
                        <p className="text-xs text-violet-600 mt-1">첫상담 → 등록</p>
                      </div>

                      {/* Best/Worst 코호트 */}
                      <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-4 border border-amber-200">
                        <div className="flex items-center gap-2 text-amber-700 mb-2">
                          <Trophy className="h-4 w-4" />
                          <span className="text-xs font-medium">Best / Worst</span>
                        </div>
                        <div className="space-y-1">
                          {cohortSummary.bestCohort && (
                            <div className="flex items-center gap-2">
                              <span className="text-emerald-600 text-lg">🏆</span>
                              <span className="text-sm font-medium text-emerald-700">
                                {cohortSummary.bestCohort.cohort_month.slice(5)}월 {cohortSummary.bestCohort.final_conversion_rate}%
                              </span>
                              {cohortSummary.bestCohort.is_ongoing && (
                                <span className="text-[10px] text-sky-600 bg-sky-100 px-1 rounded">진행중</span>
                              )}
                            </div>
                          )}
                          {cohortSummary.worstCohort && (
                            <div className="flex items-center gap-2">
                              <span className="text-red-400 text-lg">📉</span>
                              <span className="text-sm font-medium text-red-600">
                                {cohortSummary.worstCohort.cohort_month.slice(5)}월 {cohortSummary.worstCohort.final_conversion_rate}%
                              </span>
                              {cohortSummary.worstCohort.is_ongoing && (
                                <span className="text-[10px] text-sky-600 bg-sky-100 px-1 rounded">진행중</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 전환율 추이 + 상담/등록 건수 + YoY 통합 차트 */}
                  {chartData.length > 0 && (
                    <div className="bg-white rounded-xl border p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-medium text-muted-foreground">월별 코호트 현황</h4>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#6366f1' }}></span>
                            <span className="text-muted-foreground">상담</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#14b8a6' }}></span>
                            <span className="text-muted-foreground">등록</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-3 h-0.5 rounded" style={{ backgroundColor: '#f97316' }}></span>
                            <span className="text-muted-foreground">전환율</span>
                          </span>
                        </div>
                      </div>
                      <ResponsiveContainer width="100%" height={260}>
                        <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 40, left: -10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis
                            dataKey="fullMonth"
                            height={55}
                            tick={(props: { x: number; y: number; payload: { value: string } }) => {
                              const { x, y, payload } = props
                              const dataItem = chartData.find(d => d.fullMonth === payload.value)
                              const yoyChange = dataItem?.yoyChange
                              const hasYoY = yoyChange !== null && yoyChange !== undefined
                              const isPositive = yoyChange !== null && yoyChange >= 0
                              return (
                                <g transform={`translate(${x},${y})`}>
                                  <text x={0} y={0} dy={12} textAnchor="middle" fill="#666" fontSize={11}>
                                    {payload.value?.slice(2) || ''}
                                  </text>
                                  <text
                                    x={0}
                                    y={0}
                                    dy={26}
                                    textAnchor="middle"
                                    fill={hasYoY ? (isPositive ? '#10b981' : '#ef4444') : '#d1d5db'}
                                    fontSize={10}
                                    fontWeight={500}
                                  >
                                    {hasYoY ? `${isPositive ? '+' : ''}${yoyChange}%` : '-'}
                                  </text>
                                </g>
                              )
                            }}
                          />
                          {/* 왼쪽 Y축: 건수 (명) */}
                          <YAxis
                            yAxisId="left"
                            tick={{ fontSize: 11 }}
                            tickFormatter={(value) => `${value}`}
                            domain={[0, 'auto']}
                          />
                          {/* 오른쪽 Y축: 전환율 (%) */}
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            tick={{ fontSize: 11 }}
                            tickFormatter={(value) => `${value}%`}
                            domain={[0, 'auto']}
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) return null
                              const data = payload[0]?.payload
                              if (!data) return null
                              const yoyChange = data.yoyChange
                              const hasYoY = yoyChange !== null
                              const isPositive = yoyChange > 0
                              return (
                                <div className="bg-white shadow-lg border rounded-lg p-3 text-sm">
                                  <p className="font-semibold mb-2">{data.fullMonth}</p>
                                  <div className="space-y-1">
                                    <p style={{ color: '#6366f1' }}>신규 상담: {data.총원}명</p>
                                    <p style={{ color: '#14b8a6' }}>등록: {data.등록}명</p>
                                    <p style={{ color: '#f97316' }}>전환율: {data.전환율}%</p>
                                  </div>
                                  {hasYoY && (
                                    <div className="mt-2 pt-2 border-t">
                                      <p className={isPositive ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
                                        YoY: {isPositive ? '+' : ''}{yoyChange}%p
                                      </p>
                                      <p className="text-xs text-muted-foreground">전년 동월: {data.prevYearRate}%</p>
                                    </div>
                                  )}
                                  {data.isOngoing && (
                                    <p className="text-sky-500 text-xs mt-1">진행중</p>
                                  )}
                                </div>
                              )
                            }}
                          />
                          {/* 신규 상담 막대 (인디고) */}
                          <Bar yAxisId="left" dataKey="총원" name="신규상담" fill="#6366f1" radius={[3, 3, 0, 0]} maxBarSize={20} />
                          {/* 등록 막대 (틸) */}
                          <Bar yAxisId="left" dataKey="등록" name="등록" fill="#14b8a6" radius={[3, 3, 0, 0]} maxBarSize={20} />
                          {/* 전환율 라인 (오렌지) */}
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="전환율"
                            stroke="#f97316"
                            strokeWidth={2.5}
                            dot={{ r: 3, fill: "#f97316", strokeWidth: 0 }}
                            activeDot={{ r: 5 }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* 코호트 리스트 (토글 가능) */}
                  {filteredCohortData.length > 0 ? (
                    <Collapsible open={isCohortTableExpanded} onOpenChange={setIsCohortTableExpanded}>
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between cursor-pointer hover:bg-muted/30 rounded-lg px-2 py-1 -mx-2">
                          <h4 className="text-sm font-medium text-muted-foreground">월별 코호트 상세</h4>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{filteredCohortData.length}개 코호트</span>
                            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isCohortTableExpanded ? "" : "-rotate-90"}`} />
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="border rounded-lg overflow-hidden mt-2">
                        {/* 헤더 */}
                        <div className="grid grid-cols-12 gap-2 bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground">
                          <div className="col-span-3">첫상담월</div>
                          <div className="col-span-2 text-center">총원</div>
                          <div className="col-span-3 text-center">최종 전환율</div>
                          <div className="col-span-3 text-center">평균 소요일</div>
                          <div className="col-span-1"></div>
                        </div>

                        {/* 코호트 행들 */}
                        {filteredCohortData.map((cohort) => {
                          const cohortKey = `${cohort.cohort_month}-${cohort.lead_source || 'all'}`
                          const isExpanded = expandedCohorts.has(cohortKey)
                          const daysBadge = getDaysBadge(cohort.avg_days_to_enroll)
                          const notEnrolled = cohort.total_students - cohort.enroll_total
                          const testedButNotEnrolled = cohort.test_total - Math.min(cohort.test_total, cohort.enroll_total)

                          return (
                            <Collapsible key={cohortKey} open={isExpanded} onOpenChange={() => toggleCohortExpand(cohortKey, cohort.cohort_month, cohort.lead_source)}>
                              <CollapsibleTrigger asChild>
                                <div className="grid grid-cols-12 gap-2 px-4 py-3 border-t hover:bg-muted/30 cursor-pointer transition-colors items-center">
                                  {/* 첫상담월 */}
                                  <div className="col-span-3 flex items-center gap-2">
                                    <span className="font-semibold">{cohort.cohort_month}</span>
                                    {cohort.is_ongoing && (
                                      <Badge className="bg-sky-100 text-sky-700 text-[10px] px-1.5">진행중</Badge>
                                    )}
                                  </div>

                                  {/* 총원 */}
                                  <div className="col-span-2 text-center">
                                    <span className="font-semibold">{cohort.total_students}</span>
                                    <span className="text-muted-foreground">명</span>
                                  </div>

                                  {/* 최종 전환율 */}
                                  <div className="col-span-3 text-center">
                                    <Badge className={`text-sm font-bold border ${getConversionBadgeClass(cohort.final_conversion_rate, cohort.is_ongoing)}`}>
                                      {cohort.final_conversion_rate}%
                                    </Badge>
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                      {cohort.enroll_total}/{cohort.total_students}명
                                    </div>
                                  </div>

                                  {/* 평균 소요일 */}
                                  <div className="col-span-3 text-center">
                                    {daysBadge ? (
                                      <Badge className={`${daysBadge.class} text-xs`}>
                                        {daysBadge.label}
                                      </Badge>
                                    ) : (
                                      <span className="text-muted-foreground">-</span>
                                    )}
                                    {cohort.avg_days_to_enroll !== null && (
                                      <div className="text-xs text-muted-foreground mt-0.5">
                                        {cohort.avg_days_to_enroll}일
                                      </div>
                                    )}
                                  </div>

                                  {/* 확장 아이콘 */}
                                  <div className="col-span-1 flex justify-end">
                                    <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                                  </div>
                                </div>
                              </CollapsibleTrigger>

                              <CollapsibleContent>
                                <div className="bg-muted/20 px-4 py-3 border-t">
                                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                                    {/* 등록 전환 추이 */}
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-2 font-medium">등록 전환 추이</p>
                                      <div className="space-y-0.5">
                                        <div className="flex items-center gap-1">
                                          <span className="text-xs text-muted-foreground w-8">M+0</span>
                                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                              className="h-full bg-emerald-500 rounded-full"
                                              style={{ width: `${cohort.total_students > 0 ? (cohort.enroll_month_0 / cohort.total_students) * 100 : 0}%` }}
                                            />
                                          </div>
                                          <span className="text-xs font-medium w-6 text-right">{cohort.enroll_month_0}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <span className="text-xs text-muted-foreground w-8">M+1</span>
                                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                              className="h-full bg-emerald-400 rounded-full"
                                              style={{ width: `${cohort.total_students > 0 ? (cohort.enroll_month_1 / cohort.total_students) * 100 : 0}%` }}
                                            />
                                          </div>
                                          <span className="text-xs font-medium w-6 text-right">{cohort.enroll_month_1}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <span className="text-xs text-muted-foreground w-8">M+2</span>
                                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                              className="h-full bg-emerald-300 rounded-full"
                                              style={{ width: `${cohort.total_students > 0 ? (cohort.enroll_month_2 / cohort.total_students) * 100 : 0}%` }}
                                            />
                                          </div>
                                          <span className="text-xs font-medium w-6 text-right">{cohort.enroll_month_2}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <span className="text-xs text-muted-foreground w-8">M+3+</span>
                                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                              className="h-full bg-emerald-200 rounded-full"
                                              style={{ width: `${cohort.total_students > 0 ? (cohort.enroll_month_3 / cohort.total_students) * 100 : 0}%` }}
                                            />
                                          </div>
                                          <span className="text-xs font-medium w-6 text-right">{cohort.enroll_month_3}</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* 테스트 현황 */}
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-2 font-medium">테스트 현황</p>
                                      <div className="space-y-0.5 text-xs">
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">완료</span>
                                          <span className="font-medium">{cohort.test_total}명</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">테스트율</span>
                                          <span className="font-medium">
                                            {cohort.total_students > 0 ? Math.round((cohort.test_total / cohort.total_students) * 100) : 0}%
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">테스트후 미등록</span>
                                          <span className="font-medium text-amber-600">{testedButNotEnrolled}명</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* 미등록 현황 */}
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-2 font-medium">미등록 현황</p>
                                      <div className="space-y-0.5 text-xs">
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">총 미등록</span>
                                          <span className="font-medium text-amber-600">{notEnrolled}명</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">이탈률</span>
                                          <span className="font-medium text-red-500">
                                            {cohort.total_students > 0 ? Math.round((notEnrolled / cohort.total_students) * 100) : 0}%
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">테스트X 이탈</span>
                                          <span className="font-medium text-gray-500">{notEnrolled - testedButNotEnrolled}명</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* 미등록 학년별 구성 */}
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-2 font-medium">미등록 학년별 구성</p>
                                      {(() => {
                                        const gradeData = cohortGradeData[cohortKey]
                                        const isLoading = loadingCohortDetails.has(cohortKey)

                                        if (isLoading) {
                                          return (
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                              <Loader2 className="h-3 w-3 animate-spin" />
                                              <span className="text-xs">로딩중...</span>
                                            </div>
                                          )
                                        }

                                        if (!gradeData || gradeData.length === 0) {
                                          return (
                                            <span className="text-xs text-muted-foreground">데이터 없음</span>
                                          )
                                        }

                                        return (
                                          <div className="space-y-0.5">
                                            {gradeData.map((g, idx) => (
                                              <div key={idx} className="flex justify-between text-xs gap-1">
                                                <span className="text-muted-foreground">{g.grade_label}</span>
                                                <span className="font-medium">{g.total_count}<span className="text-muted-foreground text-[10px] ml-0.5">({g.with_test_count}/{g.without_test_count})</span></span>
                                              </div>
                                            ))}
                                          </div>
                                        )
                                      })()}
                                    </div>

                                    {/* 등록 학년별 구성 */}
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-2 font-medium">등록 학년별 구성</p>
                                      {(() => {
                                        const enrolledGradeData = cohortEnrolledGradeData[cohortKey]
                                        const isLoading = loadingCohortDetails.has(cohortKey)

                                        if (isLoading) {
                                          return (
                                            <div className="flex items-center gap-1 text-muted-foreground">
                                              <Loader2 className="h-3 w-3 animate-spin" />
                                              <span className="text-xs">로딩중...</span>
                                            </div>
                                          )
                                        }

                                        if (!enrolledGradeData || enrolledGradeData.length === 0) {
                                          return (
                                            <span className="text-xs text-muted-foreground">데이터 없음</span>
                                          )
                                        }

                                        return (
                                          <div className="space-y-0.5">
                                            {enrolledGradeData.map((g, idx) => (
                                              <div key={idx} className="flex justify-between text-xs gap-1">
                                                <span className="text-muted-foreground">{g.grade_label}</span>
                                                <span className="font-medium text-emerald-600">{g.total_count}<span className="text-muted-foreground text-[10px] ml-0.5">({g.same_month_count}/{g.delayed_count})</span></span>
                                              </div>
                                            ))}
                                          </div>
                                        )
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          )
                        })}
                      </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                      코호트 데이터가 없습니다.
                    </div>
                  )}

                  {/* 범례 */}
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground border-t pt-4">
                    <div className="flex items-center gap-1">
                      <span className="text-emerald-700 font-medium">M+0:</span> 같은 달 등록
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-emerald-600">M+1:</span> 1개월 후
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-emerald-500">M+2:</span> 2개월 후
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-emerald-400">M+3+:</span> 3개월+
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">40%+</Badge>
                      <Badge className="bg-amber-100 text-amber-700 text-[10px]">20-40%</Badge>
                      <Badge className="bg-red-100 text-red-700 text-[10px]">&lt;20%</Badge>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}

    </div>
  )
}
