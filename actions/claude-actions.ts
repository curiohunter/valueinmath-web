"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

// Claude 인사이트 삭제
export async function deleteClaudeInsight(id: string) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return { success: false, error: "인증되지 않은 사용자입니다." }
    }

    const { data, error } = await supabase
      .from("claude_insights")
      .delete()
      .eq("id", id)
      .select()

    if (error) {
      console.error('Delete error:', error)
      return { success: false, error: error.message }
    }

    // 실제로 삭제된 행이 있는지 확인
    const deletedCount = data?.length || 0
    
    if (deletedCount === 0) {
      return { success: false, error: "인사이트를 찾을 수 없거나 삭제 권한이 없습니다." }
    }

    // 캐시 무효화
    revalidatePath("/dashboard/claude")

    return { success: true }
  } catch (error: any) {
    console.error('Error in deleteClaudeInsight:', error)
    return { success: false, error: error.message }
  }
}