"use client"

import AnalyticsTabs from "@/components/analytics/AnalyticsTabs"
import MarketingPage from "@/components/analytics/marketing-page"

export default function MarketingManagementPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-4">통계 분석</h1>
      <AnalyticsTabs />
      <MarketingPage />
    </div>
  )
}
