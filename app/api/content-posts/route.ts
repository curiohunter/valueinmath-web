import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import type { ContentPost, ContentPostFilters, ContentPostFormData } from "@/types/content-post"

// GET: 콘텐츠 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)

    const filters: ContentPostFilters = {
      content_type: searchParams.get("content_type") as ContentPostFilters["content_type"],
      status: searchParams.get("status") as ContentPostFilters["status"],
      search: searchParams.get("search") || undefined,
      ai_generated: searchParams.get("ai_generated") === "true" ? true : undefined,
    }

    let query = supabase
      .from("content_posts")
      .select(`
        *,
        creator:employees!created_by(name),
        cover_image:content_images!cover_image_id(id, storage_path, title)
      `)
      .order("created_at", { ascending: false })

    // 필터 적용
    if (filters.content_type) {
      query = query.eq("content_type", filters.content_type)
    }
    if (filters.status) {
      query = query.eq("status", filters.status)
    }
    if (filters.ai_generated !== undefined) {
      query = query.eq("ai_generated", filters.ai_generated)
    }
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,body.ilike.%${filters.search}%,caption.ilike.%${filters.search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error("콘텐츠 조회 오류:", error)
      throw error
    }

    return NextResponse.json({
      success: true,
      data: data as ContentPost[],
    })
  } catch (error) {
    console.error("콘텐츠 목록 조회 오류:", error)
    return NextResponse.json(
      { success: false, error: "콘텐츠 목록을 불러오는데 실패했습니다." },
      { status: 500 }
    )
  }
}

// POST: 콘텐츠 추가
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body: ContentPostFormData & { created_by?: string } = await request.json()

    const {
      content_type,
      status = "draft",
      title,
      body: postBody,
      summary,
      caption,
      hashtags = [],
      ai_generated = false,
      ai_prompt_used,
      generation_source,
      image_ids = [],
      cover_image_id,
      review_ids = [],
      published_at,
      publish_url,
      created_by,
    } = body

    if (!content_type) {
      return NextResponse.json(
        { success: false, error: "콘텐츠 유형은 필수입니다." },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("content_posts")
      .insert({
        content_type,
        status,
        title,
        body: postBody,
        summary,
        caption,
        hashtags,
        ai_generated,
        ai_prompt_used,
        generation_source,
        image_ids,
        cover_image_id: cover_image_id || null,
        review_ids,
        published_at,
        publish_url,
        created_by,
      })
      .select(`
        *,
        creator:employees!created_by(name),
        cover_image:content_images!cover_image_id(id, storage_path, title)
      `)
      .single()

    if (error) {
      console.error("콘텐츠 저장 오류:", error)
      throw error
    }

    return NextResponse.json({
      success: true,
      data: data as ContentPost,
    })
  } catch (error) {
    console.error("콘텐츠 저장 오류:", error)
    return NextResponse.json(
      { success: false, error: "콘텐츠 저장에 실패했습니다." },
      { status: 500 }
    )
  }
}
