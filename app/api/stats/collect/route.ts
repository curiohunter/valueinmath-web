import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/auth/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Edge Function 호출 (monthly-stats-collector)
    const { data, error } = await supabase.functions.invoke('monthly-stats-collector', {
      body: {}
    })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error('통계 수집 실패:', error)
    return NextResponse.json(
      { error: '통계 수집 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}