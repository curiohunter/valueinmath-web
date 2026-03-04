"use server"

import { createServerClient } from "@/lib/auth/server"

// 서버 사이드에서 pending 사용자 조회 테스트
export async function testGetPendingUsers() {
  try {
    const supabase = await createServerClient()

    // getUser()로 서버 검증
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    // 관리자 권한 확인
    const { data: employee } = await supabase
      .from("employees")
      .select("position, name")
      .eq("auth_id", user?.id)
      .single()
    
    // pending 사용자 조회
    const { data: pendingUsers, error } = await supabase
      .from("profiles")
      .select("id, name, email, approval_status, created_at")
      .eq("approval_status", "pending")
      .order("created_at", { ascending: false })
    
    return {
      success: true,
      userId: user?.id,
      employee,
      pendingUsers,
      error
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    }
  }
}
