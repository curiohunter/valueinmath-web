import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PendingApprovalClient } from "./pending-approval-client"
import { LogoutButton } from "./logout-button"
import { NameInput } from "./name-input"

export const metadata: Metadata = {
  title: "승인 대기 중 | 학원관리 시스템",
  description: "계정 승인을 기다리고 있습니다",
}

export default async function PendingApprovalPage() {
  const supabase = createServerComponentClient({ cookies })
  
  // 세션 확인
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // 로그인하지 않은 경우 로그인 페이지로 리디렉션
  if (!session) {
    redirect("/login")
  }

  // 프로필 정보 조회
  const { data: profile } = await supabase
    .from("profiles")
    .select("approval_status, email")
    .eq("id", session.user.id)
    .single()

  // 이미 승인된 경우 대시보드로 리디렉션
  if (profile?.approval_status === "approved") {
    redirect("/dashboard")
  }

  // 거부된 경우 로그인 페이지로 리디렉션 (에러 메시지와 함께)
  if (profile?.approval_status === "rejected") {
    redirect("/login?error=계정이 거부되었습니다. 관리자에게 문의하세요.")
  }

  return (
    <>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">학원관리 시스템</h1>
        <LogoutButton />
      </div>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {needsName ? (
              <>
                <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                이름 입력 필요
              </>
            ) : (
              <>
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                승인 대기 중
              </>
            )}
          </CardTitle>
          <CardDescription>
            {needsName ? "관리자가 식별할 수 있도록 이름을 입력해 주세요" : "계정 승인을 기다리고 있습니다"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {needsName ? (
            <>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="text-sm text-orange-800">
                  <p className="font-medium mb-2">📝 이름 입력 필요</p>
                  <p className="mb-2">관리자가 어떤 직원인지 식별할 수 있도록 이름을 입력해 주세요.</p>
                  <p>이름 입력 후 관리자가 직원 관리에서 계정을 연결하면 승인이 완료됩니다.</p>
                </div>
              </div>
              
              <NameInput 
                userId={session.user.id} 
                currentName={profile?.name || ""} 
                onNameUpdated={() => window.location.reload()}
              />
            </>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-2">📧 이메일: {profile?.email}</p>
              <p className="mb-2">관리자가 계정을 검토하고 있습니다.</p>
              <p>승인이 완료되면 자동으로 대시보드로 이동됩니다.</p>
            </div>
          </div>
          )}
          
          {!needsName && (
          <>
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
            </>
          )}
        </CardContent>
      </Card>

      {/* 클라이언트 컴포넌트로 실시간 상태 확인 */}
      <PendingApprovalClient userId={session.user.id} />
    </>
  )
}
