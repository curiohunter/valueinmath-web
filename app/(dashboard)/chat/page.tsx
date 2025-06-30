import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import MultiChatPage from "@/app/(dashboard)/chat/MultiChatPage"

export default async function ChatPage() {
  const cookieStore = await cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 사용자의 직원 정보 확인 - 원장 권한만 허용
  const { data: employee } = await supabase
    .from('employees')
    .select('position')
    .eq('auth_id', user.id)
    .single()

  // 원장이 아닌 경우 접근 거부
  if (employee?.position !== '원장') {
    redirect('/dashboard')
  }

  return <MultiChatPage user={user} />
} 