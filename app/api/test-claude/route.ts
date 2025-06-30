import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    
    console.log('🔍 claude_insights 테이블 조회 중...')
    const { data: insights, error: insightsError } = await supabase
      .from("claude_insights")
      .select("*")
      .limit(5)
    
    return NextResponse.json({
      insights: {
        data: insights,
        error: insightsError,
        count: insights?.length || 0
      }
    })
    
  } catch (error) {
    console.error('❌ API 오류:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}