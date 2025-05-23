"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

// 로그아웃 처리
export async function signOut() {
  const supabase = createServerActionClient({ cookies })

  const { error } = await supabase.auth.signOut()

  if (error) {
    return { success: false, error: error.message }
  }

  // 캐시 무효화
  revalidatePath("/", "layout")

  return { success: true }
}

// 사용자 정보 가져오기
export async function getCurrentUser() {
  const supabase = createServerActionClient({ cookies })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return { user: null }
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single()

  return {
    user: {
      ...session.user,
      profile,
    },
  }
}

// 사용자 프로필 업데이트
export async function updateUserProfile(profileData: {
  name?: string
  avatar_url?: string
  position?: string
  department?: string
}) {
  const supabase = createServerActionClient({ cookies })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return { success: false, error: "인증되지 않은 사용자입니다." }
  }

  const { error } = await supabase.from("profiles").update(profileData).eq("id", session.user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  // 캐시 무효화
  revalidatePath("/profile")

  return { success: true }
}

// 직원과 사용자 계정 연결
export async function linkEmployeeToUser(employeeId: string, userId: string | null) {
  try {
    const supabase = createServerActionClient({ cookies })

    // 오직 auth_id만 업데이트
    const { error } = await supabase.from("employees").update({ auth_id: userId }).eq("id", employeeId)
    if (error) throw error

    // 계정 연결 시 employees 정보로 profiles 덮어쓰기
    if (userId) {
      // 직원 정보 조회
      const { data: employee } = await supabase.from("employees").select("name, position, department").eq("id", employeeId).single()
      if (employee) {
        await supabase.from("profiles").update({
          name: employee.name,
          position: employee.position,
          department: employee.department,
        }).eq("id", userId)
      }
    }

    // 캐시 무효화
    revalidatePath("/employees")

    return { success: true }
  } catch (error: any) {
    console.error("Error linking employee to user:", error)
    return { success: false, error: error.message }
  }
}

// 사용자 목록 가져오기 (auth.users와 profiles 테이블 조인)
export async function listUsers() {
  try {
    const supabase = createServerActionClient({ cookies })

    // 전체 유저 목록 가져오기 (관리자 권한 필요)
    const { data: { users }, error } = await supabase.auth.admin.listUsers()

    if (error) {
      return { users: [], error: error.message }
    }

    // 직원 테이블에서 이미 연결된 auth_id 목록 가져오기
    const { data: employees } = await supabase.from("employees").select("auth_id")
    const linkedAuthIds = employees?.map(e => e.auth_id).filter(Boolean) || []

    // 전체 유저 반환 (연결된/연결되지 않은 계정 모두)
    return {
      users: users.map(user => ({
        id: user.id,
        name: user.user_metadata?.name || "이름 없음",
        email: user.email,
        isLinked: linkedAuthIds.includes(user.id),
      })),
      error: null,
    }
  } catch (error: any) {
    console.error("Error listing users:", error)
    return { users: [], error: error.message }
  }
}

// 회원 탈퇴(계정 삭제)
export async function withdrawUser() {
  const supabase = createServerActionClient({ cookies })
  // 1. 현재 로그인 유저 정보
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()
  if (sessionError || !session) {
    return { success: false, error: "로그인 정보가 없습니다." }
  }
  const userId = session.user.id

  // 2. Supabase Admin Client로 인증 계정 삭제
  const admin = getSupabaseAdmin()
  const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId)
  if (deleteUserError) {
    return { success: false, error: deleteUserError.message }
  }

  // 3. profiles row 삭제
  const { error: deleteProfileError } = await admin.from("profiles").delete().eq("id", userId)
  if (deleteProfileError) {
    return { success: false, error: deleteProfileError.message }
  }

  // 4. 로그아웃(세션 쿠키 삭제)
  await supabase.auth.signOut()

  return { success: true }
}
