import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import type { Review, ReviewFilters, ReviewFormData } from "@/types/review"

// GET: 후기 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)

    const filters: ReviewFilters = {
      source: searchParams.get("source") as ReviewFilters["source"],
      rating: searchParams.get("rating") ? parseInt(searchParams.get("rating")!) : undefined,
      is_featured: searchParams.get("is_featured") === "true" ? true : undefined,
      can_use_marketing: searchParams.get("can_use_marketing") === "true" ? true : undefined,
      search: searchParams.get("search") || undefined,
    }

    let query = supabase
      .from("reviews")
      .select(`
        *,
        student:students!student_id(name, school, grade),
        collector:employees!collected_by(name)
      `)
      .order("created_at", { ascending: false })

    // 필터 적용
    if (filters.source) {
      query = query.eq("source", filters.source)
    }
    if (filters.rating) {
      query = query.eq("rating", filters.rating)
    }
    if (filters.is_featured !== undefined) {
      query = query.eq("is_featured", filters.is_featured)
    }
    if (filters.can_use_marketing !== undefined) {
      query = query.eq("can_use_marketing", filters.can_use_marketing)
    }
    if (filters.search) {
      query = query.or(`content.ilike.%${filters.search}%,title.ilike.%${filters.search}%,reviewer_name.ilike.%${filters.search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error("후기 조회 오류:", error)
      throw error
    }

    return NextResponse.json({
      success: true,
      data: data as Review[],
    })
  } catch (error) {
    console.error("후기 목록 조회 오류:", error)
    return NextResponse.json(
      { success: false, error: "후기 목록을 불러오는데 실패했습니다." },
      { status: 500 }
    )
  }
}

// POST: 후기 추가
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body: ReviewFormData & { collected_by?: string } = await request.json()

    const {
      source,
      reviewer_name,
      reviewer_type,
      rating,
      title,
      content,
      student_id,
      source_url,
      original_date,
      is_featured = false,
      is_verified = false,
      can_use_marketing = false,
      highlights = {},
      collected_by,
    } = body

    if (!source || !content) {
      return NextResponse.json(
        { success: false, error: "출처와 후기 내용은 필수입니다." },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("reviews")
      .insert({
        source,
        reviewer_name,
        reviewer_type,
        rating,
        title,
        content,
        student_id: student_id || null,
        source_url,
        original_date,
        is_featured,
        is_verified,
        can_use_marketing,
        highlights,
        collected_by,
      })
      .select(`
        *,
        student:students!student_id(name, school, grade),
        collector:employees!collected_by(name)
      `)
      .single()

    if (error) {
      console.error("후기 저장 오류:", error)
      throw error
    }

    return NextResponse.json({
      success: true,
      data: data as Review,
    })
  } catch (error) {
    console.error("후기 저장 오류:", error)
    return NextResponse.json(
      { success: false, error: "후기 저장에 실패했습니다." },
      { status: 500 }
    )
  }
}
