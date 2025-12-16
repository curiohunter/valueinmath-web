import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/auth/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    const leadSource = searchParams.get("lead_source") || null
    const startDate = searchParams.get("start_date") || "2024-09-01"

    // 코호트 분석 데이터 조회
    const { data: cohortData, error } = await supabase
      .rpc("get_cohort_funnel_analysis", {
        p_lead_source: leadSource,
        p_start_date: startDate,
      })

    if (error) {
      console.error("Cohort analysis error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 월별로 합산하여 전체 코호트 데이터 생성
    const monthlyAggregated = aggregateByMonth(cohortData || [])

    // 리드소스 목록 추출
    const leadSources = [...new Set((cohortData || []).map((d: any) => d.lead_source))].sort()

    return NextResponse.json({
      data: cohortData,
      aggregated: monthlyAggregated,
      leadSources,
    })
  } catch (error) {
    console.error("Cohort API error:", error)
    return NextResponse.json(
      { error: "코호트 데이터를 불러오는데 실패했습니다." },
      { status: 500 }
    )
  }
}

// 월별 합산 함수
function aggregateByMonth(data: any[]) {
  const monthMap = new Map<string, any>()

  data.forEach((row) => {
    const key = row.cohort_month
    if (!monthMap.has(key)) {
      monthMap.set(key, {
        cohort_month: row.cohort_month,
        cohort_date: row.cohort_date,
        total_students: 0,
        test_month_0: 0,
        test_month_1: 0,
        test_month_2: 0,
        test_month_3: 0,
        test_total: 0,
        enroll_month_0: 0,
        enroll_month_1: 0,
        enroll_month_2: 0,
        enroll_month_3: 0,
        enroll_total: 0,
        is_ongoing: row.is_ongoing,
        _enroll_days_sum: 0,
        _enroll_count: 0,
      })
    }

    const agg = monthMap.get(key)!
    agg.total_students += row.total_students
    agg.test_month_0 += row.test_month_0
    agg.test_month_1 += row.test_month_1
    agg.test_month_2 += row.test_month_2
    agg.test_month_3 += row.test_month_3
    agg.test_total += row.test_total
    agg.enroll_month_0 += row.enroll_month_0
    agg.enroll_month_1 += row.enroll_month_1
    agg.enroll_month_2 += row.enroll_month_2
    agg.enroll_month_3 += row.enroll_month_3
    agg.enroll_total += row.enroll_total

    // 평균 계산용 (일 기준)
    if (row.avg_days_to_enroll !== null && row.enroll_total > 0) {
      agg._enroll_days_sum += parseFloat(row.avg_days_to_enroll) * row.enroll_total
      agg._enroll_count += row.enroll_total
    }
  })

  // 최종 계산
  return Array.from(monthMap.values())
    .map((agg) => ({
      cohort_month: agg.cohort_month,
      cohort_date: agg.cohort_date,
      total_students: agg.total_students,
      test_month_0: agg.test_month_0,
      test_month_1: agg.test_month_1,
      test_month_2: agg.test_month_2,
      test_month_3: agg.test_month_3,
      test_total: agg.test_total,
      enroll_month_0: agg.enroll_month_0,
      enroll_month_1: agg.enroll_month_1,
      enroll_month_2: agg.enroll_month_2,
      enroll_month_3: agg.enroll_month_3,
      enroll_total: agg.enroll_total,
      final_conversion_rate:
        agg.total_students > 0
          ? Math.round((agg.enroll_total / agg.total_students) * 1000) / 10
          : 0,
      avg_days_to_enroll:
        agg._enroll_count > 0
          ? Math.round(agg._enroll_days_sum / agg._enroll_count)
          : null,
      is_ongoing: agg.is_ongoing,
    }))
    .sort((a, b) => b.cohort_month.localeCompare(a.cohort_month))
}
