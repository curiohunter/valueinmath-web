import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/auth/server"
import { createLearningComment } from "@/services/comments"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Check authentication
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
        { error: "재직 중인 직원만 코멘트를 작성할 수 있습니다." },
        { status: 403 }
      )
    }

    // Get request body
    const body = await request.json()
    const { student_id, year, month, content } = body

    // Validate required fields
    if (!student_id || !year || !month || !content) {
      return NextResponse.json(
        { error: "필수 항목을 모두 입력해주세요." },
        { status: 400 }
      )
    }

    // Validate year and month
    if (year < 2020 || year > 2100) {
      return NextResponse.json(
        { error: "올바른 연도를 입력해주세요. (2020-2100)" },
        { status: 400 }
      )
    }

    if (month < 1 || month > 12) {
      return NextResponse.json(
        { error: "올바른 월을 입력해주세요. (1-12)" },
        { status: 400 }
      )
    }

    // Validate content length
    if (content.length > 2000) {
      return NextResponse.json(
        { error: "코멘트 내용은 2000자 이내로 작성해주세요." },
        { status: 400 }
      )
    }

    // Create learning comment
    const comment = await createLearningComment(
      {
        student_id,
        year,
        month,
        content,
      },
      employee.id
    )

    return NextResponse.json(
      {
        success: true,
        data: comment,
        message: "학습 코멘트가 작성되었습니다.",
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("Learning comment creation error:", error)
    return NextResponse.json(
      { error: error.message || "학습 코멘트 작성에 실패했습니다." },
      { status: 500 }
    )
  }
}
