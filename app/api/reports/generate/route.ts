import { NextRequest, NextResponse } from "next/server"
import { requireAuthForAPI } from "@/lib/auth/get-user"
import { generateMonthlyReport, saveMonthlyReport } from "@/services/analytics-service"

export async function POST(request: NextRequest) {
  try {
    // 인증 체크
    const authResult = await requireAuthForAPI()
    
    if ('error' in authResult) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      )
    }

    const body = await request.json()
    const { studentId, year, month } = body

    if (!studentId || !year || !month) {
      return NextResponse.json(
        { success: false, error: "필수 파라미터가 누락되었습니다." },
        { status: 400 }
      )
    }

    // 보고서 생성
    const reportResult = await generateMonthlyReport(studentId, year, month)
    
    if (!reportResult.success || !reportResult.data) {
      return NextResponse.json(
        { success: false, error: reportResult.error || "보고서 생성 실패" },
        { status: 500 }
      )
    }

    // 보고서 저장
    const saveResult = await saveMonthlyReport(
      studentId,
      year,
      month,
      reportResult.data,
      undefined, // teacher_comment는 나중에 추가
      undefined  // monthlyStats는 generateMonthlyReport에서 이미 포함됨
    )

    if (!saveResult.success || !saveResult.data) {
      return NextResponse.json(
        { success: false, error: saveResult.error || "보고서 저장 실패" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      reportId: saveResult.data.id,
      message: "보고서가 성공적으로 생성되었습니다."
    })

  } catch (error) {
    console.error("POST /api/reports/generate 오류:", error)
    return NextResponse.json(
      { success: false, error: "보고서 생성 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}