import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import type { BrandSettingsFormData, BrandSettings } from "@/types/brand"

// GET: 브랜딩 설정 조회
export async function GET() {
  try {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from("brand_settings")
      .select("*")
      .single()

    if (error && error.code !== "PGRST116") {
      // PGRST116: no rows returned (아직 설정이 없음)
      throw error
    }

    return NextResponse.json({
      success: true,
      data: data as BrandSettings | null,
    })
  } catch (error) {
    console.error("브랜딩 설정 조회 오류:", error)
    return NextResponse.json(
      { success: false, error: "브랜딩 설정을 불러오는데 실패했습니다." },
      { status: 500 }
    )
  }
}

// POST: 브랜딩 설정 생성 또는 업데이트 (UPSERT)
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body: BrandSettingsFormData = await request.json()

    // 기존 설정 확인
    const { data: existing } = await supabase
      .from("brand_settings")
      .select("id")
      .single()

    let result

    if (existing) {
      // 업데이트
      result = await supabase
        .from("brand_settings")
        .update({
          ...body,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single()
    } else {
      // 새로 생성
      result = await supabase
        .from("brand_settings")
        .insert({
          academy_name: body.academy_name || "밸류인수학학원",
          ...body,
        })
        .select()
        .single()
    }

    if (result.error) {
      throw result.error
    }

    return NextResponse.json({
      success: true,
      data: result.data as BrandSettings,
    })
  } catch (error) {
    console.error("브랜딩 설정 저장 오류:", error)
    return NextResponse.json(
      { success: false, error: "브랜딩 설정을 저장하는데 실패했습니다." },
      { status: 500 }
    )
  }
}
