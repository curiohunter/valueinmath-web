import { NextRequest, NextResponse } from "next/server"
import { requireAuthForAPI } from "@/lib/auth/get-user"
import { getSavedReportById, deleteSavedReport, updateSavedReport } from "@/services/analytics-service"

// GET: 보고서 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 인증 체크
    const authResult = await requireAuthForAPI()
    
    if ('error' in authResult) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      )
    }

    const reportId = params.id

    // 보고서 조회
    const result = await getSavedReportById(reportId)

    if (!result.success || !result.data) {
      return NextResponse.json(
        { success: false, error: result.error || "보고서를 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      reportContent: result.data.report_content,
      student: result.data.student,
      year: result.data.year,
      month: result.data.month,
      monthlyStats: result.data.monthly_stats,
      createdAt: result.data.created_at
    })

  } catch (error) {
    console.error("GET /api/reports/[id] 오류:", error)
    return NextResponse.json(
      { success: false, error: "보고서 조회 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}

// DELETE: 보고서 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 인증 체크
    const authResult = await requireAuthForAPI()
    
    if ('error' in authResult) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      )
    }

    const reportId = params.id

    // 보고서 삭제
    const result = await deleteSavedReport(reportId)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error("DELETE /api/reports/[id] 오류:", error)
    return NextResponse.json(
      { success: false, error: "보고서 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}

// PUT: 보고서 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 인증 체크
    const authResult = await requireAuthForAPI()
    
    if ('error' in authResult) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      )
    }

    const reportId = params.id
    const body = await request.json()
    const { reportContent } = body

    if (!reportContent) {
      return NextResponse.json(
        { success: false, error: "보고서 내용은 필수입니다." },
        { status: 400 }
      )
    }

    // 보고서 수정
    const result = await updateSavedReport(reportId, reportContent)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error("PUT /api/reports/[id] 오류:", error)
    return NextResponse.json(
      { success: false, error: "보고서 수정 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}