import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import type { ContentPost, ContentPostFormData } from "@/types/content-post"

// GET: 단일 콘텐츠 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from("content_posts")
      .select(`
        *,
        creator:employees!created_by(name),
        cover_image:content_images!cover_image_id(id, storage_path, title)
      `)
      .eq("id", id)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { success: false, error: "콘텐츠를 찾을 수 없습니다." },
          { status: 404 }
        )
      }
      throw error
    }

    return NextResponse.json({
      success: true,
      data: data as ContentPost,
    })
  } catch (error) {
    console.error("콘텐츠 조회 오류:", error)
    return NextResponse.json(
      { success: false, error: "콘텐츠를 불러오는데 실패했습니다." },
      { status: 500 }
    )
  }
}

// PATCH: 콘텐츠 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getSupabaseAdmin()
    const body: Partial<ContentPostFormData> = await request.json()

    const updateData: Record<string, unknown> = {}

    // 수정 가능한 필드만 업데이트
    const allowedFields = [
      "content_type",
      "status",
      "title",
      "body",
      "summary",
      "caption",
      "hashtags",
      "ai_generated",
      "ai_prompt_used",
      "generation_source",
      "image_ids",
      "cover_image_id",
      "review_ids",
      "published_at",
      "publish_url",
      "view_count",
      "like_count",
      "comment_count",
    ]

    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field as keyof ContentPostFormData]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: "수정할 내용이 없습니다." },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("content_posts")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        creator:employees!created_by(name),
        cover_image:content_images!cover_image_id(id, storage_path, title)
      `)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { success: false, error: "콘텐츠를 찾을 수 없습니다." },
          { status: 404 }
        )
      }
      throw error
    }

    return NextResponse.json({
      success: true,
      data: data as ContentPost,
    })
  } catch (error) {
    console.error("콘텐츠 수정 오류:", error)
    return NextResponse.json(
      { success: false, error: "콘텐츠 수정에 실패했습니다." },
      { status: 500 }
    )
  }
}

// DELETE: 콘텐츠 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getSupabaseAdmin()

    const { error } = await supabase
      .from("content_posts")
      .delete()
      .eq("id", id)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: "콘텐츠가 삭제되었습니다.",
    })
  } catch (error) {
    console.error("콘텐츠 삭제 오류:", error)
    return NextResponse.json(
      { success: false, error: "콘텐츠 삭제에 실패했습니다." },
      { status: 500 }
    )
  }
}
