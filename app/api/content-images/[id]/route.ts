import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import type { ContentImage } from "@/types/content-image"

// GET: 단일 이미지 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from("content_images")
      .select(`
        *,
        uploader:employees!uploaded_by(name)
      `)
      .eq("id", id)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { success: false, error: "이미지를 찾을 수 없습니다." },
          { status: 404 }
        )
      }
      throw error
    }

    const image: ContentImage = {
      ...data,
      public_url: supabase.storage
        .from(data.storage_bucket)
        .getPublicUrl(data.storage_path).data.publicUrl,
    }

    return NextResponse.json({
      success: true,
      data: image,
    })
  } catch (error) {
    console.error("이미지 조회 오류:", error)
    return NextResponse.json(
      { success: false, error: "이미지를 불러오는데 실패했습니다." },
      { status: 500 }
    )
  }
}

// PATCH: 이미지 메타데이터 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getSupabaseAdmin()
    const body = await request.json()

    const allowedFields = [
      "category",
      "title",
      "caption",
      "alt_text",
      "tags",
      "taken_at",
      "privacy_consent",
      "student_ids",
    ]

    const updateData: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: "수정할 필드가 없습니다." },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("content_images")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("이미지 수정 오류:", error)
      throw error
    }

    return NextResponse.json({
      success: true,
      data: data as ContentImage,
    })
  } catch (error) {
    console.error("이미지 메타데이터 수정 오류:", error)
    return NextResponse.json(
      { success: false, error: "이미지 정보 수정에 실패했습니다." },
      { status: 500 }
    )
  }
}

// DELETE: 이미지 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getSupabaseAdmin()

    // 먼저 이미지 정보 조회
    const { data: image, error: fetchError } = await supabase
      .from("content_images")
      .select("storage_path, storage_bucket")
      .eq("id", id)
      .single()

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          { success: false, error: "이미지를 찾을 수 없습니다." },
          { status: 404 }
        )
      }
      throw fetchError
    }

    // Storage에서 파일 삭제
    const { error: storageError } = await supabase.storage
      .from(image.storage_bucket)
      .remove([image.storage_path])

    if (storageError) {
      console.error("Storage 삭제 오류:", storageError)
      // Storage 삭제 실패해도 DB 레코드는 삭제 진행
    }

    // DB에서 레코드 삭제
    const { error: deleteError } = await supabase
      .from("content_images")
      .delete()
      .eq("id", id)

    if (deleteError) {
      console.error("이미지 레코드 삭제 오류:", deleteError)
      throw deleteError
    }

    return NextResponse.json({
      success: true,
      message: "이미지가 삭제되었습니다.",
    })
  } catch (error) {
    console.error("이미지 삭제 오류:", error)
    return NextResponse.json(
      { success: false, error: "이미지 삭제에 실패했습니다." },
      { status: 500 }
    )
  }
}
