import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = createServerSupabaseClient()

  // 현재 로그인한 사용자 가져오기
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // 로그인하지 않은 경우 로그인 페이지로 리디렉션
  if (!session) {
    redirect("/login?redirect=/admin")
  }

  // 사용자의 직원 정보 확인
  const { data: employee } = await supabase.from("employees").select("position").eq("auth_id", session.user.id).single()

  // 원장 또는 부원장이 아닌 경우 접근 거부
  const isAdmin = employee?.position === "원장" || employee?.position === "부원장"

  if (!isAdmin) {
    redirect("/")
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">관리자 페이지</h1>
      {children}
    </div>
  )
}
