import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/auth/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PendingApprovalClient } from "./pending-approval-client"
import { LogoutButton } from "./logout-button"
import { RegistrationForm } from "./registration-form"

export const metadata: Metadata = {
  title: "승인 대기 중 | 학원관리 시스템",
  description: "계정 승인을 기다리고 있습니다",
}

export default async function PendingApprovalPage() {
  const supabase = await createServerClient()
  
  // 사용자 확인 (getUser로 변경 - 더 안전)
  const {
    data: { user },
    error
  } = await supabase.auth.getUser()

  // 로그인하지 않은 경우 로그인 페이지로 리디렉션
  if (error || !user) {
    redirect("/login")
  }

  // 직원 확인 (이미 등록된 직원인지)
  const { data: employee } = await supabase
    .from("employees")
    .select("position, approval_status")
    .eq("auth_id", user.id)
    .single()

  // 직원이면서 승인된 경우 대시보드로 리디렉션
  if (employee?.approval_status === "approved") {
    redirect("/dashboard")
  }

  // 등록 신청 정보 확인
  const { data: registration } = await supabase
    .from("pending_registrations")
    .select("*")
    .eq("user_id", user.id)
    .single()

  // 등록 신청이 승인된 경우 대시보드로 리디렉션
  if (registration?.status === "approved") {
    redirect("/dashboard")
  }

  // 등록 신청이 거부된 경우
  if (registration?.status === "rejected") {
    redirect("/login?error=등록이 거부되었습니다. 관리자에게 문의하세요.")
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "student": return "학생"
      case "parent": return "학부모"
      case "teacher": return "직원"
      default: return ""
    }
  }

  return (
    <>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">학원관리 시스템</h1>
        <LogoutButton />
      </div>

      {!registration ? (
        // 등록 신청이 없는 경우 - 등록 폼 표시
        <RegistrationForm 
          user={user} 
        />
      ) : (
        // 등록 신청이 있는 경우 - 대기 상태 표시
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              승인 대기 중
            </CardTitle>
            <CardDescription>
              등록 신청이 접수되었습니다. 관리자 승인을 기다리고 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 등록 정보 표시 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-2">📧 등록 정보</p>
                <div className="space-y-1">
                  <p><span className="font-medium">이메일:</span> {registration.email}</p>
                  <p><span className="font-medium">역할:</span> {getRoleLabel(registration.role)}</p>
                  <p><span className="font-medium">이름:</span> {registration.name}</p>
                  {registration.student_name && (
                    <p><span className="font-medium">학생 이름:</span> {registration.student_name}</p>
                  )}
                  <p><span className="font-medium">신청일:</span> {new Date(registration.created_at).toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">⏰ 승인 소요 시간</p>
                <p>일반적으로 1-2시간 내에 승인이 완료됩니다.</p>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-700">
                <p className="font-medium mb-1">📞 문의사항</p>
                <p>승인이 지연되거나 문의사항이 있으시면</p>
                <p>관리자에게 연락해 주세요.</p>
                <p className="mt-2 font-medium">📞 02-457-4933</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 클라이언트 컴포넌트로 실시간 상태 확인 */}
      <PendingApprovalClient userId={user.id} />
    </>
  )
}