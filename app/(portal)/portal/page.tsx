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
  school_type: string | null
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
        .select("role")
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

      // For students/parents: profile_students 테이블에서 연결된 학생들 조회
      const { data: profileStudents } = await supabase
        .from("profile_students")
        .select("student_id, is_primary")
        .eq("profile_id", user.id)

      if (!profileStudents || profileStudents.length === 0) {
        setError("학생 정보가 연결되지 않았습니다.")
        return
      }

      // 연결된 학생 ID들
      const linkedStudentIds = profileStudents.map(ps => ps.student_id)
      const primaryStudentId = profileStudents.find(ps => ps.is_primary)?.student_id || linkedStudentIds[0]

      setStudentId(primaryStudentId)

      // 연결된 학생들의 상세 정보 조회
      const { data: linkedStudents } = await supabase
        .from("students")
        .select(`
          id, name, status,
          student_schools (
            grade,
            school_name_snapshot,
            school:schools (school_type)
          )
        `)
        .in("id", linkedStudentIds)
        .eq("student_schools.is_current", true)

      if (linkedStudents && linkedStudents.length > 0) {
        // student_schools에서 grade/school/school_type 매핑
        const mappedStudents: Sibling[] = linkedStudents.map((s: any) => {
          const currentSchool = s.student_schools?.[0]
          return {
            id: s.id,
            name: s.name,
            status: s.status,
            grade: currentSchool?.grade ?? null,
            school: currentSchool?.school_name_snapshot ?? null,
            school_type: currentSchool?.school?.school_type ?? null,
          }
        })

        // 재원 학생만 필터링하여 siblings로 설정
        const activeStudents = mappedStudents.filter(s => s.status === "재원")

        if (activeStudents.length > 0) {
          setSiblings(activeStudents)
          // 기본 선택: 가장 나이가 많은 학생 (고 > 중 > 초, 같은 학교급이면 학년 높은 순)
          const getSchoolTypeOrder = (schoolType: string | null): number => {
            if (!schoolType) return 99
            if (schoolType.includes("고등") || schoolType === "고등학교") return 1
            if (schoolType.includes("중") || schoolType === "중학교") return 2
            if (schoolType.includes("초등") || schoolType === "초등학교") return 3
            return 99
          }
          const sortedStudents = [...activeStudents].sort((a, b) => {
            const orderA = getSchoolTypeOrder(a.school_type)
            const orderB = getSchoolTypeOrder(b.school_type)
            if (orderA !== orderB) return orderA - orderB
            return (b.grade || 0) - (a.grade || 0)
          })
          setSelectedStudentId(sortedStudents[0].id)
        } else {
          // 재원 학생이 없으면 primary 학생 사용 (퇴원 상태라도)
          setSelectedStudentId(primaryStudentId)
        }
      } else {
        setSelectedStudentId(primaryStudentId)
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
