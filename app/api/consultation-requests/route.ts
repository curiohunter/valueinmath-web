import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/auth/server"
import { createNotificationsForAllEmployees } from "@/services/notifications"

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

    // Create consultation request using server client
    const { data: consultationRequest, error: insertError } = await supabase
      .from("consultation_requests")
      .insert({
        student_id,
        requester_id: user.id,
        method,
        type,
        content,
        status: '대기중',
      })
      .select(`
        *,
        student:students!consultation_requests_student_id_fkey (
          name
        )
      `)
      .single()

    if (insertError) {
      console.error("Insert error:", insertError)
      throw insertError
    }

    if (!consultationRequest) {
      throw new Error("상담 요청 생성에 실패했습니다.")
    }

    // Create notifications for all employees (non-critical)
    try {
      await createNotificationsForAllEmployees({
        type: 'consultation_request',
        title: '새로운 상담 요청',
        content: `${(consultationRequest.student as any)?.name || '학생'}님의 학부모가 ${type} 상담을 요청했습니다.`,
        related_id: consultationRequest.id,
      })
    } catch (notifError) {
      console.error('알림 생성 실패:', notifError)
      // 알림 실패는 치명적이지 않으므로 계속 진행
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: consultationRequest.id,
          student_id: consultationRequest.student_id,
          requester_id: consultationRequest.requester_id,
          method: consultationRequest.method,
          type: consultationRequest.type,
          content: consultationRequest.content,
          counselor_id: consultationRequest.counselor_id,
          status: consultationRequest.status,
          created_at: consultationRequest.created_at,
          updated_at: consultationRequest.updated_at,
          student_name: (consultationRequest.student as any)?.name || "알 수 없음",
        },
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
