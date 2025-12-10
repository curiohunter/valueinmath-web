"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { PortalData } from "@/types/portal"
import { getPortalData } from "@/lib/portal-client"
import { LearningDashboard } from "@/components/portal/learning-dashboard"
import { LearningTrendsChart } from "@/components/portal/learning-trends-chart"
import { LearningCalendar } from "@/components/portal/learning-calendar"
import { StudyLogsSection } from "@/components/portal/study-logs-section"
import { TestLogsSection } from "@/components/portal/test-logs-section"
import { ExamScoresSection } from "@/components/portal/exam-scores-section"
import { MakeupClassesSection } from "@/components/portal/makeup-classes-section"
import { MathflatSection } from "@/components/portal/mathflat-section"
import { ClassesSection } from "@/components/portal/classes-section"
import { TuitionSection } from "@/components/portal/tuition-section"
import { RefreshCw, GraduationCap, BookOpen, MessageCircle, ChevronDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  const [showCommentDialog, setShowCommentDialog] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined)

  // 현재 로그인한 사용자 ID 가져오기
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
      }
    }
    fetchCurrentUser()
  }, [])

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
      const isTeacher = viewerRole === "employee"
      const data = await getPortalData(studentId, isTeacher)
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
    // 예정된 보강 (7일 이내)
    const today = new Date()
    const sevenDaysLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    const upcomingMakeup = portalData.makeup_classes.find(m => {
      if (!m.makeup_date) return false
      const makeupDate = new Date(m.makeup_date)
      return makeupDate >= today && makeupDate <= sevenDaysLater && m.status !== "완료"
    })

    // 최신 코멘트
    const latestComment = portalData.learning_comments?.[0]

    // 출석 상태 라벨
    const attendanceLabels: Record<number, { label: string; color: string }> = {
      5: { label: "출석", color: "text-green-600" },
      4: { label: "지각", color: "text-yellow-600" },
      3: { label: "조퇴", color: "text-orange-600" },
      2: { label: "보강", color: "text-blue-600" },
      1: { label: "결석", color: "text-red-600" },
    }

    // 숙제 점수 라벨
    const homeworkLabels: Record<number, { label: string; color: string }> = {
      5: { label: "100% 마무리", color: "text-green-600" },
      4: { label: "90% 이상", color: "text-blue-600" },
      3: { label: "추가 추적 필요", color: "text-yellow-600" },
      2: { label: "보강필요", color: "text-orange-600" },
      1: { label: "결석", color: "text-red-600" },
    }

    // 집중도 라벨
    const focusLabels: Record<number, { label: string; color: string }> = {
      5: { label: "매우 열의있음", color: "text-green-600" },
      4: { label: "대체로 잘참여", color: "text-blue-600" },
      3: { label: "보통", color: "text-yellow-600" },
      2: { label: "조치필요", color: "text-orange-600" },
      1: { label: "결석", color: "text-red-600" },
    }

    // 최신 학습일지 (최근 3개)
    const recentLogs = portalData.study_logs.slice(0, 3)

    return (
      <div className="space-y-4 md:space-y-6">
        {/* 학생 정보 */}
        <StudentHeader />

        {/* 최신 학습일지 카드 */}
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-blue-500" />
            최신 학습일지
          </h3>
          {recentLogs.length > 0 ? (
            <div className="space-y-3">
              {recentLogs.map((log) => (
                <div key={log.id} className="border-l-2 border-blue-200 pl-3 py-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">
                      {new Date(log.date).toLocaleDateString('ko-KR', {
                        month: 'short', day: 'numeric', weekday: 'short'
                      })}
                    </span>
                    {log.attendance_status && (
                      <span className={`text-xs font-medium ${attendanceLabels[log.attendance_status]?.color || "text-gray-500"}`}>
                        {attendanceLabels[log.attendance_status]?.label || "-"}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-medium text-gray-800">{log.class_name || "반 정보 없음"}</div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs mt-1">
                    {log.homework !== null && homeworkLabels[log.homework] && (
                      <span className="text-gray-500">
                        숙제: <span className={`font-medium ${homeworkLabels[log.homework].color}`}>
                          {homeworkLabels[log.homework].label}
                        </span>
                      </span>
                    )}
                    {log.focus !== null && focusLabels[log.focus] && (
                      <span className="text-gray-500">
                        집중: <span className={`font-medium ${focusLabels[log.focus].color}`}>
                          {focusLabels[log.focus].label}
                        </span>
                      </span>
                    )}
                  </div>
                  {(log.book1 || log.book2) && (
                    <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                      {log.book1 && (
                        <div>
                          진도: {log.book1}
                          {log.book1log && <span className="text-gray-500"> ({log.book1log})</span>}
                        </div>
                      )}
                      {log.book2 && (
                        <div>
                          숙제: {log.book2}
                          {log.book2log && <span className="text-gray-500"> ({log.book2log})</span>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">학습일지가 없습니다</p>
          )}
        </div>

        {/* 최근 테스트 성적 */}
        <ScoresSummaryCard scores={portalData.test_scores_with_averages} />

        {/* 요약 카드 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

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

          {/* 최신 코멘트 카드 */}
          <div
            className={`bg-white border rounded-lg p-4 shadow-sm ${latestComment ? "cursor-pointer hover:border-purple-300 transition-colors" : ""}`}
            onClick={() => latestComment && setShowCommentDialog(true)}
          >
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-purple-500" />
              최신 코멘트
              {latestComment && (
                <span className="text-xs text-gray-400 font-normal ml-auto">탭하여 전체보기</span>
              )}
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

        {/* 코멘트 전체보기 다이얼로그 */}
        <Dialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
          <DialogContent className="max-w-md" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-purple-500" />
                {latestComment?.year}년 {latestComment?.month}월 코멘트
              </DialogTitle>
            </DialogHeader>
            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {latestComment?.content}
            </div>
          </DialogContent>
        </Dialog>

        {/* 수강 중인 반 */}
        <ClassesSection classes={portalData.classes} />
      </div>
    )
  }

  // 학습 탭 렌더링
  const renderLearningTab = () => (
    <div className="space-y-6 md:space-y-8">
      <StudentHeader />

      {/* Learning Dashboard with Trends */}
      <LearningDashboard
        monthly_aggregations={portalData.monthly_aggregations}
        monthly_mathflat_stats={portalData.monthly_mathflat_stats}
      />

      {/* Learning Trends Chart */}
      <LearningTrendsChart monthly_aggregations={portalData.monthly_aggregations} />

      {/* Learning Calendar - Collapsible (기본 접힘) */}
      <Collapsible defaultOpen={false}>
        <Card>
          <CardHeader className="pb-0">
            <CollapsibleTrigger className="flex items-center justify-between w-full hover:no-underline group">
              <CardTitle className="text-lg">학습 캘린더</CardTitle>
              <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-4">
              <LearningCalendar
                study_logs={portalData.study_logs}
                test_logs={portalData.test_logs}
                makeup_classes={portalData.makeup_classes}
                consultations={[]}
                mathflat_records={portalData.mathflat_records}
              />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Detailed Records - Accordion */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">상세 학습 기록</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="exams">
              <AccordionTrigger>학교 시험 성적</AccordionTrigger>
              <AccordionContent>
                <ExamScoresSection scores={portalData.school_exam_scores} />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="logs">
              <AccordionTrigger>학습 일지</AccordionTrigger>
              <AccordionContent>
                <StudyLogsSection logs={portalData.study_logs} />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="tests">
              <AccordionTrigger>테스트 기록</AccordionTrigger>
              <AccordionContent>
                <TestLogsSection logs={portalData.test_logs} />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="makeup">
              <AccordionTrigger>보강 수업</AccordionTrigger>
              <AccordionContent>
                <MakeupClassesSection classes={portalData.makeup_classes} />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="mathflat">
              <AccordionTrigger>매쓰플랫 학습</AccordionTrigger>
              <AccordionContent>
                <MathflatSection records={portalData.mathflat_records} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
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
        currentUserId={currentUserId}
        viewerRole={viewerRole}
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
