"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
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
import { ClassesSection } from "@/components/portal/classes-section"
import { TuitionSection } from "@/components/portal/tuition-section"
import { RefreshCw, GraduationCap, BookOpen, CreditCard, MessageCircle, Award } from "lucide-react"
import { CommentsSection } from "@/components/portal/comments-section"
import { ScoresSummaryCard } from "@/components/portal/scores-summary-card"
import type { PortalTab } from "@/components/portal/mobile-bottom-nav"

interface PortalViewProps {
  studentId: string
  viewerRole: "employee" | "student" | "parent"
  employeeId?: string
  onRefresh?: () => void
  activeTab?: PortalTab
}

export function PortalView({
  studentId,
  viewerRole,
  employeeId,
  onRefresh,
  activeTab = "home",
}: PortalViewProps) {
  const [portalData, setPortalData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!studentId) {
      setLoading(false)
      return
    }

    loadPortalData()
  }, [studentId])

  const loadPortalData = async () => {
    if (!studentId) return

    setLoading(true)
    setError(null)

    try {
      const data = await getPortalData(studentId)
      setPortalData(data)
    } catch (err: any) {
      console.error("Error loading portal data:", err)
      setError(`데이터를 불러오는데 실패했습니다: ${err?.message || "알 수 없는 오류"}`)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    loadPortalData()
    if (onRefresh) {
      onRefresh()
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

  // 학생 프로필 헤더 컴포넌트
  const StudentHeader = () => (
    <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6 rounded-lg border border-blue-200 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className="rounded-full p-2 md:p-3 bg-gradient-to-br from-blue-500 to-indigo-600">
          <GraduationCap className="h-5 w-5 md:h-6 md:w-6 text-white" />
        </div>
        <h1 className="text-xl md:text-3xl font-bold text-gray-800">{portalData.student.name}</h1>
      </div>
      <div className="flex flex-wrap gap-2 md:gap-4 text-sm">
        <div className="flex items-center gap-1 md:gap-2">
          <span className="text-gray-600">학년:</span>
          <span className="font-semibold text-gray-800">{portalData.student.grade}학년</span>
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          <span className="text-gray-600">학교:</span>
          <span className="font-semibold text-gray-800">{portalData.student.school}</span>
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          <span className="text-gray-600">상태:</span>
          <span className="px-2 md:px-3 py-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full text-xs font-semibold shadow-sm">
            {portalData.student.status}
          </span>
        </div>
      </div>
    </div>
  )

  // 홈 탭 (대시보드) 렌더링
  const renderHomeTab = () => {
    // 최근 숙제 정보 (최근 2일)
    const uniqueDates = Array.from(
      new Set(portalData.study_logs.map(log => log.date))
    ).slice(0, 2)

    const logsByDate = uniqueDates.map(date => ({
      date,
      logs: portalData.study_logs.filter(log => log.date === date)
    }))

    // 예정된 보강 (7일 이내)
    const today = new Date()
    const sevenDaysLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    const upcomingMakeup = portalData.makeup_classes.find(m => {
      if (!m.makeup_date) return false
      const makeupDate = new Date(m.makeup_date)
      return makeupDate >= today && makeupDate <= sevenDaysLater && m.status !== "완료"
    })

    // 이번달 원비 상태 (학부모만)
    const currentMonth = today.getMonth() + 1
    const currentYear = today.getFullYear()
    const currentTuition = portalData.tuition_fees.find(
      t => t.year === currentYear && t.month === currentMonth
    )

    // 최신 코멘트
    const latestComment = portalData.learning_comments?.[0]

    return (
      <div className="space-y-4 md:space-y-6">
        {/* 학생 정보 */}
        <StudentHeader />

        {/* 미납 원비 알림 (학부모만) */}
        {viewerRole === "parent" && portalData.tuition_fees.some(t => t.payment_status === "미납") && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-red-600 font-semibold">미납 원비 알림</span>
              <span className="text-red-700 font-bold">
                {portalData.tuition_fees
                  .filter(t => t.payment_status === "미납")
                  .reduce((sum, t) => sum + t.amount, 0)
                  .toLocaleString()}원
              </span>
            </div>
          </div>
        )}

        {/* 요약 카드 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 오늘 숙제 카드 */}
          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-500" />
              최근 숙제
            </h3>
            {logsByDate.length > 0 ? (
              <div className="space-y-2">
                {logsByDate.slice(0, 1).map(({ date, logs }) => (
                  <div key={date}>
                    <div className="text-xs text-gray-500 mb-1">
                      {new Date(date).toLocaleDateString('ko-KR', {
                        month: 'long', day: 'numeric', weekday: 'short'
                      })}
                    </div>
                    {logs.slice(0, 2).map((log, idx) => (
                      <div key={idx} className="text-sm text-gray-700">
                        {log.book2 && <span className="font-medium">{log.book2}</span>}
                        {log.book2log && <span className="text-gray-600"> - {log.book2log}</span>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">오늘 예정된 숙제가 없습니다</p>
            )}
          </div>

          {/* 보강 예정 카드 */}
          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-orange-500" />
              보강 예정
            </h3>
            {upcomingMakeup ? (
              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-700">
                  {new Date(upcomingMakeup.makeup_date!).toLocaleDateString('ko-KR', {
                    month: 'long', day: 'numeric', weekday: 'short'
                  })}
                  {upcomingMakeup.start_time && ` ${upcomingMakeup.start_time}`}
                </div>
                <div className="text-sm text-gray-600">
                  {upcomingMakeup.class_name} - {
                    upcomingMakeup.absence_reason === 'sick' ? '병결' :
                    upcomingMakeup.absence_reason === 'travel' ? '여행' :
                    upcomingMakeup.absence_reason === 'event' ? '행사' :
                    upcomingMakeup.absence_reason === 'other' ? '기타' :
                    upcomingMakeup.makeup_type === 'additional' ? '보강' :
                    upcomingMakeup.absence_reason || '보강'
                  }
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">예정된 보강이 없습니다</p>
            )}
          </div>

          {/* 이번달 원비 (학부모만) */}
          {viewerRole === "parent" && (
            <div className="bg-white border rounded-lg p-4 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-green-500" />
                이번달 원비
              </h3>
              {currentTuition ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${
                      currentTuition.payment_status === "완납" ? "text-green-600" :
                      currentTuition.payment_status === "미납" ? "text-red-600" : "text-yellow-600"
                    }`}>
                      {currentTuition.payment_status}
                    </span>
                    <span className="text-sm text-gray-600">
                      {currentTuition.amount.toLocaleString()}원
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">원비 정보가 없습니다</p>
              )}
            </div>
          )}

          {/* 최신 코멘트 카드 */}
          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-purple-500" />
              최신 코멘트
            </h3>
            {latestComment ? (
              <div className="space-y-1">
                <div className="text-xs text-gray-500">
                  {latestComment.year}년 {latestComment.month}월
                </div>
                <div className="text-sm text-gray-700 line-clamp-2">
                  {latestComment.content}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">아직 작성된 코멘트가 없습니다</p>
            )}
          </div>
        </div>

        {/* 성적 요약 카드 */}
        <ScoresSummaryCard scores={portalData.test_scores_with_averages} />

        {/* 수강 중인 반 */}
        <ClassesSection classes={portalData.classes} />
      </div>
    )
  }

  // 학습 탭 렌더링
  const renderLearningTab = () => (
    <div className="space-y-6 md:space-y-8">
      <StudentHeader />

      {/* Monthly Summary Cards */}
      <MonthlySummaryCards
        monthly_aggregations={portalData.monthly_aggregations}
        monthly_mathflat_stats={portalData.monthly_mathflat_stats}
      />

      {/* Learning Trends Chart */}
      <LearningTrendsChart monthly_aggregations={portalData.monthly_aggregations} />

      {/* Learning Calendar */}
      <LearningCalendar
        study_logs={portalData.study_logs}
        test_logs={portalData.test_logs}
        makeup_classes={portalData.makeup_classes}
        consultations={portalData.consultations}
        mathflat_records={portalData.mathflat_records}
      />

      {/* Detailed Records */}
      <div className="space-y-6">
        <h2 className="text-xl md:text-2xl font-bold">상세 학습 기록</h2>
        <ExamScoresSection scores={portalData.school_exam_scores} />
        <StudyLogsSection logs={portalData.study_logs} />
        <TestLogsSection logs={portalData.test_logs} />
        <MakeupClassesSection classes={portalData.makeup_classes} />
        <ConsultationsSection consultations={portalData.consultations} />
        <MathflatSection records={portalData.mathflat_records} />
      </div>
    </div>
  )

  // 원비 탭 렌더링
  const renderTuitionTab = () => (
    <div className="space-y-6">
      <StudentHeader />
      <TuitionSection
        tuition_fees={portalData.tuition_fees}
        studentName={portalData.student.name}
      />
    </div>
  )

  // 코멘트 탭 렌더링
  const renderCommentsTab = () => (
    <div className="space-y-6">
      <StudentHeader />
      <CommentsSection
        studentId={portalData.student.id}
        comments={portalData.learning_comments || []}
        consultationRequests={portalData.consultation_requests || []}
        onRefresh={handleRefresh}
        canCreateComment={viewerRole === "employee"}
        teacherId={employeeId}
      />
    </div>
  )

  // 탭에 따른 콘텐츠 렌더링
  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return renderHomeTab()
      case "learning":
        return renderLearningTab()
      case "tuition":
        return renderTuitionTab()
      case "comments":
        return renderCommentsTab()
      default:
        return renderHomeTab()
    }
  }

  return <div className="space-y-4 md:space-y-6">{renderContent()}</div>
}
