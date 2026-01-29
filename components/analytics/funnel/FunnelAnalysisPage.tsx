"use client"

import AnalyticsTabs from "@/components/analytics/AnalyticsTabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Loader2, Target, Users, AlertTriangle, Phone, ChevronDown, BarChart3 } from "lucide-react"
import { useState, useMemo } from "react"

// 훅 imports
import {
  useBottleneckData,
  useCohortData,
  useLeadSourceData,
} from "./hooks"

// 탭 컴포넌트 imports
import {
  BottleneckTab,
  CohortTab,
  LeadSourceTab,
} from "./tabs"

export function FunnelAnalysisPage() {
  // 커스텀 훅 사용
  const bottleneckHook = useBottleneckData()
  const cohortHook = useCohortData()
  const leadSourceHook = useLeadSourceData()

  // Quick Insights 접기 상태
  const [isBottleneckOpen, setIsBottleneckOpen] = useState(false)
  const [isConsultationOpen, setIsConsultationOpen] = useState(false)

  const isLoading = bottleneckHook.loading || cohortHook.loading || leadSourceHook.loading

  // Hero Metric 계산 - 이번달 전환율
  const heroMetric = useMemo(() => {
    const summary = cohortHook.cohortSummary
    if (!summary) return null

    // 이번달 데이터 찾기
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const currentCohort = cohortHook.filteredCohortData.find(c => c.cohort_month === currentMonth)

    // 지난달 데이터 찾기
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`
    const lastCohort = cohortHook.filteredCohortData.find(c => c.cohort_month === lastMonthKey)

    const currentRate = currentCohort?.final_conversion_rate ?? summary.recent3Avg
    const lastRate = lastCohort?.final_conversion_rate ?? 0
    const change = lastRate > 0 ? Math.round((currentRate - lastRate) * 10) / 10 : null

    return {
      rate: currentRate,
      change,
      enrolled: currentCohort?.enroll_total ?? 0,
      total: currentCohort?.total_students ?? 0,
      ongoing: summary.totalOngoing,
      ongoingConverted: summary.convertedOngoing,
      isCurrentMonth: !!currentCohort,
    }
  }, [cohortHook.cohortSummary, cohortHook.filteredCohortData])

  // 병목 요약 데이터
  const bottleneckSummary = useMemo(() => {
    if (bottleneckHook.byLeadSource.length === 0) return null

    const totalContacts = bottleneckHook.byLeadSource.reduce((sum, d) => sum + d.totalCount, 0)
    const totalTests = bottleneckHook.byLeadSource.reduce((sum, d) => sum + d.testCount, 0)
    const directEnroll = bottleneckHook.byLeadSource.reduce((sum, d) => sum + d.directEnrollCount, 0)
    const noTestNoEnroll = totalContacts - totalTests - directEnroll

    const dropoffRate = totalContacts > 0 ? Math.round((noTestNoEnroll / totalContacts) * 100) : 0

    return {
      dropoffRate,
      noTestNoEnroll,
      totalContacts,
    }
  }, [bottleneckHook.byLeadSource])

  // 상담 효과 요약
  const consultationSummary = useMemo(() => {
    if (bottleneckHook.consultationEffects.length === 0) return null

    const postTestTypes = ["입테후상담", "등록유도"]
    const postTestData = bottleneckHook.consultationEffects.filter(e => postTestTypes.includes(e.consultationType))

    const byMethod = ["전화", "대면", "문자"].map(method => {
      const items = postTestData.filter(e => e.method === method)
      const totalCount = items.reduce((s, e) => s + e.count, 0)
      const weightedRate = totalCount > 0
        ? items.reduce((s, e) => s + e.toEnrollRate * e.count, 0) / totalCount
        : 0
      return { method, count: totalCount, rate: Math.round(weightedRate * 10) / 10 }
    }).filter(m => m.count > 0)

    const best = [...byMethod].filter(m => m.count >= 3).sort((a, b) => b.rate - a.rate)[0]

    return {
      bestMethod: best?.method ?? null,
      bestRate: best?.rate ?? 0,
      insight: best ? `${best.method}가 가장 효과적 (${best.rate}% 전환)` : "데이터 분석 중",
    }
  }, [bottleneckHook.consultationEffects])

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">통계 분석</h1>
      <AnalyticsTabs />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Hero Metric - 이번달 전환율 */}
          {heroMetric && (
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-200/60 rounded-2xl p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-2 text-emerald-600 mb-1">
                    <Target className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {heroMetric.isCurrentMonth ? "이번달 전환율" : "최근 3개월 평균 전환율"}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-5xl font-bold text-emerald-700 tabular-nums">
                      {heroMetric.rate}%
                    </span>
                    {heroMetric.change !== null && (
                      <Badge
                        className={`text-sm ${
                          heroMetric.change >= 0
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : "bg-red-100 text-red-700 border-red-200"
                        }`}
                      >
                        {heroMetric.change >= 0 ? "+" : ""}{heroMetric.change}%p vs 지난달
                      </Badge>
                    )}
                  </div>
                  {heroMetric.isCurrentMonth && (
                    <p className="text-sm text-emerald-600/70 mt-1">
                      {heroMetric.enrolled}명 등록 / {heroMetric.total}명 상담
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">진행중 코호트</span>
                  </div>
                  <div className="text-2xl font-bold tabular-nums">
                    {heroMetric.ongoingConverted}/{heroMetric.ongoing}
                    <span className="text-base font-normal text-muted-foreground ml-1">명</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 월별 코호트 현황 - Primary Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">월별 코호트 현황</h2>
            </div>
            <CohortTab
              filteredCohortData={cohortHook.filteredCohortData}
              cohortLeadSources={cohortHook.cohortLeadSources}
              chartData={cohortHook.chartData}
              cohortSummary={cohortHook.cohortSummary}
              cohortGradeData={cohortHook.cohortGradeData}
              cohortEnrolledGradeData={cohortHook.cohortEnrolledGradeData}
              loadingCohortDetails={cohortHook.loadingCohortDetails}
              expandedCohorts={cohortHook.expandedCohorts}
              periodFilter={cohortHook.periodFilter}
              selectedLeadSource={cohortHook.selectedLeadSource}
              isCohortTableExpanded={cohortHook.isCohortTableExpanded}
              setPeriodFilter={cohortHook.setPeriodFilter}
              setSelectedLeadSource={cohortHook.setSelectedLeadSource}
              setIsCohortTableExpanded={cohortHook.setIsCohortTableExpanded}
              toggleCohortExpand={cohortHook.toggleCohortExpand}
              getConversionColor={cohortHook.getConversionColor}
              getConversionBadgeClass={cohortHook.getConversionBadgeClass}
              getDaysBadge={cohortHook.getDaysBadge}
            />
          </div>

          {/* Quick Insights - Secondary Section (2열 그리드) */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="text-xl">💡</span>
              Quick Insights
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card A: 주요 병목 지점 */}
              <Collapsible open={isBottleneckOpen} onOpenChange={setIsBottleneckOpen}>
                <CollapsibleTrigger className="w-full text-left">
                  <div className="p-4 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        <div>
                          <span className="font-medium">주요 병목 지점</span>
                          {bottleneckSummary && (
                            <p className="text-sm text-muted-foreground">
                              테스트 미진행 이탈 {bottleneckSummary.dropoffRate}%
                            </p>
                          )}
                        </div>
                      </div>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isBottleneckOpen ? "rotate-180" : ""}`} />
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <BottleneckTab
                    bottleneckDetails={bottleneckHook.bottleneckDetails}
                    successPattern={bottleneckHook.successPattern}
                    stageDurations={bottleneckHook.stageDurations}
                    byLeadSource={bottleneckHook.byLeadSource}
                    consultationEffects={[]} // 상담 효과는 별도 카드에서 표시
                  />
                </CollapsibleContent>
              </Collapsible>

              {/* Card B: 상담 효과 요약 */}
              <Collapsible open={isConsultationOpen} onOpenChange={setIsConsultationOpen}>
                <CollapsibleTrigger className="w-full text-left">
                  <div className="p-4 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-blue-500" />
                        <div>
                          <span className="font-medium">상담 효과 요약</span>
                          {consultationSummary && (
                            <p className="text-sm text-muted-foreground">
                              {consultationSummary.insight}
                            </p>
                          )}
                        </div>
                      </div>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isConsultationOpen ? "rotate-180" : ""}`} />
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <BottleneckTab
                    bottleneckDetails={[]}
                    successPattern={null}
                    stageDurations={[]}
                    byLeadSource={[]}
                    consultationEffects={bottleneckHook.consultationEffects}
                  />
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>

          {/* 리드소스별 상세 성과 - Sheet */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full">
                <BarChart3 className="mr-2 h-4 w-4" />
                리드소스별 상세 성과 보기
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[700px] sm:max-w-[700px] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>리드소스별 성과</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <LeadSourceTab
                  sortedMetrics={leadSourceHook.sortedMetrics}
                  summary={leadSourceHook.summary}
                  sortField={leadSourceHook.sortField}
                  sortDirection={leadSourceHook.sortDirection}
                  onSort={leadSourceHook.handleSort}
                />
              </div>
            </SheetContent>
          </Sheet>
        </>
      )}
    </div>
  )
}

// 기존 코드와의 호환성을 위한 alias
export { FunnelAnalysisPage as FunnelAnalysisPageClient }
