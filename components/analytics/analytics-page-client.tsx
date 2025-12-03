"use client"

import { OperationStatsCharts } from "@/components/analytics/operation-stats-charts"

export function AnalyticsPageClient() {
  return (
    <div className="space-y-6">
      {/* 운영 통계 콘텐츠 */}
      <OperationStatsCharts />
    </div>
  )
}