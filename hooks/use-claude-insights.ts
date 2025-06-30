"use client"

import useSWR from "swr"
import { useCallback, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import type { 
  ClaudeInsightWithDetails,
  ClaudeSearchFilters,
  ClaudeInsight
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
    recommendations: (row.recommendations as any) || [],
    data_period: (row.data_period as any) || {},
    confidence_score: row.confidence_score || 0.8,
    tags: row.tags || [],
    metadata: (row.metadata as any) || {},
    status: row.status || 'active',
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
  }
}


// 클라이언트 사이드 fetcher 함수들
async function fetchClaudeInsights(
  page: number,
  pageSize: number,
  filters?: ClaudeSearchFilters
): Promise<{ data: ClaudeInsightWithDetails[]; count: number }> {
  const supabase = getSupabaseBrowserClient()
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
    throw error
  }

  const insights = (data || []).map(mapClaudeInsightRowToInsight)

  return {
    data: insights,
    count: count || 0,
  }
}

async function fetchClaudeInsightById(id: string): Promise<ClaudeInsightWithDetails | null> {
  const supabase = getSupabaseBrowserClient()

  const { data: insight, error: insightError } = await supabase
    .from("claude_insights")
    .select("*")
    .eq("id", id)
    .single()

  if (insightError || !insight) {
    throw insightError || new Error("Insight not found")
  }

  return mapClaudeInsightRowToInsight(insight)
}


async function fetchClaudeDashboardStats() {
  const supabase = getSupabaseBrowserClient()

  // 인사이트 통계만 조회
  const { data: insights, error: insightsError } = await supabase
    .from("claude_insights")
    .select("analysis_type, confidence_score, tags, created_at")
    .eq("status", "active")

  if (insightsError) {
    throw insightsError
  }

  // 집계
  const insightsByType = insights?.reduce((acc, insight) => {
    acc[insight.analysis_type] = (acc[insight.analysis_type] || 0) + 1
    return acc
  }, {} as any)

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
}

async function fetchClaudeTags(): Promise<Array<{ tag: string; count: number }>> {
  const supabase = getSupabaseBrowserClient()

  const { data, error } = await supabase
    .from("claude_insights")
    .select("tags")
    .eq("status", "active")

  if (error) {
    throw error
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
}

// SWR 훅들

/**
 * Claude 인사이트 목록을 페칭하는 훅
 * Realtime 업데이트 지원
 */
export function useClaudeInsights(
  page = 1,
  pageSize = 10,
  filters?: ClaudeSearchFilters
) {
  const { data, error, isLoading, mutate } = useSWR(
    ['claude-insights', page, pageSize, filters],
    () => fetchClaudeInsights(page, pageSize, filters),
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000, // 5초 동안 같은 요청 중복 제거
    }
  )

  // Realtime 구독 설정
  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    
    const channel = supabase
      .channel('claude_insights_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'claude_insights'
        },
        () => {
          // 데이터 변경 시 자동 revalidation
          mutate()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [mutate])

  return {
    insights: data?.data || [],
    totalCount: data?.count || 0,
    isLoading,
    error,
    mutate,
  }
}

/**
 * 특정 Claude 인사이트를 페칭하는 훅 (관련 보고서 포함)
 * Realtime 업데이트 지원
 */
export function useClaudeInsight(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? ['claude-insight', id] : null,
    () => id ? fetchClaudeInsightById(id) : null,
    {
      revalidateOnFocus: false,
    }
  )

  // Realtime 구독 설정
  useEffect(() => {
    if (!id) return

    const supabase = getSupabaseBrowserClient()
    
    const insightChannel = supabase
      .channel('claude_insight_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'claude_insights',
          filter: `id=eq.${id}`
        },
        () => {
          mutate()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(insightChannel)
    }
  }, [id, mutate])

  return {
    insight: data,
    isLoading,
    error,
    mutate,
  }
}


/**
 * Claude 대시보드 통계를 페칭하는 훅
 * Realtime 업데이트 지원
 */
export function useClaudeDashboardStats() {
  const { data, error, isLoading, mutate } = useSWR(
    'claude-dashboard-stats',
    fetchClaudeDashboardStats,
    {
      revalidateOnFocus: false,
      refreshInterval: 30000, // 30초마다 자동 갱신
    }
  )

  // Realtime 구독 설정
  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    
    const insightsChannel = supabase
      .channel('dashboard_insights_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'claude_insights'
        },
        () => {
          mutate()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(insightsChannel)
    }
  }, [mutate])

  return {
    stats: data,
    isLoading,
    error,
    mutate,
  }
}

/**
 * Claude 태그 통계를 페칭하는 훅
 * Realtime 업데이트 지원
 */
export function useClaudeTags() {
  const { data, error, isLoading, mutate } = useSWR(
    'claude-tags',
    fetchClaudeTags,
    {
      revalidateOnFocus: false,
      refreshInterval: 60000, // 1분마다 자동 갱신
    }
  )

  // Realtime 구독 설정
  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    
    const channel = supabase
      .channel('claude_tags_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'claude_insights'
        },
        () => {
          mutate()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [mutate])

  return {
    tags: data || [],
    isLoading,
    error,
    mutate,
  }
}

/**
 * Claude 인사이트 생성을 위한 훅
 */
export function useClaudeInsightMutate() {
  const createInsight = useCallback(async (data: any) => {
    const supabase = getSupabaseBrowserClient()

    const { data: insight, error } = await supabase
      .from("claude_insights")
      .insert(data)
      .select()
      .single()

    if (error) {
      throw error
    }

    return mapClaudeInsightRowToInsight(insight)
  }, [])

  const updateInsight = useCallback(async (id: string, data: any) => {
    const supabase = getSupabaseBrowserClient()

    const { data: insight, error } = await supabase
      .from("claude_insights")
      .update(data)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return mapClaudeInsightRowToInsight(insight)
  }, [])

  const deleteInsight = useCallback(async (id: string) => {
    // 서버 액션 import 뒤에 추가
    const { deleteClaudeInsight } = await import('@/actions/claude-actions')
    
    const result = await deleteClaudeInsight(id)
    
    if (!result.success) {
      throw new Error(result.error || '삭제에 실패했습니다.')
    }

    return true
  }, [])

  return {
    createInsight,
    updateInsight,
    deleteInsight,
  }
}

