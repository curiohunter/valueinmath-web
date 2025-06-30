"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

// 로그아웃 처리
export async function signOut() {
  const cookieStore = await cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore as any })

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
  const cookieStore = await cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore as any })

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
  const cookieStore = await cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore as any })

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
    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore as any })
    console.log('🔄 linkEmployeeToUser 시작:', { employeeId, userId })

    // 1. 기존 연결 해제: 이전에 이 직원과 연결된 사용자가 있다면 해제
    const { data: currentEmployee } = await supabase
      .from("employees")
      .select("auth_id")
      .eq("id", employeeId)
      .single()

    console.log('📋 현재 직원 정보:', currentEmployee)

    if (currentEmployee?.auth_id) {
      console.log('🔄 기존 연결 해제 중:', currentEmployee.auth_id)
      // 기존 연결된 사용자의 승인 상태를 pending으로 되돌리고 직원 정보 제거
      const { error: profileUpdateError } = await supabase.from("profiles").update({
        approval_status: "pending",
        name: null, // 🔥 이름도 초기화
        position: null,
        department: null,
        updated_at: new Date().toISOString()
      }).eq("id", currentEmployee.auth_id)
      
      if (profileUpdateError) {
        console.error('❌ 기존 프로필 업데이트 오류:', profileUpdateError)
      } else {
        console.log('✅ 기존 프로필 업데이트 성공')
      }

      // pending_registrations 테이블도 pending으로 되돌리기
      const { error: pendingUpdateError } = await supabase.from("pending_registrations").update({
        status: "pending",
        updated_at: new Date().toISOString()
      }).eq("user_id", currentEmployee.auth_id)
      
      if (pendingUpdateError) {
        console.error('❌ 대기 등록 상태 업데이트 오류:', pendingUpdateError)
      } else {
        console.log('✅ 대기 등록 상태 업데이트 성공')
      }
    }

    // 2. 다른 직원이 같은 사용자와 연결되어 있다면 해제
    if (userId) {
      console.log('🔄 중복 연결 해제 중:', userId)
      const { error: duplicateUnlinkError } = await supabase.from("employees").update({ auth_id: null }).eq("auth_id", userId)
      if (duplicateUnlinkError) {
        console.error('❌ 중복 연결 해제 오류:', duplicateUnlinkError)
      } else {
        console.log('✅ 중복 연결 해제 성공')
      }
    }

    // 3. 직원 테이블의 auth_id 업데이트
    console.log('🔄 직원 테이블 업데이트 중...')
    const { error } = await supabase
      .from("employees")
      .update({ auth_id: userId, updated_at: new Date().toISOString() })
      .eq("id", employeeId)
    
    if (error) {
      console.error('❌ 직원 테이블 업데이트 오류:', error)
      throw error
    }
    console.log('✅ 직원 테이블 업데이트 성공')

    // 4. 새로운 계정 연결 시 자동 승인 및 직원 정보 동기화
    if (userId) {
      console.log('🔄 직원 정보 조회 중...')
      const { data: employee, error: employeeError } = await supabase
        .from("employees")
        .select("name, position, department")
        .eq("id", employeeId)
        .single()
      
      if (employeeError) {
        console.error('❌ 직원 정보 조회 오류:', employeeError)
        throw employeeError
      }
      
      console.log('📋 조회된 직원 정보:', employee)
      
      if (employee) {
        console.log('🔄 프로필 업데이트 중...')
        const { error: profileError } = await supabase.from("profiles").update({
          name: employee.name,
          position: employee.position,
          department: employee.department,
          approval_status: "approved", // 🔥 자동 승인
          updated_at: new Date().toISOString()
        }).eq("id", userId)
        
        if (profileError) {
          console.error('❌ 프로필 업데이트 오류:', profileError)
          throw profileError
        }
        console.log('✅ 프로필 업데이트 성공')

        // pending_registrations 테이블도 approved로 업데이트
        const { error: pendingUpdateError } = await supabase.from("pending_registrations").update({
          status: "approved",
          updated_at: new Date().toISOString()
        }).eq("user_id", userId)
        
        if (pendingUpdateError) {
          console.error('❌ 대기 등록 상태 업데이트 오류:', pendingUpdateError)
        } else {
          console.log('✅ 대기 등록 상태 업데이트 성공')
        }
      }
    }

    // 5. 캐시 무효화
    revalidatePath("/employees")
    revalidatePath("/dashboard")

    console.log('🎉 linkEmployeeToUser 완료!')
    return { success: true }
  } catch (error: any) {
    console.error("❌ Error linking employee to user:", error)
    return { success: false, error: error.message }
  }
}

// 사용자 목록 가져오기 (auth.users와 profiles 테이블 조인)
export async function listUsers() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore as any })

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
