import { redirect } from "next/navigation"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export default async function HomePage() {
  // 인증 상태 확인
  const supabase = createServerComponentClient({ cookies })
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // 인증 상태에 따라 리디렉션
  if (session) {
    redirect("/dashboard")
  } else {
    redirect("/login")
  }
}
