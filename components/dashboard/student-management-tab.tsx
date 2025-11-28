'use client'

import { useState } from "react"
import { StudentManagementList } from "@/components/dashboard/student-management-list"
import { PortalView } from "@/components/portal/portal-view"
import { Home, BookOpen, MessageCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PortalTab } from "@/components/portal/mobile-bottom-nav"

interface StudentManagementTabProps {
  employeeId: string | null
}

export function StudentManagementTab({ employeeId }: StudentManagementTabProps) {
  const [selectedStudentForComment, setSelectedStudentForComment] = useState<any>(null)
  const [commentYear, setCommentYear] = useState(new Date().getFullYear())
  const [commentMonth, setCommentMonth] = useState(new Date().getMonth() + 1)
  const [commentListRefreshTrigger, setCommentListRefreshTrigger] = useState(0)
  const [activeTab, setActiveTab] = useState<PortalTab>("home")

  // 대시보드용 탭 (원비 제외)
  const tabs: { key: PortalTab; label: string; icon: typeof Home }[] = [
    { key: "home", label: "홈", icon: Home },
    { key: "learning", label: "학습", icon: BookOpen },
    { key: "comments", label: "코멘트", icon: MessageCircle },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 좌측: 학생 목록 (50%) */}
      <div>
        <StudentManagementList
          selectedYear={commentYear}
          selectedMonth={commentMonth}
          selectedStudentId={selectedStudentForComment?.id}
          onStudentSelect={(student) => {
            setSelectedStudentForComment(student)
          }}
          onYearMonthChange={(year, month) => {
            setCommentYear(year)
            setCommentMonth(month)
          }}
          onRefresh={() => {
            setCommentListRefreshTrigger(prev => prev + 1)
          }}
          refreshTrigger={commentListRefreshTrigger}
        />
      </div>

      {/* 우측: 포털 뷰 (50%) */}
      <div>
        {selectedStudentForComment ? (
          <div className="space-y-4">
            {/* 탭 네비게이션 */}
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.key
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      "flex-1 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-all",
                      isActive
                        ? "bg-background text-foreground shadow-sm"
                        : "hover:bg-background/50 text-muted-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                )
              })}
            </div>

            {/* 포털 뷰 */}
            <PortalView
              studentId={selectedStudentForComment.id}
              viewerRole="employee"
              employeeId={employeeId || undefined}
              activeTab={activeTab}
              onRefresh={() => {
                setCommentListRefreshTrigger(prev => prev + 1)
              }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-[60vh] border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">좌측에서 학생을 선택하세요</p>
              <p className="text-sm text-muted-foreground">
                학생의 전체 포털 뷰가 여기에 표시됩니다
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
