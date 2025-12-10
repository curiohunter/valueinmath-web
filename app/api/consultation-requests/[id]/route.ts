import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/auth/server"

// PUT - 상담 요청 수정 (대기중 상태 + 본인만)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
    }

    // 권한 체크: 본인 요청인지 + 대기중 상태인지
    const { data: existing, error: fetchError } = await supabase
      .from("consultation_requests")
      .select("requester_id, status")
      .eq("id", id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "상담 요청을 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    if (existing.requester_id !== user.id) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 })
    }

    if (existing.status !== "대기중") {
      return NextResponse.json(
        { error: "대기중 상태에서만 수정 가능합니다." },
        { status: 400 }
      )
    }

    // Get request body
    const body = await request.json()
    const { method, type, content } = body

    // Validate field values
    if (method && !["대면", "전화"].includes(method)) {
      return NextResponse.json(
        { error: "올바른 상담 방법을 선택해주세요." },
        { status: 400 }
      )
    }

    if (type && !["학습관련", "운영관련", "기타"].includes(type)) {
      return NextResponse.json(
        { error: "올바른 상담 타입을 선택해주세요." },
        { status: 400 }
      )
    }

    if (content && content.length > 2000) {
      return NextResponse.json(
        { error: "상담 내용은 2000자 이내로 작성해주세요." },
        { status: 400 }
      )
    }

    // Build update object with only provided fields
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }
    if (method) updateData.method = method
    if (type) updateData.type = type
    if (content) updateData.content = content

    // 수정 실행 + updated_at 갱신
    const { data, error } = await supabase
      .from("consultation_requests")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Update error:", error)
      throw error
    }

    return NextResponse.json({
      success: true,
      data,
      message: "상담 요청이 수정되었습니다.",
    })
  } catch (error: any) {
    console.error("Consultation request update error:", error)
    return NextResponse.json(
      { error: error.message || "상담 요청 수정에 실패했습니다." },
      { status: 500 }
    )
  }
}

// PATCH - 상담 요청 소프트 삭제 (대기중 상태 + 본인만)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
    }

    // 권한 체크: 본인 요청인지 + 대기중 상태인지
    const { data: existing, error: fetchError } = await supabase
      .from("consultation_requests")
      .select("requester_id, status")
      .eq("id", id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "상담 요청을 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    if (existing.requester_id !== user.id) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 })
    }

    if (existing.status !== "대기중") {
      return NextResponse.json(
        { error: "대기중 상태에서만 취소 가능합니다." },
        { status: 400 }
      )
    }

    // 소프트 삭제: status를 '취소'로 변경
    const { data, error } = await supabase
      .from("consultation_requests")
      .update({
        status: "취소",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Cancel error:", error)
      throw error
    }

    return NextResponse.json({
      success: true,
      data,
      message: "상담 요청이 취소되었습니다.",
    })
  } catch (error: any) {
    console.error("Consultation request cancel error:", error)
    return NextResponse.json(
      { error: error.message || "상담 요청 취소에 실패했습니다." },
      { status: 500 }
    )
  }
}
