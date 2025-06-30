"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// 직원과 사용자 계정 연결
export async function linkEmployeeToUser(employeeId: string, userId: string | null) {
  try {
    const supabase = await createServerSupabaseClient()

    // 직원 테이블 업데이트
    // @ts-ignore - Supabase 타입 복잡성 해결을 위한 임시 처리
    const { error } = await supabase.from("employees").update({ auth_id: userId } as any)
      // @ts-ignore - Supabase 타입 복잡성 해결을 위한 임시 처리
      .eq("id", employeeId)

    if (error) throw error

    // 캐시 무효화 - 직원 관리 페이지로 변경
    revalidatePath("/employees")

    return { success: true }
  } catch (error) {
    console.error("Error linking employee to user:", error)
    return { success: false, error: (error as any)?.message || 'Unknown error' }
  }
}

// 관리자 권한 확인
export async function checkAdminAccess() {
  try {
    const supabase = await createServerSupabaseClient()

    // 현재 로그인한 사용자 가져오기
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return { isAdmin: false, message: "로그인이 필요합니다." }
    }

    // 사용자의 직원 정보 확인
    const { data: employee } = await supabase
      .from("employees")
      .select("position")
      // @ts-ignore - Supabase 타입 복잡성 해결을 위한 임시 처리
      .eq("auth_id", session.user.id)
      .single()

    // 원장 또는 부원장인 경우에만 관리자 권한 부여
    // @ts-ignore - employee 타입 복잡성 해결
    const isAdmin = employee?.position === "원장" || employee?.position === "부원장"

    return {
      isAdmin,
      message: isAdmin ? "" : "관리자 권한이 없습니다.",
    }
  } catch (error) {
    console.error("Error checking admin access:", error)
    return { isAdmin: false, message: "권한 확인 중 오류가 발생했습니다." }
  }
}
