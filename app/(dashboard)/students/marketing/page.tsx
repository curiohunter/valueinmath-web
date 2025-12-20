"use client"

import StudentClassTabs from "@/components/students/StudentClassTabs"
import MarketingPage from "@/components/analytics/marketing-page"

export default function MarketingManagementPage() {
  return (
    <div className="space-y-6">
      <StudentClassTabs />
      <MarketingPage />
    </div>
  )
}
