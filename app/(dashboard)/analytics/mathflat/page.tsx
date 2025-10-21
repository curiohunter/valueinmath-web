"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Calendar,
  Activity,
  TrendingUp
} from "lucide-react"
import { StatsCards } from "@/components/analytics/mathflat/stats-cards"
import { StudentRecords } from "@/components/analytics/mathflat/student-records"

export default function MathFlatPage() {
  return (
    <div className="space-y-6">
      {/* 탭 네비게이션 */}
      <div className="flex items-center gap-2 border-b">
        <Link href="/analytics">
          <Button variant="ghost" className="rounded-none border-b-2 border-transparent hover:border-gray-300">
            <TrendingUp className="w-4 h-4 mr-2" />
            운영 통계
          </Button>
        </Link>
        <Button 
          variant="ghost" 
          className="rounded-none border-b-2 border-primary"
        >
          <Activity className="w-4 h-4 mr-2" />
          매쓰플랫
        </Button>
        <Link href="/analytics/student-timeline">
          <Button variant="ghost" className="rounded-none border-b-2 border-transparent hover:border-gray-300">
            <Calendar className="w-4 h-4 mr-2" />
            학생 타임라인
          </Button>
        </Link>
      </div>

      {/* 통계 카드 컴포넌트 */}
      <StatsCards />

      {/* 학습 기록 */}
      <StudentRecords />
    </div>
  )
}