"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/providers/auth-provider"
import { RefreshCw } from "lucide-react"
import { PortalView } from "@/components/portal/portal-view"
import { QuickActionMenu } from "@/components/portal/quick-action-menu"
import { TeacherCommentForm } from "@/components/portal/teacher-comment-form"

export default function PortalPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<"employee" | "student" | "parent" | null>(null)
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [studentId, setStudentId] = useState<string | null>(null)

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
    } catch (err: any) {
      console.error("Error loading user info:", err)
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
  if (!studentId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">학생 정보를 찾을 수 없습니다.</p>
      </div>
    )
  }

  return (
    <>
      <div className="pb-20">
        <PortalView
          studentId={studentId}
          viewerRole={userRole || "student"}
          employeeId={employeeId}
          onRefresh={loadUserInfo}
        />
      </div>

      {/* Quick Action Menu */}
      <QuickActionMenu />
    </>
  )
}
