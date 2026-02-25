"use client"

import { OperationStatsCharts } from "@/components/analytics/operation-stats-charts"

export function AnalyticsPageClient() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">통계 분석</h1>
      {/* 운영 통계 콘텐츠 */}
      <OperationStatsCharts />
    </div>
  )
}