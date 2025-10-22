"use client"

import LearningTabs from "@/components/learning/LearningTabs"
import { StatsCards } from "@/components/analytics/mathflat/stats-cards"
import { StudentRecords } from "@/components/analytics/mathflat/student-records"

export default function MathFlatPage() {
  return (
    <div className="space-y-6">
      {/* 탭 네비게이션 */}
      <LearningTabs />

      {/* 통계 카드 컴포넌트 */}
      <StatsCards />

      {/* 학습 기록 */}
      <StudentRecords />
    </div>
  )
}