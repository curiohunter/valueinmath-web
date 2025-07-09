"use server"

import { createServerClient } from "@/lib/auth/server"
import { revalidatePath } from "next/cache"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

// 로그아웃 처리
export async function signOut() {
  const supabase = await createServerClient()

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
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { user: null }
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  return {
    user: {
      ...user,
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
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "인증되지 않은 사용자입니다." }
  }

  const { error } = await supabase.from("profiles").update(profileData).eq("id", user.id)

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
    const supabase = await createServerClient(); // ✅ 이렇게 변경
    // 1. 기존 연결 해제: 이전에 이 직원과 연결된 사용자가 있다면 해제
    const { data: currentEmployee } = await supabase
      .from("employees")
      .select("auth_id")
      .eq("id", employeeId)
      .single()


    if (currentEmployee?.auth_id) {
      // 기존 연결된 사용자의 승인 상태를 pending으로 되돌리고 직원 정보 제거
      const { error: profileUpdateError } = await supabase.from("profiles").update({
        approval_status: "pending",
        name: null, // 🔥 이름도 초기화
        position: null,
        department: null,
        updated_at: new Date().toISOString()
      }).eq("id", currentEmployee.auth_id)
      
      if (profileUpdateError) {
      } else {
      }

      // pending_registrations 테이블도 pending으로 되돌리기
      const { error: pendingUpdateError } = await supabase.from("pending_registrations").update({
        status: "pending",
        updated_at: new Date().toISOString()
      }).eq("user_id", currentEmployee.auth_id)
      
      if (pendingUpdateError) {
      } else {
      }
    }

    // 2. 다른 직원이 같은 사용자와 연결되어 있다면 해제
    if (userId) {
      const { error: duplicateUnlinkError } = await supabase.from("employees").update({ auth_id: null }).eq("auth_id", userId)
      if (duplicateUnlinkError) {
      } else {
      }
    }

    // 3. 직원 테이블의 auth_id 업데이트
    const { error } = await supabase
      .from("employees")
      .update({ auth_id: userId, updated_at: new Date().toISOString() })
      .eq("id", employeeId)
    
    if (error) {
      throw error
    }

    // 4. 새로운 계정 연결 시 자동 승인 및 직원 정보 동기화
    if (userId) {
      const { data: employee, error: employeeError } = await supabase
        .from("employees")
        .select("name, position, department")
        .eq("id", employeeId)
        .single()
      
      if (employeeError) {
        throw employeeError
      }
      
      
      if (employee) {
        const { error: profileError } = await supabase.from("profiles").update({
          name: employee.name,
          position: employee.position,
          department: employee.department,
          approval_status: "approved", // 🔥 자동 승인
          updated_at: new Date().toISOString()
        }).eq("id", userId)
        
        if (profileError) {
          throw profileError
        }

        // pending_registrations 테이블도 approved로 업데이트
        const { error: pendingUpdateError } = await supabase.from("pending_registrations").update({
          status: "approved",
          updated_at: new Date().toISOString()
        }).eq("user_id", userId)
        
        if (pendingUpdateError) {
        } else {
        }
      }
    }

    // 5. 캐시 무효화
    revalidatePath("/employees")
    revalidatePath("/dashboard")

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// 사용자 목록 가져오기 (auth.users와 profiles 테이블 조인)
// actions/auth-actions.ts 파일의 listUsers 함수

export async function listUsers() {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    const {
      data: { users },
      error: userError,
    } = await supabaseAdmin.auth.admin.listUsers();

    if (userError) {
      throw userError;
    }

    // ✨ 1. { data, error } 형태로 결과를 받고, 변수명을 employees로 지정합니다.
    const { data: employees, error: employeeError } = await supabaseAdmin
      .from("employees")
      .select("auth_id");

    // ✨ 2. 직원 목록 조회에 대한 오류 처리를 추가합니다.
    if (employeeError) {
      throw employeeError;
    }

    const linkedAuthIds =
      employees
        ?.map((e) => e.auth_id)
        .filter((id): id is string => id !== null && id !== undefined) || [];

    return {
      users: users.map((user) => ({
        id: user.id,
        name: user.user_metadata?.name || "이름 없음",
        email: user.email || "",
        isLinked: linkedAuthIds.includes(user.id),
      })),
      error: null,
    };
  } catch (error: any) {
    console.error("Server Action Error in listUsers:", error.message);
    return { users: [], error: { message: "사용자 목록을 가져오는 데 실패했습니다." } };
  }
}

// 회원 탈퇴(계정 삭제)
export async function withdrawUser() {
  const supabase = await createServerClient()
  // 1. 현재 로그인 유저 정보
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    return { success: false, error: "로그인 정보가 없습니다." }
  }
  const userId = user.id

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
