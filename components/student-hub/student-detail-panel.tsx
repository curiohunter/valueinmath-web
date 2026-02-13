"use client"

import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { TAB_GROUPS } from "./tab-config"
import { StudentDetailHeader } from "./student-detail-header"
import { useStudentDetail } from "./hooks/use-student-detail"
import { EmptyState } from "./empty-state"

// Basic Info subtabs
import { StudentInfoSubTab } from "./tabs/basic-info/student-info-subtab"
import { ConsultationHistorySubTab } from "./tabs/basic-info/consultation-history-subtab"
import { EnrollmentHistorySubTab } from "./tabs/basic-info/enrollment-history-subtab"

// Tuition subtabs
import { TuitionSessionSubTab } from "./tabs/tuition/tuition-session-subtab"
import { TuitionHistorySubTab } from "./tabs/tuition/tuition-history-subtab"

// Learning subtabs
import { AttendanceSubTab } from "./tabs/learning/attendance-subtab"
import { MakeupClassSubTab } from "./tabs/learning/makeup-class-subtab"
import { DailyWorkSubTab } from "./tabs/learning/daily-work-subtab"
import { HomeworkAnalysisSubTab } from "./tabs/learning/homework-analysis-subtab"

const SUB_TAB_COMPONENTS: Record<string, React.ComponentType<{ studentId: string }>> = {
  "info": StudentInfoSubTab,
  "consultations": ConsultationHistorySubTab,
  "enrollment-history": EnrollmentHistorySubTab,
  "tuition-sessions": TuitionSessionSubTab,
  "tuition-history": TuitionHistorySubTab,
  "attendance": AttendanceSubTab,
  "makeup": MakeupClassSubTab,
  "daily-work": DailyWorkSubTab,
  "homework-analysis": HomeworkAnalysisSubTab,
}

interface StudentDetailPanelProps {
  studentId: string | null
  activeTab: string
  activeSubTab: string
  onSwitchTab: (tabId: string) => void
  onSwitchSubTab: (subTabId: string) => void
  onBack?: () => void
  showBackButton?: boolean
  onStudentDeleted: () => void
}

export function StudentDetailPanel({
  studentId,
  activeTab,
  activeSubTab,
  onSwitchTab,
  onSwitchSubTab,
  onBack,
  showBackButton,
  onStudentDeleted,
}: StudentDetailPanelProps) {
  const { student, isLoading, refetch } = useStudentDetail(studentId)

  if (!studentId) {
    return <EmptyState />
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!student) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <p className="text-muted-foreground">학생 정보를 불러올 수 없습니다</p>
      </div>
    )
  }

  const currentTabGroup = TAB_GROUPS.find((g) => g.id === activeTab)
  const SubTabComponent = SUB_TAB_COMPONENTS[activeSubTab]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0">
        <StudentDetailHeader
          student={student}
          onBack={onBack}
          showBackButton={showBackButton}
          onStudentUpdated={refetch}
          onStudentDeleted={onStudentDeleted}
        />
      </div>

      {/* Tab Groups (기본정보 / 수업료 / 학습) */}
      <div className="border-b shrink-0">
        <div className="flex">
          {TAB_GROUPS.map((group) => (
            <button
              key={group.id}
              onClick={() => onSwitchTab(group.id)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium transition-colors border-b-2",
                activeTab === group.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {group.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sub Tabs */}
      {currentTabGroup && (
        <Tabs value={activeSubTab} onValueChange={onSwitchSubTab} className="flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="border-b px-4 shrink-0">
            <TabsList className="h-9 bg-transparent p-0 gap-0">
              {currentTabGroup.subTabs.map((subTab) => (
                <TabsTrigger
                  key={subTab.id}
                  value={subTab.id}
                  className="h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-3 text-xs"
                >
                  {subTab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Sub Tab Content */}
          {currentTabGroup.subTabs.map((subTab) => {
            const Component = SUB_TAB_COMPONENTS[subTab.id]
            return (
              <TabsContent key={subTab.id} value={subTab.id} className="mt-0 p-4 flex-1 overflow-auto min-h-0">
                {Component ? <Component studentId={student.id} /> : null}
              </TabsContent>
            )
          })}
        </Tabs>
      )}
    </div>
  )
}
