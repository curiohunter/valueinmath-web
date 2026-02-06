import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import type { Review, ReviewFormData } from "@/types/review"

// GET: 단일 후기 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from("reviews")
      .select(`
        *,
        student:students!student_id(name, school, grade),
        collector:employees!collected_by(name)
      `)
      .eq("id", id)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { success: false, error: "후기를 찾을 수 없습니다." },
          { status: 404 }
        )
      }
      throw error
    }

    return NextResponse.json({
      success: true,
      data: data as Review,
    })
  } catch (error) {
    console.error("후기 조회 오류:", error)
    return NextResponse.json(
      { success: false, error: "후기를 불러오는데 실패했습니다." },
      { status: 500 }
    )
  }
}

// PATCH: 후기 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getSupabaseAdmin()
    const body: Partial<ReviewFormData> = await request.json()

    const updateData: Record<string, unknown> = {}

    // 수정 가능한 필드만 업데이트
    const allowedFields = [
      "source",
      "reviewer_name",
      "reviewer_type",
      "rating",
      "title",
      "content",
      "student_id",
      "source_url",
      "original_date",
      "is_featured",
      "is_verified",
      "can_use_marketing",
      "highlights",
    ]

    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field as keyof ReviewFormData]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: "수정할 내용이 없습니다." },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("reviews")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        student:students!student_id(name, school, grade),
        collector:employees!collected_by(name)
      `)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { success: false, error: "후기를 찾을 수 없습니다." },
          { status: 404 }
        )
      }
      throw error
    }

    return NextResponse.json({
      success: true,
      data: data as Review,
    })
  } catch (error) {
    console.error("후기 수정 오류:", error)
    return NextResponse.json(
      { success: false, error: "후기 수정에 실패했습니다." },
      { status: 500 }
    )
  }
}

// DELETE: 후기 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getSupabaseAdmin()

    const { error } = await supabase
      .from("reviews")
      .delete()
      .eq("id", id)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: "후기가 삭제되었습니다.",
    })
  } catch (error) {
    console.error("후기 삭제 오류:", error)
    return NextResponse.json(
      { success: false, error: "후기 삭제에 실패했습니다." },
      { status: 500 }
    )
  }
}
