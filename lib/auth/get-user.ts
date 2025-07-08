import { createServerClient } from "@/lib/auth/server"
import { redirect } from "next/navigation"
import type { User } from "@supabase/supabase-js"

export interface AuthResult {
  user: User
  error?: never
}

export interface AuthError {
  user?: never
  error: string
}

/**
 * 프로덕션 레벨의 안전한 사용자 인증 확인
 * - getSession() 대신 getUser() 사용 (서버 검증)
 * - 일관된 에러 처리
 * - 타입 안전성 보장
 */
export async function getAuthenticatedUser(): Promise<AuthResult | AuthError> {
  try {
    const supabase = await createServerClient()
    
    // getUser()는 서버에서 토큰을 검증하므로 더 안전함
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return { error: error?.message || "인증되지 않은 사용자입니다." }
    }
    
    return { user }
  } catch (error) {
    console.error("Authentication error:", error)
    return { error: "인증 확인 중 오류가 발생했습니다." }
  }
}

/**
 * 페이지 컴포넌트에서 사용하는 인증 확인 (리다이렉트 포함)
 */
export async function requireAuth() {
  const result = await getAuthenticatedUser()
  
  if (result.error) {
    redirect("/login")
  }
  
  return result.user
}

/**
 * 특정 역할이 필요한 페이지용 인증 확인
 */
export async function requireRole(allowedRoles: string[]) {
  const user = await requireAuth()
  const supabase = await createServerClient()
  
  // 직원 정보 확인
  const { data: employee } = await supabase
    .from("employees")
    .select("position")
    // @ts-ignore
    .eq("auth_id", user.id)
    .single()
    
  if (!employee || !employee.position || !allowedRoles.includes(employee.position)) {
    redirect("/dashboard")
  }
  
  return { user, role: employee.position! }
}

/**
 * API 라우트용 인증 확인 (리다이렉트 없이 에러 반환)
 */
export async function requireAuthForAPI() {
  const result = await getAuthenticatedUser()
  
  if (result.error) {
    return {
      error: result.error,
      status: 401
    }
  }
  
  return { user: result.user }
}

/**
 * API 라우트용 역할 기반 인증 확인
 */
export async function requireRoleForAPI(allowedRoles: string[]) {
  const authResult = await requireAuthForAPI()
  
  if ('error' in authResult) {
    return authResult
  }
  
  const supabase = await createServerClient()
  
  // 직원 정보 확인
  const { data: employee } = await supabase
    .from("employees")
    .select("position")
    // @ts-ignore
    .eq("auth_id", authResult.user.id)
    .single()
    
  if (!employee || !employee.position || !allowedRoles.includes(employee.position)) {
    return {
      error: "권한이 없습니다.",
      status: 403
    }
  }
  
  return { user: authResult.user, role: employee.position }
}