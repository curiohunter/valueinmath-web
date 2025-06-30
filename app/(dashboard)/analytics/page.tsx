import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { AnalyticsPageClient } from "./analytics-page-client"

export default async function AnalyticsPage() {
  const cookieStore = await cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore as any })
  const {
    data: { session },
  } = await supabase.auth.getSession()
  
  if (!session) redirect("/login")

  // 권한 체크 - 필요시 특정 역할만 접근 허용
  // const { data: profile } = await supabase
  //   .from("profiles")
  //   .select("role")
  //   .eq("id", session.user.id)
  //   .single()
  // if (profile?.role !== "admin" && profile?.role !== "teacher") {
  //   redirect("/dashboard")
  // }

  return <AnalyticsPageClient />
}