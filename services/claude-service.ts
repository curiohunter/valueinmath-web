"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { 
  ClaudeInsight, 
  ClaudeInsightInsert,
  ClaudeInsightUpdate,
  ClaudeInsightWithDetails,
  ClaudeSearchFilters,
  ClaudeAnalysisType,
  ClaudeRecommendation,
  ClaudeDataPeriod,
  ClaudeMetadata
} from "@/types/claude"
import type { Database } from "@/types/database"

type ClaudeInsightRow = Database["public"]["Tables"]["claude_insights"]["Row"]

// Claude 인사이트 데이터 변환 함수 (DB 타입 -> 앱 타입)
function mapClaudeInsightRowToInsight(row: ClaudeInsightRow): ClaudeInsightWithDetails {
  return {
    id: row.id,
    title: row.title,
    analysis_type: row.analysis_type,
    content: row.content,
    recommendations: (row.recommendations as ClaudeRecommendation[]) || [],
    data_period: (row.data_period as ClaudeDataPeriod) || {},
    confidence_score: row.confidence_score || 0.8,
    tags: row.tags || [],
    metadata: (row.metadata as ClaudeMetadata) || {},
    status: row.status || 'active',
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
  }
}


// Claude 인사이트 목록 조회
export async function getClaudeInsights(
  page = 1,
  pageSize = 10,
  filters?: ClaudeSearchFilters
): Promise<{ data: ClaudeInsightWithDetails[]; count: number }> {
  try {
    const supabase = await createServerSupabaseClient()
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from("claude_insights")
      .select("*", { count: "exact" })

    // 분석 타입 필터
    if (filters?.analysis_type && filters.analysis_type.length > 0) {
      query = query.in("analysis_type", filters.analysis_type)
    }

    // 상태 필터
    if (filters?.status && filters.status.length > 0) {
      query = query.in("status", filters.status)
    }

    // 태그 필터
    if (filters?.tags && filters.tags.length > 0) {
      query = query.contains("tags", filters.tags)
    }

    // 날짜 범위 필터
    if (filters?.date_range) {
      if (filters.date_range.start) {
        query = query.gte("created_at", filters.date_range.start)
      }
      if (filters.date_range.end) {
        query = query.lte("created_at", filters.date_range.end)
      }
    }

    // 신뢰도 범위 필터
    if (filters?.confidence_range) {
      if (filters.confidence_range.min !== undefined) {
        query = query.gte("confidence_score", filters.confidence_range.min)
      }
      if (filters.confidence_range.max !== undefined) {
        query = query.lte("confidence_score", filters.confidence_range.max)
      }
    }

    // 검색어 필터
    if (filters?.search_query) {
      query = query.or(
        `title.ilike.%${filters.search_query}%,content.ilike.%${filters.search_query}%`
      )
    }

    // 정렬 및 페이지네이션
    query = query
      .order("created_at", { ascending: false })
      .range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error("Error fetching Claude insights:", error)
      throw error
    }

    const insights = (data || []).map(mapClaudeInsightRowToInsight)

    return {
      data: insights,
      count: count || 0,
    }
  } catch (error) {
    console.error("Error in getClaudeInsights:", error)
    return { data: [], count: 0 }
  }
}

// 특정 Claude 인사이트 조회
export async function getClaudeInsightById(
  id: string
): Promise<ClaudeInsightWithDetails | null> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: insight, error: insightError } = await supabase
      .from("claude_insights")
      .select("*")
      .eq("id", id)
      .single()

    if (insightError || !insight) {
      console.error("Error fetching Claude insight:", insightError)
      return null
    }

    return mapClaudeInsightRowToInsight(insight)
  } catch (error) {
    console.error("Error in getClaudeInsightById:", error)
    return null
  }
}


// Claude 인사이트 생성
export async function createClaudeInsight(
  data: ClaudeInsightInsert
): Promise<ClaudeInsightWithDetails | null> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: insight, error } = await supabase
      .from("claude_insights")
      .insert(data)
      .select()
      .single()

    if (error) {
      console.error("Error creating Claude insight:", error)
      throw error
    }

    return mapClaudeInsightRowToInsight(insight)
  } catch (error) {
    console.error("Error in createClaudeInsight:", error)
    return null
  }
}

// Claude 인사이트 업데이트
export async function updateClaudeInsight(
  id: string,
  data: ClaudeInsightUpdate
): Promise<ClaudeInsightWithDetails | null> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: insight, error } = await supabase
      .from("claude_insights")
      .update(data)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating Claude insight:", error)
      throw error
    }

    return mapClaudeInsightRowToInsight(insight)
  } catch (error) {
    console.error("Error in updateClaudeInsight:", error)
    return null
  }
}

// Claude 인사이트 삭제
export async function deleteClaudeInsight(id: string): Promise<boolean> {
  try {
    const supabase = await createServerSupabaseClient()

    const { error } = await supabase
      .from("claude_insights")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting Claude insight:", error)
      throw error
    }

    return true
  } catch (error) {
    console.error("Error in deleteClaudeInsight:", error)
    return false
  }
}

// Claude 인사이트 상태 업데이트 (활성/보관)
export async function updateClaudeInsightStatus(
  id: string,
  status: 'active' | 'archived'
): Promise<boolean> {
  try {
    const supabase = await createServerSupabaseClient()

    const { error } = await supabase
      .from("claude_insights")
      .update({ status })
      .eq("id", id)

    if (error) {
      console.error("Error updating Claude insight status:", error)
      throw error
    }

    return true
  } catch (error) {
    console.error("Error in updateClaudeInsightStatus:", error)
    return false
  }
}




// Claude 태그 통계 조회
export async function getClaudeTags(): Promise<Array<{ tag: string; count: number }>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from("claude_insights")
      .select("tags")
      .eq("status", "active")

    if (error) {
      console.error("Error fetching Claude tags:", error)
      return []
    }

    // 태그 집계
    const tagCounts = new Map<string, number>()
    
    data?.forEach(row => {
      row.tags?.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
      })
    })

    // 정렬 및 변환
    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
  } catch (error) {
    console.error("Error in getClaudeTags:", error)
    return []
  }
}

// Claude 대시보드 통계 조회
export async function getClaudeDashboardStats() {
  try {
    const supabase = await createServerSupabaseClient()

    // 인사이트 통계만 조회
    const { data: insights, error: insightsError } = await supabase
      .from("claude_insights")
      .select("analysis_type, confidence_score, tags, created_at")
      .eq("status", "active")

    if (insightsError) {
      console.error("Error fetching insights stats:", insightsError)
      return null
    }

    // 집계
    const insightsByType = insights?.reduce((acc, insight) => {
      acc[insight.analysis_type] = (acc[insight.analysis_type] || 0) + 1
      return acc
    }, {} as Record<ClaudeAnalysisType, number>)

    const avgConfidence = insights?.reduce((sum, insight) => 
      sum + (insight.confidence_score || 0), 0) / (insights?.length || 1)

    // 이번 달 통계
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    
    const insightsThisMonth = insights?.filter(i => 
      new Date(i.created_at || '').toISOString() >= startOfMonth
    ).length || 0

    return {
      insights: {
        total: insights?.length || 0,
        by_type: insightsByType || {},
        avg_confidence: avgConfidence,
        this_month: insightsThisMonth
      }
    }
  } catch (error) {
    console.error("Error in getClaudeDashboardStats:", error)
    return null
  }
}