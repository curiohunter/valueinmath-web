"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

// 서버 사이드에서 pending 사용자 조회 테스트
export async function testGetPendingUsers() {
  try {
    const supabase = createServerActionClient({ cookies })
    
    // 현재 사용자 확인
    const { data: { session } } = await supabase.auth.getSession()
    console.log('🧪 서버: 현재 세션:', session?.user?.id)
    
    // 관리자 권한 확인
    const { data: employee } = await supabase
      .from("employees")
      .select("position, name")
      .eq("auth_id", session?.user?.id)
      .single()
    
    console.log('🧪 서버: 직원 정보:', employee)
    
    // pending 사용자 조회
    const { data: pendingUsers, error } = await supabase
      .from("profiles")
      .select("id, name, email, approval_status, created_at")
      .eq("approval_status", "pending")
      .order("created_at", { ascending: false })
    
    console.log('🧪 서버: pending 사용자 조회 결과:', { pendingUsers, error })
    
    return {
      success: true,
      session: session?.user?.id,
      employee,
      pendingUsers,
      error
    }
  } catch (error: any) {
    console.error('🧪 서버: 오류:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
