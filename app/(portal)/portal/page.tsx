"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/providers/auth-provider"
import { PortalData } from "@/types/portal"
import { getPortalData } from "@/lib/portal-client"
import { OverviewStats } from "@/components/portal/overview-stats"
import { ActivityTimeline } from "@/components/portal/activity-timeline"
import { StudyLogsSection } from "@/components/portal/study-logs-section"
import { TestLogsSection } from "@/components/portal/test-logs-section"
import { ExamScoresSection } from "@/components/portal/exam-scores-section"
import { MakeupClassesSection } from "@/components/portal/makeup-classes-section"
import { ConsultationsSection } from "@/components/portal/consultations-section"
import { MathflatSection } from "@/components/portal/mathflat-section"
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

  return (
    <div className="space-y-8">
      {/* Student Info */}
      <div className="bg-card p-6 rounded-lg border">
        <h2 className="text-2xl font-bold mb-2">{portalData.student.name}</h2>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>{portalData.student.grade}학년</span>
          <span>{portalData.student.school}</span>
          <span className="font-semibold text-foreground">
            {portalData.student.status}
          </span>
        </div>
      </div>

      {/* Overview Stats */}
      <OverviewStats stats={portalData.stats} />

      {/* Activity Timeline */}
      <ActivityTimeline activities={portalData.recent_activities} />

      {/* Detailed Sections */}
      <div className="space-y-6">
        <StudyLogsSection logs={portalData.study_logs} />
        <TestLogsSection logs={portalData.test_logs} />
        <ExamScoresSection scores={portalData.school_exam_scores} />
        <MakeupClassesSection classes={portalData.makeup_classes} />
        <ConsultationsSection consultations={portalData.consultations} />
        <MathflatSection records={portalData.mathflat_records} />
      </div>
    </div>
  )
}
