import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/auth/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    const cohortMonth = searchParams.get("cohort_month")
    const leadSource = searchParams.get("lead_source") || null

    if (!cohortMonth) {
      return NextResponse.json(
        { error: "cohort_month 파라미터가 필요합니다." },
        { status: 400 }
      )
    }

    // 코호트별 미등록 학생의 학년 분포 조회
    const { data: gradeBreakdown, error } = await supabase
      .rpc("get_cohort_non_enrolled_details", {
        p_cohort_month: cohortMonth,
        p_lead_source: leadSource,
      })

    if (error) {
      console.error("Cohort details error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      cohortMonth,
      gradeBreakdown: gradeBreakdown || [],
    })
  } catch (error) {
    console.error("Cohort details API error:", error)
    return NextResponse.json(
      { error: "코호트 상세 데이터를 불러오는데 실패했습니다." },
      { status: 500 }
    )
  }
}
