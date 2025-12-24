"use client"

import AnalyticsTabs from "@/components/analytics/AnalyticsTabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2 } from "lucide-react"

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

  const isLoading = bottleneckHook.loading || cohortHook.loading || leadSourceHook.loading

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
          {/* 병목 구간 분석 */}
          <BottleneckTab
            bottlenecks={bottleneckHook.bottlenecks}
            bottleneckDetails={bottleneckHook.bottleneckDetails}
            successPattern={bottleneckHook.successPattern}
            stageDurations={bottleneckHook.stageDurations}
          />

          {/* 리드소스 분석 탭 카드 */}
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
                <TabsContent value="lead-source" className="mt-4">
                  <LeadSourceTab
                    sortedMetrics={leadSourceHook.sortedMetrics}
                    summary={leadSourceHook.summary}
                    sortField={leadSourceHook.sortField}
                    sortDirection={leadSourceHook.sortDirection}
                    onSort={leadSourceHook.handleSort}
                  />
                </TabsContent>

                {/* 월별 코호트 추적 탭 */}
                <TabsContent value="cohort" className="mt-4">
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
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}

    </div>
  )
}

// 기존 코드와의 호환성을 위한 alias
export { FunnelAnalysisPage as FunnelAnalysisPageClient }
