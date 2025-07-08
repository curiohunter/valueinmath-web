import { NextRequest, NextResponse } from "next/server"
import { requireAuthForAPI } from "@/lib/auth/get-user"
import { getStudentReportsStatus } from "@/services/analytics-service"

export async function GET(request: NextRequest) {
  try {
    // 인증 체크
    const authResult = await requireAuthForAPI()
    
    if ('error' in authResult) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      )
    }

    // URL 파라미터 파싱
    const searchParams = request.nextUrl.searchParams
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString())
    const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString())
    
    // 필터 파라미터
    const classIds = searchParams.get("classIds")?.split(",").filter(Boolean)
    const searchTerm = searchParams.get("search") || ""
    const gradeParam = searchParams.get("grade")
    const grade = gradeParam === "all" ? "all" : gradeParam ? parseInt(gradeParam) : undefined

    // 서비스 함수 호출
    const result = await getStudentReportsStatus(year, month, {
      classIds,
      searchTerm,
      grade: grade || "all"
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      totalCount: result.data?.length || 0
    })

  } catch (error) {
    console.error("GET /api/reports/status 오류:", error)
    return NextResponse.json(
      { success: false, error: "보고서 상태 조회 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}