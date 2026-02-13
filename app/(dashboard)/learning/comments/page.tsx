"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import LearningTabs from "@/components/learning/LearningTabs"
import { StudentManagementList } from "@/components/dashboard/student-management-list"
import { PortalView } from "@/components/portal/portal-view"
import { Home, BookOpen, MessageCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/providers/auth-provider"
import type { PortalTab } from "@/components/portal/mobile-bottom-nav"

export default function LearningCommentsPage() {
  const { user } = useAuth()
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [selectedStudentForComment, setSelectedStudentForComment] = useState<any>(null)

  // 이전 월을 기본값으로
  const now = new Date()
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const [commentYear, setCommentYear] = useState(prevMonthDate.getFullYear())
  const [commentMonth, setCommentMonth] = useState(prevMonthDate.getMonth() + 1)
  const [commentListRefreshTrigger, setCommentListRefreshTrigger] = useState(0)
  const [activeTab, setActiveTab] = useState<PortalTab>("home")

  useEffect(() => {
    const loadEmployeeId = async () => {
      if (!user) return
      try {
        const supabase = createClient()
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
  }, [user])

  const tabs: { key: PortalTab; label: string; icon: typeof Home }[] = [
    { key: "home", label: "홈", icon: Home },
    { key: "learning", label: "학습", icon: BookOpen },
    { key: "comments", label: "코멘트", icon: MessageCircle },
  ]

  return (
    <div className="space-y-6">
      <LearningTabs />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 좌측: 학생 목록 */}
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
              setCommentListRefreshTrigger((prev) => prev + 1)
            }}
            refreshTrigger={commentListRefreshTrigger}
          />
        </div>

        {/* 우측: 포털 뷰 */}
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
                  setCommentListRefreshTrigger((prev) => prev + 1)
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
    </div>
  )
}
