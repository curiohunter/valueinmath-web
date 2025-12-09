import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/auth/server"

// 일괄 공개/비공개 설정
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
    }

    // Get employee info
    const { data: employee } = await supabase
      .from("employees")
      .select("id, status")
      .eq("auth_id", user.id)
      .eq("status", "재직")
      .single()

    if (!employee) {
      return NextResponse.json(
        { error: "재직 중인 직원만 공개 설정을 변경할 수 있습니다." },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { comment_ids, is_public } = body

    if (!Array.isArray(comment_ids) || comment_ids.length === 0) {
      return NextResponse.json(
        { error: "변경할 코멘트를 선택해주세요." },
        { status: 400 }
      )
    }

    if (typeof is_public !== "boolean") {
      return NextResponse.json(
        { error: "공개 여부를 지정해주세요." },
        { status: 400 }
      )
    }

    // 일괄 업데이트 (재직 직원이면 모든 코멘트 변경 가능)
    const { error: updateError } = await supabase
      .from("learning_comments")
      .update({
        is_public,
        updated_at: new Date().toISOString(),
      })
      .in("id", comment_ids)

    if (updateError) {
      console.error("Batch update error:", updateError)
      throw updateError
    }

    return NextResponse.json({
      success: true,
      updated_count: comment_ids.length,
      message: `${comment_ids.length}개 코멘트가 ${is_public ? "공개" : "비공개"}로 변경되었습니다.`,
    })
  } catch (error: any) {
    console.error("Batch visibility update error:", error)
    return NextResponse.json(
      { error: error.message || "공개 설정 변경에 실패했습니다." },
      { status: 500 }
    )
  }
}
