import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/auth/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  try {
    // Verify current user is authorized (원장 or 부원장)
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: "인증되지 않은 사용자입니다" },
        { status: 401 }
      )
    }

    // Check if user is 원장 or 부원장
    const { data: employee } = await supabase
      .from("employees")
      .select("position")
      .eq("auth_id", user.id)
      .single()

    if (!employee || (employee.position !== "원장" && employee.position !== "부원장")) {
      return NextResponse.json(
        { error: "권한이 없습니다. 원장 또는 부원장만 사용자를 삭제할 수 있습니다." },
        { status: 403 }
      )
    }

    // Get userId from request body
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: "사용자 ID가 필요합니다" },
        { status: 400 }
      )
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Delete user from Supabase Auth
    // This will also trigger CASCADE delete on profiles table due to FK constraint
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error("Error deleting user:", deleteError)
      return NextResponse.json(
        { error: `사용자 삭제 실패: ${deleteError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, message: "사용자가 성공적으로 삭제되었습니다" },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Unexpected error:", error)
    return NextResponse.json(
      { error: `예기치 않은 오류: ${error.message}` },
      { status: 500 }
    )
  }
}
