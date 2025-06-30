import { NextResponse } from "next/server"
import { generateAllMonthlyReports } from "@/services/analytics-service"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  try {
    // 인증 확인
    const cookieStore = await cookies()
    const supabase = createServerComponentClient({ cookies: () => cookieStore })
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    // 관리자 권한 확인 (필요시)
    // const { data: profile } = await supabase
    //   .from("profiles")
    //   .select("role")
    //   .eq("id", session.user.id)
    //   .single()
    
    // if (profile?.role !== "admin") {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    // }
    
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