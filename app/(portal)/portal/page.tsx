"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/providers/auth-provider"
import { PortalData } from "@/types/portal"
import { getPortalData } from "@/lib/portal-client"
import { MonthlySummaryCards } from "@/components/portal/monthly-summary-cards"
import { LearningTrendsChart } from "@/components/portal/learning-trends-chart"
import { LearningCalendar } from "@/components/portal/learning-calendar"
import { StudyLogsSection } from "@/components/portal/study-logs-section"
import { TestLogsSection } from "@/components/portal/test-logs-section"
import { ExamScoresSection } from "@/components/portal/exam-scores-section"
import { MakeupClassesSection } from "@/components/portal/makeup-classes-section"
import { ConsultationsSection } from "@/components/portal/consultations-section"
import { MathflatSection } from "@/components/portal/mathflat-section"
import { QuickActionMenu } from "@/components/portal/quick-action-menu"
import { ClassesSection } from "@/components/portal/classes-section"
import { RefreshCw, GraduationCap } from "lucide-react"

export default function PortalPage() {
  const { user } = useAuth()
  const [portalData, setPortalData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    loadPortalData()
  }, [user])

  const loadPortalData = async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Get user profile to find student_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("student_id")
        .eq("id", user.id)
        .single()

      if (!profile?.student_id) {
        setError("학생 정보가 연결되지 않았습니다.")
        return
      }

      const data = await getPortalData(profile.student_id)
      setPortalData(data)
    } catch (err: any) {
      console.error("Error loading portal data:", err)
      console.error("Error message:", err?.message)
      console.error("Error stack:", err?.stack)
      setError(`데이터를 불러오는데 실패했습니다: ${err?.message || "알 수 없는 오류"}`)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <p className="text-destructive">{error}</p>
          <button
            onClick={loadPortalData}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  if (!portalData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">데이터가 없습니다.</p>
      </div>
    )
  }

  const handleCardClick = (cardType: "attendance" | "homework" | "score" | "tuition") => {
    // Scroll to appropriate section based on card type
    let sectionId = ""

    switch (cardType) {
      case "attendance":
      case "homework":
        sectionId = "study-logs-section"
        break
      case "score":
        sectionId = "test-logs-section"
        break
      case "tuition":
        sectionId = "tuition-section"
        break
    }

    if (sectionId) {
      document.getElementById(sectionId)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    }
  }

  return (
    <>
      <div className="space-y-8 pb-20">
        {/* 1. Profile Header - Student Info */}
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 p-6 rounded-lg border border-blue-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-full p-3 bg-gradient-to-br from-blue-500 to-indigo-600">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800">{portalData.student.name}</h1>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">학년:</span>
              <span className="font-semibold text-gray-800">{portalData.student.grade}학년</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">학교:</span>
              <span className="font-semibold text-gray-800">{portalData.student.school}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">상태:</span>
              <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full text-xs font-semibold shadow-sm">
                {portalData.student.status}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Classes Section - Student's Classes */}
        <ClassesSection classes={portalData.classes} />

        {/* 3. Monthly Summary Cards */}
        <MonthlySummaryCards
          monthly_aggregations={portalData.monthly_aggregations}
          monthly_mathflat_stats={portalData.monthly_mathflat_stats}
        />

        {/* 4. Learning Trends Chart */}
        <LearningTrendsChart monthly_aggregations={portalData.monthly_aggregations} />

        {/* 5. Learning Calendar - 학습 캘린더 */}
        <LearningCalendar
          study_logs={portalData.study_logs}
          test_logs={portalData.test_logs}
          makeup_classes={portalData.makeup_classes}
          consultations={portalData.consultations}
          mathflat_records={portalData.mathflat_records}
        />

        {/* 6. Collapsible Sections - Detailed Data */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">상세 학습 기록</h2>
          <ExamScoresSection scores={portalData.school_exam_scores} />
          <StudyLogsSection logs={portalData.study_logs} />
          <TestLogsSection logs={portalData.test_logs} />
          <MakeupClassesSection classes={portalData.makeup_classes} />
          <ConsultationsSection consultations={portalData.consultations} />
          <MathflatSection records={portalData.mathflat_records} />
        </div>
      </div>

      {/* 7. Quick Action Menu */}
      <QuickActionMenu />
    </>
  )
}
