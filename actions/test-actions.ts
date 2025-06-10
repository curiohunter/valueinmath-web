"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

// 테스트용 함수 - 디버깅 목적
export async function testProfileUpdate(userId: string, employeeName: string) {
  try {
    const supabase = createServerActionClient({ cookies })
    
    console.log('🧪 테스트 시작:', { userId, employeeName })
    
    // 1. 현재 프로필 상태 확인
    const { data: currentProfile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()
    
    console.log('📋 현재 프로필:', currentProfile)
    if (profileError) console.error('❌ 프로필 조회 오류:', profileError)
    
    // 2. 직원 정보 조회
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("*")
      .eq("name", employeeName)
      .single()
    
    console.log('📋 직원 정보:', employee)
    if (employeeError) console.error('❌ 직원 조회 오류:', employeeError)
    
    // 3. 수동 프로필 업데이트 시도
    if (employee) {
      const { data: updateResult, error: updateError } = await supabase
        .from("profiles")
        .update({
          name: employee.name,
          position: employee.position,
          department: employee.department,
          approval_status: "approved",
          updated_at: new Date().toISOString()
        })
        .eq("id", userId)
        .select()
      
      console.log('🔄 업데이트 결과:', updateResult)
      if (updateError) {
        console.error('❌ 업데이트 오류:', updateError)
        return { success: false, error: updateError.message }
      }
      
      return { success: true, data: updateResult }
    }
    
    return { success: false, error: "직원 정보를 찾을 수 없습니다" }
  } catch (error: any) {
    console.error('❌ 테스트 오류:', error)
    return { success: false, error: error.message }
  }
}
