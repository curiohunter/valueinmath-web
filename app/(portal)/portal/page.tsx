"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/providers/auth-provider"
import { PortalData } from "@/types/portal"
import { getPortalData } from "@/lib/portal-client"
import { MonthlySummaryCards } from "@/components/portal/monthly-summary-cards"
import { LearningTrendsChart } from "@/components/portal/learning-trends-chart"
import { ActivityTimeline } from "@/components/portal/activity-timeline"
import { TuitionSection } from "@/components/portal/tuition-section"
import { StudyLogsSection } from "@/components/portal/study-logs-section"
import { TestLogsSection } from "@/components/portal/test-logs-section"
import { ExamScoresSection } from "@/components/portal/exam-scores-section"
import { MakeupClassesSection } from "@/components/portal/makeup-classes-section"
import { ConsultationsSection } from "@/components/portal/consultations-section"
import { MathflatSection } from "@/components/portal/mathflat-section"
import { QuickActionMenu } from "@/components/portal/quick-action-menu"
import { RefreshCw } from "lucide-react"

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
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background p-6 rounded-lg border">
          <h1 className="text-3xl font-bold mb-3">{portalData.student.name}</h1>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">학년:</span>
              <span className="font-semibold">{portalData.student.grade}학년</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">학교:</span>
              <span className="font-semibold">{portalData.student.school}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">상태:</span>
              <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold">
                {portalData.student.status}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Monthly Summary Cards */}
        <MonthlySummaryCards
          monthly_aggregations={portalData.monthly_aggregations}
          tuition_fees={portalData.tuition_fees}
          onCardClick={handleCardClick}
        />

        {/* 3. Learning Trends Chart */}
        <LearningTrendsChart monthly_aggregations={portalData.monthly_aggregations} />

        {/* 4. Two-Column Layout: Activity Timeline + Tuition Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ActivityTimeline activities={portalData.recent_activities} />
          <TuitionSection
            tuition_fees={portalData.tuition_fees}
            studentName={portalData.student.name}
          />
        </div>

        {/* 5. Collapsible Sections - Detailed Data */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">상세 학습 기록</h2>
          <StudyLogsSection logs={portalData.study_logs} />
          <TestLogsSection logs={portalData.test_logs} />
          <ExamScoresSection scores={portalData.school_exam_scores} />
          <MakeupClassesSection classes={portalData.makeup_classes} />
          <ConsultationsSection consultations={portalData.consultations} />
          <MathflatSection records={portalData.mathflat_records} />
        </div>
      </div>

      {/* 6. Quick Action Menu */}
      <QuickActionMenu />
    </>
  )
}
