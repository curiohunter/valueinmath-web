import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/auth/server"
import { createConsultationRequest } from "@/services/consultation-requests"

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

    // Get request body
    const body = await request.json()
    const { student_id, method, type, content } = body

    // Validate required fields
    if (!student_id || !method || !type || !content) {
      return NextResponse.json(
        { error: "필수 항목을 모두 입력해주세요." },
        { status: 400 }
      )
    }

    // Validate field values
    if (!["대면", "전화"].includes(method)) {
      return NextResponse.json({ error: "올바른 상담 방법을 선택해주세요." }, { status: 400 })
    }

    if (!["학습관련", "운영관련", "기타"].includes(type)) {
      return NextResponse.json({ error: "올바른 상담 타입을 선택해주세요." }, { status: 400 })
    }

    if (content.length > 2000) {
      return NextResponse.json(
        { error: "상담 내용은 2000자 이내로 작성해주세요." },
        { status: 400 }
      )
    }

    // Create consultation request
    const consultationRequest = await createConsultationRequest(
      {
        student_id,
        method,
        type,
        content,
      },
      user.id
    )

    return NextResponse.json(
      {
        success: true,
        data: consultationRequest,
        message: "상담 요청이 등록되었습니다.",
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("Consultation request creation error:", error)
    return NextResponse.json(
      { error: error.message || "상담 요청 등록에 실패했습니다." },
      { status: 500 }
    )
  }
}
