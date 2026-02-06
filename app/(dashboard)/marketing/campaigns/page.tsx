"use client"

import MarketingTabs from "@/components/marketing/MarketingTabs"
import MarketingPage from "@/components/analytics/marketing-page"

export default function CampaignsPage() {
  return (
    <div className="space-y-6">
      <MarketingTabs />
      <MarketingPage />
    </div>
  )
}
