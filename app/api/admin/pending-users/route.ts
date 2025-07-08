import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/auth/server"
import { requireRoleForAPI } from "@/lib/auth/get-user"

export async function GET() {
  try {
    // 1. 관리자 권한 확인 (원장, 부원장만 허용)
    const authResult = await requireRoleForAPI(["원장", "부원장"])
    
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const supabase = await createServerClient()

    // 3. pending 사용자 조회 (서버 사이드 RLS 적용)
    const { data: pendingUsers, error } = await supabase
      .from("profiles")
      .select("id, name, email, approval_status, created_at")
      .eq("approval_status", "pending")
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      pendingUsers: pendingUsers || [],
      count: pendingUsers?.length || 0 
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
