import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import type { ContentImage, ContentImageFilters } from "@/types/content-image"

// GET: 이미지 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)

    const filters: ContentImageFilters = {
      category: searchParams.get("category") as ContentImageFilters["category"],
      privacy_consent: searchParams.get("privacy_consent") === "true" ? true : undefined,
      search: searchParams.get("search") || undefined,
    }

    const tagsParam = searchParams.get("tags")
    if (tagsParam) {
      filters.tags = tagsParam.split(",")
    }

    let query = supabase
      .from("content_images")
      .select(`
        *,
        uploader:employees!uploaded_by(name)
      `)
      .order("created_at", { ascending: false })

    // 필터 적용
    if (filters.category) {
      query = query.eq("category", filters.category)
    }
    if (filters.privacy_consent !== undefined) {
      query = query.eq("privacy_consent", filters.privacy_consent)
    }
    if (filters.tags && filters.tags.length > 0) {
      query = query.overlaps("tags", filters.tags)
    }
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,caption.ilike.%${filters.search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error("이미지 조회 오류:", error)
      throw error
    }

    // public URL 추가
    const images: ContentImage[] = (data || []).map((img) => ({
      ...img,
      public_url: supabase.storage
        .from(img.storage_bucket)
        .getPublicUrl(img.storage_path).data.publicUrl,
    }))

    return NextResponse.json({
      success: true,
      data: images,
    })
  } catch (error) {
    console.error("이미지 목록 조회 오류:", error)
    return NextResponse.json(
      { success: false, error: "이미지 목록을 불러오는데 실패했습니다." },
      { status: 500 }
    )
  }
}

// POST: 이미지 메타데이터 저장 (업로드 후)
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json()

    const {
      storage_path,
      original_filename,
      file_size,
      mime_type,
      width,
      height,
      category = "daily",
      title,
      caption,
      tags = [],
      taken_at,
      privacy_consent = false,
      uploaded_by,
    } = body

    if (!storage_path) {
      return NextResponse.json(
        { success: false, error: "storage_path가 필요합니다." },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("content_images")
      .insert({
        storage_path,
        storage_bucket: "content-images",
        original_filename,
        file_size,
        mime_type,
        width,
        height,
        category,
        title,
        caption,
        alt_text: title || caption,
        tags,
        taken_at,
        privacy_consent,
        uploaded_by,
      })
      .select()
      .single()

    if (error) {
      console.error("이미지 저장 오류:", error)
      throw error
    }

    return NextResponse.json({
      success: true,
      data: data as ContentImage,
    })
  } catch (error) {
    console.error("이미지 메타데이터 저장 오류:", error)
    return NextResponse.json(
      { success: false, error: "이미지 정보 저장에 실패했습니다." },
      { status: 500 }
    )
  }
}
