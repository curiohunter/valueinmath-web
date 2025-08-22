"use client"

import { OperationStatsCharts } from "@/components/analytics/operation-stats-charts"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FileText, TrendingUp } from "lucide-react"

export function AnalyticsPageClient() {
  return (
    <div className="space-y-6">
      {/* 탭 네비게이션 */}
      <div className="flex items-center gap-2 border-b">
        <Button 
          variant="ghost" 
          className="rounded-none border-b-2 border-primary"
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          운영 통계
        </Button>
        <Link href="/analytics/reports">
          <Button variant="ghost" className="rounded-none border-b-2 border-transparent hover:border-gray-300">
            <FileText className="w-4 h-4 mr-2" />
            월간 보고서
          </Button>
        </Link>
      </div>

      {/* 운영 통계 콘텐츠 */}
      <OperationStatsCharts />
    </div>
  )
}