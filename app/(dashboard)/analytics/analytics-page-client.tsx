"use client"

import { useState, Suspense } from "react"
import { AnalyticsFilters } from "@/components/analytics/analytics-filters"
import { AnalyticsStatsCards } from "@/components/analytics/analytics-stats-cards"
import { AnalyticsCharts } from "@/components/analytics/analytics-charts"
import { Card, CardContent } from "@/components/ui/card"
import { useAnalyticsData } from "@/hooks/use-analytics"
import type { AnalyticsFilters as AnalyticsFiltersType } from "@/types/analytics"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FileText } from "lucide-react"

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
    isLoading,
    error,
    refreshAll,
  } = useAnalyticsData(filters)

  const handleFiltersChange = (newFilters: AnalyticsFiltersType) => {
    setFilters(newFilters)
  }

  return (
    <div className="space-y-6">
      {/* 탭 네비게이션 */}
      <div className="flex items-center gap-2 border-b">
        <Link href="/analytics">
          <Button variant="ghost" className="rounded-none border-b-2 border-primary">
            전체 현황
          </Button>
        </Link>
        <Link href="/analytics/reports">
          <Button variant="ghost" className="rounded-none border-b-2 border-transparent hover:border-gray-300">
            월간 보고서
          </Button>
        </Link>
      </div>

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