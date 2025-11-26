"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/providers/auth-provider"
import { RefreshCw, Home, BookOpen, CreditCard, MessageCircle } from "lucide-react"
import { PortalView } from "@/components/portal/portal-view"
import { TeacherCommentForm } from "@/components/portal/teacher-comment-form"
import { SiblingSelector } from "@/components/portal/sibling-selector"
import { MobileBottomNav, PortalTab } from "@/components/portal/mobile-bottom-nav"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface Sibling {
  id: string
  name: string
  grade: number | null
  school: string | null
  status: string
}

export default function PortalPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<"employee" | "student" | "parent" | null>(null)
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [siblings, setSiblings] = useState<Sibling[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<PortalTab>("home")

  useEffect(() => {
    if (!user) return

    loadUserInfo()
  }, [user])

  const loadUserInfo = async () => {
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

        // Employees don't need student_id
        setLoading(false)
        return
      }

      // For students/parents, get student_id
      if (!profile.student_id) {
        setError("학생 정보가 연결되지 않았습니다.")
        return
      }

      setStudentId(profile.student_id)

      // 학부모인 경우: parent_phone 기반으로 형제(재원) 조회
      if (profile.role === "parent") {
        // 먼저 연결된 학생의 parent_phone 조회
        const { data: mainStudent } = await supabase
          .from("students")
          .select("id, name, grade, school, status, parent_phone")
          .eq("id", profile.student_id)
          .single()

        if (mainStudent?.parent_phone) {
          // 같은 parent_phone을 가진 재원 학생 모두 조회
          const { data: siblingData } = await supabase
            .from("students")
            .select("id, name, grade, school, status")
            .eq("parent_phone", mainStudent.parent_phone)
            .eq("status", "재원")
            .order("grade", { ascending: true })

          if (siblingData && siblingData.length > 0) {
            setSiblings(siblingData)
            // 기본 선택: profile에 연결된 학생 (재원이면), 아니면 첫 번째 재원 학생
            const defaultStudent = siblingData.find(s => s.id === profile.student_id) || siblingData[0]
            setSelectedStudentId(defaultStudent.id)
          } else {
            // 재원 형제가 없으면 연결된 학생 그대로 사용
            setSelectedStudentId(profile.student_id)
          }
        } else {
          setSelectedStudentId(profile.student_id)
        }
      } else {
        // 학생 본인인 경우
        setSelectedStudentId(profile.student_id)
      }
    } catch (err: any) {
      console.error("Error loading user info:", err)
      setError(`데이터를 불러오는데 실패했습니다: ${err?.message || "알 수 없는 오류"}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSiblingSelect = (newStudentId: string) => {
    setSelectedStudentId(newStudentId)
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
            onClick={loadUserInfo}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  // For employees, show teacher view (comment form) - standalone page
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
          <p className="text-gray-600">
            학생들의 월별 학습 코멘트를 작성할 수 있습니다.
            <br />
            <span className="text-sm text-muted-foreground">
              💡 대시보드 &gt; 학생관리 탭에서 학생을 선택하여 포털 뷰로 코멘트를 작성하고 학부모 소통을 확인하세요.
            </span>
          </p>
        </div>

        <TeacherCommentForm
          teacherId={employeeId}
          onSuccess={loadUserInfo}
        />
      </div>
    )
  }

  // For students/parents, check student_id
  if (!selectedStudentId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">학생 정보를 찾을 수 없습니다.</p>
      </div>
    )
  }

  const showTuition = userRole === "parent"

  return (
    <>
      {/* 데스크톱: 상단 Sticky Tabs */}
      <div className="hidden md:block sticky top-[57px] z-40 bg-background border-b -mx-4 px-4 mb-6">
        <div className="grid w-full max-w-md grid-cols-4 mx-auto p-1 bg-muted rounded-lg">
          {(["home", "learning", "tuition", "comments"] as const).map((tab) => {
            if (tab === "tuition" && !showTuition) return null

            const isActive = activeTab === tab
            const labels = {
              home: "홈",
              learning: "학습",
              tuition: "원비",
              comments: "코멘트"
            }
            const Icons = {
              home: Home,
              learning: BookOpen,
              tuition: CreditCard,
              comments: MessageCircle
            }
            const Icon = Icons[tab]

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                  isActive ? "bg-background text-foreground shadow-sm" : "hover:bg-background/50 hover:text-foreground text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4 mr-2" />
                <span className="hidden lg:inline">{labels[tab]}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 형제 선택기 - 학부모 & 2명 이상 재원 자녀 */}
      {userRole === "parent" && siblings.length > 1 && (
        <div className="sticky top-[57px] md:top-[105px] z-30 bg-background -mx-4 px-4 pb-2">
          <SiblingSelector
            siblings={siblings}
            currentStudentId={selectedStudentId}
            onSelect={handleSiblingSelect}
          />
        </div>
      )}

      {/* 포털 뷰 - activeTab 전달 */}
      <PortalView
        studentId={selectedStudentId}
        viewerRole={userRole || "student"}
        employeeId={employeeId}
        onRefresh={loadUserInfo}
        activeTab={activeTab}
      />

      {/* 모바일: 하단 네비게이션 */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showTuition={showTuition}
      />
    </>
  )
}
