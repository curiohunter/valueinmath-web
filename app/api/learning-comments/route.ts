import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/auth/server"

// 코멘트 수정
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
        { error: "재직 중인 직원만 코멘트를 수정할 수 있습니다." },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { id, content } = body

    if (!id || !content) {
      return NextResponse.json(
        { error: "필수 항목을 모두 입력해주세요." },
        { status: 400 }
      )
    }

    if (content.length > 2000) {
      return NextResponse.json(
        { error: "코멘트 내용은 2000자 이내로 작성해주세요." },
        { status: 400 }
      )
    }

    // Check if comment exists and belongs to this teacher
    const { data: existing } = await supabase
      .from("learning_comments")
      .select("id, teacher_id")
      .eq("id", id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: "코멘트를 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    if (existing.teacher_id !== employee.id) {
      return NextResponse.json(
        { error: "본인이 작성한 코멘트만 수정할 수 있습니다." },
        { status: 403 }
      )
    }

    // Update comment
    const { data: comment, error: updateError } = await supabase
      .from("learning_comments")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      console.error("Update error:", updateError)
      throw updateError
    }

    return NextResponse.json({
      success: true,
      data: comment,
      message: "코멘트가 수정되었습니다.",
    })
  } catch (error: any) {
    console.error("Learning comment update error:", error)
    return NextResponse.json(
      { error: error.message || "코멘트 수정에 실패했습니다." },
      { status: 500 }
    )
  }
}

// 코멘트 삭제
export async function DELETE(request: NextRequest) {
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
        { error: "재직 중인 직원만 코멘트를 삭제할 수 있습니다." },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { error: "코멘트 ID가 필요합니다." },
        { status: 400 }
      )
    }

    // Check if comment exists and belongs to this teacher
    const { data: existing } = await supabase
      .from("learning_comments")
      .select("id, teacher_id")
      .eq("id", id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: "코멘트를 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    if (existing.teacher_id !== employee.id) {
      return NextResponse.json(
        { error: "본인이 작성한 코멘트만 삭제할 수 있습니다." },
        { status: 403 }
      )
    }

    // Delete comment (reactions will be cascade deleted)
    const { error: deleteError } = await supabase
      .from("learning_comments")
      .delete()
      .eq("id", id)

    if (deleteError) {
      console.error("Delete error:", deleteError)
      throw deleteError
    }

    return NextResponse.json({
      success: true,
      message: "코멘트가 삭제되었습니다.",
    })
  } catch (error: any) {
    console.error("Learning comment delete error:", error)
    return NextResponse.json(
      { error: error.message || "코멘트 삭제에 실패했습니다." },
      { status: 500 }
    )
  }
}

// 코멘트 작성
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

    // Check for duplicate (same student, same teacher, same year/month)
    // 선생님별로 학생당 월 1개 코멘트만 허용
    const { data: existing } = await supabase
      .from("learning_comments")
      .select("id")
      .eq("student_id", student_id)
      .eq("teacher_id", employee.id)
      .eq("year", year)
      .eq("month", month)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: `이미 ${year}년 ${month}월에 해당 학생의 코멘트를 작성하셨습니다.` },
        { status: 409 }
      )
    }

    // Create learning comment using server client
    const { data: comment, error: insertError } = await supabase
      .from("learning_comments")
      .insert({
        student_id,
        teacher_id: employee.id,
        year,
        month,
        content,
      })
      .select()
      .single()

    if (insertError) {
      console.error("Insert error:", insertError)
      throw insertError
    }

    if (!comment) {
      throw new Error("코멘트 작성에 실패했습니다.")
    }

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
