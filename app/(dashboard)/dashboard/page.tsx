'use client'

import { useState, useEffect, useCallback } from "react"
import dynamic from "next/dynamic"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Plus, Users, BarChart3 } from "lucide-react"
import DashboardCalendar from "@/components/dashboard/DashboardCalendar"
import { ConsultationTable } from "@/components/dashboard/ConsultationTable"
import { EntranceTestTable } from "@/components/dashboard/EntranceTestTable"
import ChurnRiskCard from "@/components/dashboard/ChurnRiskCard"
import { StatsCards } from "@/components/dashboard/StatsCards"
import { QuickAccessSection } from "@/components/dashboard/QuickAccessSection"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/providers/auth-provider"
import { toast } from "sonner"
import type { ChurnRiskStudent } from "@/components/dashboard/ChurnRiskCard"
import type { ConsultationData } from "@/types/dashboard"
import type { EntranceTestData } from "@/components/dashboard/TestModal"

// 모달 컴포넌트 지연 로딩 (bundle-dynamic-imports)
const StudentDetailModal = dynamic(
  () => import("@/components/dashboard/StudentDetailModal"),
  { ssr: false }
)
const TestModal = dynamic(
  () => import("@/components/dashboard/TestModal").then(m => ({ default: m.TestModal })),
  { ssr: false }
)
const StudentFormModal = dynamic(
  () => import("@/components/students/student-form-modal").then(m => ({ default: m.StudentFormModal })),
  { ssr: false }
)
const ClassFormModal = dynamic(
  () => import("@/components/students/classes/class-form-modal").then(m => ({ default: m.ClassFormModal })),
  { ssr: false }
)
const StudentManagementTab = dynamic(
  () => import("@/components/dashboard/student-management-tab").then(m => ({ default: m.StudentManagementTab })),
  { ssr: false }
)

// 입학테스트비 기본 금액
const ENTRANCE_TEST_FEE = 10000

// 커스텀 훅 import
import { useDashboardStats } from "@/hooks/use-dashboard-stats"
import { useConsultations } from "@/hooks/use-consultations"
import { useEntranceTests } from "@/hooks/use-entrance-tests"
import { useChurnRiskStudents } from "@/hooks/use-churn-risk"
import { useEnrollmentFlow } from "@/hooks/use-enrollment-flow"
import { useDashboardCalendar } from "@/hooks/use-dashboard-calendar"

export default function DashboardPage() {
  const { user } = useAuth()
  const supabase = createClient()

  // 커스텀 훅 사용 (각 훅이 자체적으로 초기 로드 수행)
  const { stats, isLoading: statsLoading, refresh: refreshStats } = useDashboardStats()
  const { consultations, isLoading: consultationsLoading, saveConsultation, deleteConsultation, refresh: refreshConsultations } = useConsultations()
  const { entranceTests, isLoading: testsLoading, createTest, saveTest, deleteTest, refresh: refreshEntranceTests } = useEntranceTests()
  const { students: churnRiskStudents, isLoading: churnLoading, refresh: refreshChurnRisk } = useChurnRiskStudents()
  const { handleCreateCalendarEvent } = useDashboardCalendar()
  const {
    editingStudentForTest,
    currentTestId,
    isStudentFormModalOpen,
    setIsStudentFormModalOpen,
    isClassFormModalOpen,
    setIsClassFormModalOpen,
    newlyEnrolledStudent,
    teachers,
    allStudents,
    handleEnrollmentDecision,
    handleStudentFormSuccess
  } = useEnrollmentFlow()

  // 로컬 상태 (모달 관련)
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [editingConsultation, setEditingConsultation] = useState<ConsultationData | null>(null)
  const [editingTest, setEditingTest] = useState<EntranceTestData | null>(null)
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false)
  const [isTestModalOpen, setIsTestModalOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<ChurnRiskStudent | null>(null)
  const [isStudentDetailModalOpen, setIsStudentDetailModalOpen] = useState(false)

  // 입학테스트비 확인 다이얼로그 상태
  const [showTuitionFeeConfirm, setShowTuitionFeeConfirm] = useState(false)
  const [pendingTuitionFeeData, setPendingTuitionFeeData] = useState<{
    studentId: string
    studentName: string
    testDate: string
  } | null>(null)

  // 모든 데이터 새로고침 (사용자 액션 후에만 호출)
  const refreshAllData = useCallback(async () => {
    await Promise.all([
      refreshStats(),
      refreshConsultations(),
      refreshEntranceTests(),
      refreshChurnRisk()
    ])
  }, [refreshStats, refreshConsultations, refreshEntranceTests, refreshChurnRisk])

  // 직원 ID 로드
  useEffect(() => {
    const loadEmployeeId = async () => {
      if (!user) return

      try {
        const { data: employee } = await supabase
          .from("employees")
          .select("id")
          .eq("auth_id", user.id)
          .eq("status", "재직")
          .single()

        if (employee) {
          setEmployeeId(employee.id)
        }
      } catch (error) {
        console.error("Failed to load employee ID:", error)
      }
    }

    loadEmployeeId()
  }, [user, supabase])

  // 중복 fetch 제거: 각 훅이 자체적으로 초기 로드를 수행하므로
  // 별도의 초기 데이터 로드 useEffect 불필요

  // 입학테스트 생성 핸들러
  const handleCreateTest = useCallback((consultationId: string) => {
    const newTest = createTest(consultationId, consultations)
    if (newTest) {
      setEditingTest(null)
      setTimeout(() => {
        setEditingTest(newTest)
        setIsTestModalOpen(true)
      }, 50)
    }
  }, [createTest, consultations])

  // 상담 저장 핸들러
  const handleConsultationSave = useCallback(async (data: Partial<ConsultationData>) => {
    const result = await saveConsultation(data, editingConsultation)
    if (result.success) {
      await refreshStats()
      await refreshConsultations()
      if (result.statusChanged) {
        await refreshEntranceTests()
      }
      setIsConsultationModalOpen(false)
      setEditingConsultation(null)
    }
  }, [saveConsultation, editingConsultation, refreshStats, refreshConsultations, refreshEntranceTests])

  // 상담 삭제 핸들러
  const handleConsultationDelete = useCallback(async (id: string) => {
    const success = await deleteConsultation(id)
    if (success) {
      await refreshStats()
      await refreshConsultations()
    }
  }, [deleteConsultation, refreshStats, refreshConsultations])

  // 입학테스트 저장 핸들러
  const handleTestSave = useCallback(async (testData: Partial<EntranceTestData>): Promise<boolean> => {
    const isNewTest = !editingTest?.id
    const success = await saveTest(testData, editingTest)

    if (success) {
      // 모달 먼저 닫기
      setIsTestModalOpen(false)
      setEditingTest(null)

      // 신규 생성이고 테스트 날짜가 있으면 입학테스트비 확인 다이얼로그 표시
      if (isNewTest && testData.test_date && editingTest?.student_id) {
        const testDateStr = typeof testData.test_date === 'string'
          ? testData.test_date.split('T')[0]
          : ''
        setPendingTuitionFeeData({
          studentId: editingTest.student_id,
          studentName: editingTest.student_name || '학생',
          testDate: testDateStr
        })
        setShowTuitionFeeConfirm(true)
      }

      // 데이터 새로고침은 백그라운드에서 처리 (await 제거)
      refreshStats()
      refreshEntranceTests()
    }
    return success
  }, [saveTest, editingTest, refreshStats, refreshEntranceTests])

  // 입학테스트비 등록
  const handleCreateTuitionFee = useCallback(async () => {
    if (!pendingTuitionFeeData) return

    const { studentId, studentName, testDate } = pendingTuitionFeeData
    const date = new Date(testDate)
    const year = date.getFullYear()
    const month = date.getMonth() + 1

    try {
      const { error } = await supabase
        .from('tuition_fees')
        .insert({
          student_id: studentId,
          class_id: null,
          year,
          month,
          amount: ENTRANCE_TEST_FEE,
          class_type: '입학테스트비',
          payment_status: '미납',
          student_name_snapshot: studentName,
          class_name_snapshot: null,
          period_start_date: testDate,
          period_end_date: testDate,
          note: null
        })

      if (error) throw error

      toast.success(`${studentName} 학생의 입학테스트비(${ENTRANCE_TEST_FEE.toLocaleString()}원)가 등록되었습니다.`)
    } catch (error) {
      console.error('입학테스트비 등록 오류:', error)
      toast.error('입학테스트비 등록 중 오류가 발생했습니다.')
    } finally {
      setShowTuitionFeeConfirm(false)
      setPendingTuitionFeeData(null)
    }
  }, [pendingTuitionFeeData, supabase])

  // 입학테스트비 건너뛰기
  const handleSkipTuitionFee = useCallback(() => {
    setShowTuitionFeeConfirm(false)
    setPendingTuitionFeeData(null)
  }, [])

  // 입학테스트 삭제 핸들러
  const handleTestDelete = useCallback(async (id: number) => {
    const success = await deleteTest(id)
    if (success) {
      await refreshStats()
      await refreshEntranceTests()
    }
  }, [deleteTest, refreshStats, refreshEntranceTests])

  // 학생 정보 저장 성공 핸들러
  const handleStudentFormSuccessWrapper = useCallback(async () => {
    await handleStudentFormSuccess(refreshAllData)
  }, [handleStudentFormSuccess, refreshAllData])

  // 로딩 상태: 핵심 데이터만 체크 (stats)
  const isInitialLoading = statsLoading

  if (isInitialLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">대시보드</h1>
          <p className="text-muted-foreground">데이터를 로딩하고 있습니다...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            운영현황
          </TabsTrigger>
          <TabsTrigger value="students" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            학생관리
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* 통계 카드 */}
          <StatsCards stats={stats} />

          {/* 바로가기 섹션 */}
          <QuickAccessSection />

          {/* 중간 영역: 신규상담 + 입학테스트 관리 */}
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            {/* 왼쪽: 신규상담 목록 */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">신규상담 관리</CardTitle>
                    <CardDescription className="text-xs">상담 진행 중인 학생들을 관리합니다</CardDescription>
                  </div>
                  <Button
                    onClick={() => {
                      setEditingConsultation(null)
                      setIsConsultationModalOpen(true)
                    }}
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    신규 등록
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-3">
                {consultationsLoading ? (
                  <div className="text-center py-4 text-muted-foreground">로딩 중...</div>
                ) : (
                  <ConsultationTable
                    consultations={consultations}
                    onEdit={(consultation) => {
                      setEditingConsultation(consultation)
                      setIsConsultationModalOpen(true)
                    }}
                    onDelete={handleConsultationDelete}
                    onCreateTest={handleCreateTest}
                  />
                )}
              </CardContent>
            </Card>

            {/* 오른쪽: 입학테스트 상세정보 */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">입학테스트 관리</CardTitle>
                    <CardDescription className="text-xs">입학테스트 일정 및 결과를 관리합니다</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-3">
                {testsLoading ? (
                  <div className="text-center py-4 text-muted-foreground">로딩 중...</div>
                ) : (
                  <EntranceTestTable
                    entranceTests={entranceTests}
                    onEdit={(test) => {
                      setEditingTest(test)
                      setIsTestModalOpen(true)
                    }}
                    onDelete={handleTestDelete}
                    onEnrollmentDecision={handleEnrollmentDecision}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* 하단: 학원 일정 캘린더 및 이탈 위험 학생 */}
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            {/* 왼쪽: 캘린더 */}
            <DashboardCalendar />

            {/* 오른쪽: 이탈 위험 학생 */}
            <ChurnRiskCard
              students={churnRiskStudents}
              loading={churnLoading}
              onStudentClick={(student) => {
                setSelectedStudent(student)
                setIsStudentDetailModalOpen(true)
              }}
            />
          </div>

          {/* 신규상담 편집 모달 - StudentFormModal 사용 */}
          {isConsultationModalOpen && (
            <StudentFormModal
              open={isConsultationModalOpen}
              onOpenChange={(open) => {
                setIsConsultationModalOpen(open)
                if (!open) {
                  setEditingConsultation(null)
                }
              }}
              student={editingConsultation}
              onSuccess={async () => {
                await refreshConsultations()
                await refreshStats()
                setIsConsultationModalOpen(false)
                setEditingConsultation(null)
              }}
              isConsultationMode={true}
            />
          )}

          {/* 입학테스트 편집 모달 */}
          {isTestModalOpen && (
            <TestModal
              open={isTestModalOpen}
              onOpenChange={(open) => {
                setIsTestModalOpen(open)
                if (!open) {
                  setEditingTest(null)
                }
              }}
              test={editingTest}
              onSave={handleTestSave}
              onStatusChange={() => {
                refreshConsultations()
                refreshStats()
              }}
            />
          )}

          {/* 학생 상세 정보 모달 */}
          {isStudentDetailModalOpen && (
            <StudentDetailModal
              isOpen={isStudentDetailModalOpen}
              onClose={() => {
                setIsStudentDetailModalOpen(false)
                setSelectedStudent(null)
              }}
              student={selectedStudent}
            />
          )}

          {/* 학생 정보 수정 모달 (등록 결정 시) */}
          {isStudentFormModalOpen && (
            <StudentFormModal
              open={isStudentFormModalOpen}
              onOpenChange={setIsStudentFormModalOpen}
              student={editingStudentForTest}
              onSuccess={handleStudentFormSuccessWrapper}
            />
          )}

          {/* 반 등록 모달 */}
          {isClassFormModalOpen && (
            <ClassFormModal
              open={isClassFormModalOpen}
              onClose={() => {
                setIsClassFormModalOpen(false)
              }}
              teachers={teachers}
              students={allStudents}
              mode="create"
              initialData={newlyEnrolledStudent ? {
                name: '',
                subject: '',
                teacher_id: '',
                selectedStudentIds: [newlyEnrolledStudent.id]
              } : undefined}
            />
          )}

          {/* 입학테스트비 등록 확인 다이얼로그 */}
          <AlertDialog open={showTuitionFeeConfirm} onOpenChange={setShowTuitionFeeConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>입학테스트비 등록</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-2">
                    <p>
                      <strong>{pendingTuitionFeeData?.studentName}</strong> 학생의 입학테스트비를 등록하시겠습니까?
                    </p>
                    <p className="text-sm text-muted-foreground">
                      테스트 날짜: {pendingTuitionFeeData?.testDate}
                    </p>
                    <p className="font-medium text-foreground">
                      금액: {ENTRANCE_TEST_FEE.toLocaleString()}원
                    </p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={handleSkipTuitionFee}>
                  건너뛰기
                </AlertDialogCancel>
                <AlertDialogAction onClick={handleCreateTuitionFee}>
                  등록하기
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>

        <TabsContent value="students" className="mt-6">
          <StudentManagementTab employeeId={employeeId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
