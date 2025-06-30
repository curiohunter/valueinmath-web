import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { StudentsPageClient } from "@/app/(dashboard)/students/students-page-client"

export default async function StudentsPage() {
  const cookieStore = await cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect("/login")

  // 필요한 데이터 fetch 예시 (실제 데이터 구조에 맞게 수정)
  // const { data: students } = await supabase.from("students").select("*")

  return <StudentsPageClient />
}
