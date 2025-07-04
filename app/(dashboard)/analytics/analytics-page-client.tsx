"use client"

import { useState, Suspense } from "react"
import { AnalyticsFilters } from "@/components/analytics/analytics-filters"
import { AnalyticsStatsCards } from "@/components/analytics/analytics-stats-cards"
import { AnalyticsCharts } from "@/components/analytics/analytics-charts"
import { MonthlyReportGenerator } from "@/components/analytics/monthly-report-generator"
import { TeacherProgressView } from "@/components/analytics/teacher-progress-view"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAnalyticsData } from "@/hooks/use-analytics"
import type { AnalyticsFilters as AnalyticsFiltersType } from "@/types/analytics"

export function AnalyticsPageClient() {
  // 현재 날짜 기준으로 초기 필터 설정
  const currentDate = new Date()
  const [filters, setFilters] = useState<AnalyticsFiltersType>({
    studentId: "all",
    year: currentDate.getFullYear(),
    month: currentDate.getMonth() + 1
  })

  // 통합 analytics 데이터 훅 사용
  const {
    monthlyData,
    students,
    teachers,
    bookProgresses,
    reportText,
    selectedStudent,
    isLoading,
    error,
    isGeneratingReport,
    refreshAll,
    generateReport,
    clearReport
  } = useAnalyticsData(filters)

  const handleFiltersChange = (newFilters: AnalyticsFiltersType) => {
    setFilters(newFilters)
    // 필터 변경 시 보고서 초기화
    clearReport()
  }

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">학습 분석</h1>
        <p className="text-muted-foreground">
          학생별 월간 학습 데이터를 분석하고 보고서를 생성합니다
        </p>
      </div>

      {/* 탭 구조 */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="overview">전체 현황</TabsTrigger>
          <TabsTrigger value="reports">보고서</TabsTrigger>
        </TabsList>

        {/* 전체 현황 탭 */}
        <TabsContent value="overview" className="space-y-6">
          {/* 필터 섹션 */}
          <AnalyticsFilters
            students={students}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            isLoading={isLoading}
          />

          {/* 에러 표시 */}
          {error && (
            <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full bg-red-500" />
                  <p className="text-sm text-red-700 dark:text-red-300">
                    데이터 조회 중 오류가 발생했습니다: {error.message}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 통계 카드 섹션 */}
          <Suspense fallback={<StatsSkeleton />}>
            <AnalyticsStatsCards
              monthlyData={monthlyData}
              isLoading={isLoading}
            />
          </Suspense>

          {/* 차트 섹션 */}
          <Suspense fallback={<ChartsSkeleton />}>
            <AnalyticsCharts
              monthlyData={monthlyData}
              bookProgresses={bookProgresses}
              teachers={teachers}
              isLoading={isLoading}
            />
          </Suspense>
        </TabsContent>

        {/* 보고서 탭 */}
        <TabsContent value="reports" className="space-y-6">
          {/* 필터 섹션 (보고서에서도 필요) */}
          <AnalyticsFilters
            students={students}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            isLoading={isLoading}
          />

          {/* 보고서 생성 섹션 */}
          <Suspense fallback={<ReportSkeleton />}>
            <MonthlyReportGenerator
              monthlyData={monthlyData}
              reportText={reportText}
              isGenerating={isGeneratingReport}
              onGenerateReport={generateReport}
              onClearReport={clearReport}
            />
          </Suspense>
        </TabsContent>
      </Tabs>

      {/* 전체 데이터 새로고침 - 개발/디버깅용 */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="border-dashed">
          <CardContent className="p-4">
            <button 
              onClick={refreshAll}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              전체 데이터 새로고침 (개발용)
            </button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// 스켈레톤 컴포넌트들
function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="animate-pulse">
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ChartsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {Array.from({ length: 2 }).map((_, index) => (
        <Card key={index} className="animate-pulse">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
              <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ReportSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-40"></div>
          <div className="flex gap-3">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}