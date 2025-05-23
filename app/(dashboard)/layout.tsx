import type React from "react"
import { redirect } from "next/navigation"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { DashboardContent } from "@/components/layout/dashboard-content"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 서버 컴포넌트에서 세션 확인
  const supabase = createServerComponentClient({ cookies })
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // 세션이 없으면 로그인 페이지로 리디렉션
  if (!session) {
    redirect("/login")
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <DashboardContent>{children}</DashboardContent>
      </div>
    </div>
  )
}
