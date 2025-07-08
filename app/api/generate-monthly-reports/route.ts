import { NextResponse } from "next/server"
import { generateAllMonthlyReports } from "@/services/analytics-service"
import { requireAuthForAPI } from "@/lib/auth/get-user"

export async function POST(request: Request) {
  try {
    // 인증 확인
    const authResult = await requireAuthForAPI()
    
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }
    
    const { year, month } = await request.json()
    
    if (!year || !month) {
      return NextResponse.json({ error: "Year and month are required" }, { status: 400 })
    }
    
    // 전체 보고서 생성
    const result = await generateAllMonthlyReports(year, month)
    
    if (result.success) {
      return NextResponse.json({
        message: `${result.data?.total}명 중 ${result.data?.success}명의 보고서가 생성되었습니다.`,
        ...result.data
      })
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
    
  } catch (error) {
    console.error("API 오류:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// 수동으로 호출하거나 cron job으로 매월 초에 실행
// 예시: 매월 1일에 전월 보고서 생성
// curl -X POST http://localhost:3000/api/generate-monthly-reports \
//   -H "Content-Type: application/json" \
//   -d '{"year":2025,"month":5}'