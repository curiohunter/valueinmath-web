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
import { TuitionSection } from "@/components/portal/tuition-section"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RefreshCw, GraduationCap, BookOpen, CreditCard, MessageCircle } from "lucide-react"
import { CommentsSection } from "@/components/portal/comments-section"
import { TeacherCommentForm } from "@/components/portal/teacher-comment-form"

export default function PortalPage() {
  const { user } = useAuth()
  const [portalData, setPortalData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<"employee" | "student" | "parent" | null>(null)
  const [employeeId, setEmployeeId] = useState<string | null>(null)

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

      // Get user profile to determine role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, student_id")
        .eq("id", user.id)
        .single()

      if (!profile) {
        setError("사용자 정보를 찾을 수 없습니다.")
        return
      }

      setUserRole(profile.role as "employee" | "student" | "parent")

      // If employee, fetch employee ID for teacher features
      if (profile.role === "employee") {
        const { data: employee } = await supabase
          .from("employees")
          .select("id")
          .eq("auth_id", user.id)
          .eq("status", "재직")
          .single()

        if (employee) {
          setEmployeeId(employee.id)
        }

        // Employees don't need to load full portal data
        // They just use the comment form
        setLoading(false)
        return
      }

      // For students/parents, load portal data as before
      if (!profile.student_id) {
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

  // For employees, show teacher view (comment form)
  if (userRole === "employee") {
    if (!employeeId) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">직원 정보를 찾을 수 없습니다.</p>
        </div>
      )
    }

    return (
      <div className="space-y-8 pb-20">
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 p-6 rounded-lg border border-blue-200 shadow-sm">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">선생님 포털</h1>
          <p className="text-gray-600">학생들의 월별 학습 코멘트를 작성할 수 있습니다.</p>
        </div>

        <TeacherCommentForm
          teacherId={employeeId}
          onSuccess={loadPortalData}
        />
      </div>
    )
  }

  // For students/parents, check portal data
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

          {/* Homework Information - Most Recent 2 Days */}
          {(() => {
            // Get unique dates from study logs (sorted by date descending)
            const uniqueDates = Array.from(
              new Set(portalData.study_logs.map(log => log.date))
            ).slice(0, 2)

            if (uniqueDates.length === 0) return null

            // Group logs by date
            const logsByDate = uniqueDates.map(date => ({
              date,
              logs: portalData.study_logs.filter(log => log.date === date)
            }))

            return (
              <div className="mt-4 pt-4 border-t border-blue-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  최근 숙제 정보
                </h3>
                <div className="space-y-3">
                  {logsByDate.map(({ date, logs }) => (
                    <div key={date} className="bg-white/60 rounded-md p-3 border border-blue-100">
                      <div className="text-xs text-gray-600 mb-2 font-medium">
                        {new Date(date).toLocaleDateString('ko-KR', {
                          month: 'long',
                          day: 'numeric',
                          weekday: 'short'
                        })}
                      </div>
                      <div className="space-y-2">
                        {logs.map((log, idx) => (
                          <div key={idx} className="text-sm">
                            {log.book2 && (
                              <div className="flex gap-2">
                                <span className="text-gray-600 min-w-[60px]">교재:</span>
                                <span className="font-semibold text-gray-800">{log.book2}</span>
                              </div>
                            )}
                            {log.book2log && (
                              <div className="flex gap-2">
                                <span className="text-gray-600 min-w-[60px]">숙제:</span>
                                <span className="text-gray-800">{log.book2log}</span>
                              </div>
                            )}
                            {!log.book2 && !log.book2log && (
                              <div className="text-gray-500 text-xs">숙제 정보 없음</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>

        {/* 2. Classes Section - Student's Classes */}
        <ClassesSection classes={portalData.classes} />

        {/* 3. Tabs - 학습상황 / 원비관리 / 코멘트 */}
        <Tabs defaultValue="learning" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="learning" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              학습상황
            </TabsTrigger>
            <TabsTrigger value="tuition" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              원비관리
            </TabsTrigger>
            <TabsTrigger value="comments" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              코멘트
            </TabsTrigger>
          </TabsList>

          {/* 학습상황 탭 */}
          <TabsContent value="learning" className="space-y-8 mt-6">
            {/* Monthly Summary Cards */}
            <MonthlySummaryCards
              monthly_aggregations={portalData.monthly_aggregations}
              monthly_mathflat_stats={portalData.monthly_mathflat_stats}
            />

            {/* Learning Trends Chart */}
            <LearningTrendsChart monthly_aggregations={portalData.monthly_aggregations} />

            {/* Learning Calendar - 학습 캘린더 */}
            <LearningCalendar
              study_logs={portalData.study_logs}
              test_logs={portalData.test_logs}
              makeup_classes={portalData.makeup_classes}
              consultations={portalData.consultations}
              mathflat_records={portalData.mathflat_records}
            />

            {/* Collapsible Sections - Detailed Data */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">상세 학습 기록</h2>
              <ExamScoresSection scores={portalData.school_exam_scores} />
              <StudyLogsSection logs={portalData.study_logs} />
              <TestLogsSection logs={portalData.test_logs} />
              <MakeupClassesSection classes={portalData.makeup_classes} />
              <ConsultationsSection consultations={portalData.consultations} />
              <MathflatSection records={portalData.mathflat_records} />
            </div>
          </TabsContent>

          {/* 원비관리 탭 */}
          <TabsContent value="tuition" className="mt-6">
            <TuitionSection
              tuition_fees={portalData.tuition_fees}
              studentName={portalData.student.name}
            />
          </TabsContent>

          {/* 코멘트 탭 */}
          <TabsContent value="comments" className="mt-6">
            <CommentsSection
              studentId={portalData.student.id}
              comments={portalData.learning_comments || []}
              consultationRequests={portalData.consultation_requests || []}
              onRefresh={loadPortalData}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* 7. Quick Action Menu */}
      <QuickActionMenu />
    </>
  )
}
