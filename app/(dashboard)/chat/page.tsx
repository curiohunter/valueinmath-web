import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import MultiChatPage from "@/app/(dashboard)/chat/MultiChatPage"

export default async function ChatPage() {
  const supabase = createServerComponentClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  return <MultiChatPage user={user} />
} 