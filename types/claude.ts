// Claude Desktop 연동 TypeScript 타입 정의
import { Database } from './database'

// 기본 ENUM 타입들 (데이터베이스와 동기화)
export type ClaudeAnalysisType = Database['public']['Enums']['claude_analysis_type']

// 데이터베이스 테이블 Row 타입들
export type ClaudeInsight = Database['public']['Tables']['claude_insights']['Row']

// Insert 타입들
export type ClaudeInsightInsert = Database['public']['Tables']['claude_insights']['Insert']

// Update 타입들
export type ClaudeInsightUpdate = Database['public']['Tables']['claude_insights']['Update']

// Claude 인사이트 추천사항 구조
export interface ClaudeRecommendation {
  category: string
  priority: 'highest' | 'high' | 'medium' | 'low' | 'info'
  action: string
  deadline?: string
  estimated_impact?: string
  required_resources?: string[]
}

// Claude 분석 데이터 기간 구조
export interface ClaudeDataPeriod {
  start_date?: string
  end_date?: string
  description?: string
  scope?: string
  data_sources?: string[]
}

// Claude 메타데이터 구조
export interface ClaudeMetadata {
  data_source?: string
  student_count?: number
  analysis_method?: string
  model_version?: string
  processing_time_ms?: number
  data_quality_score?: number
  [key: string]: unknown
}

// Claude 차트 데이터 구조
export interface ClaudeChartData {
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'heatmap'
  title?: string
  data: Record<string, unknown>
  options?: {
    xlabel?: string
    ylabel?: string
    colors?: string[]
    responsive?: boolean
    [key: string]: unknown
  }
}


// 확장된 인사이트 인터페이스 (조회용)
export interface ClaudeInsightWithDetails extends Omit<ClaudeInsight, 'recommendations' | 'data_period' | 'metadata'> {
  recommendations: ClaudeRecommendation[]
  data_period: ClaudeDataPeriod
  metadata: ClaudeMetadata
}

// Claude 분석 요청 인터페이스
export interface ClaudeAnalysisRequest {
  title: string
  analysis_type: ClaudeAnalysisType
  content: string
  recommendations?: ClaudeRecommendation[]
  data_period?: ClaudeDataPeriod
  confidence_score?: number
  tags?: string[]
  metadata?: ClaudeMetadata
}


// Claude 대시보드 데이터 구조
export interface ClaudeDashboardData {
  insights: {
    total: number
    by_type: Record<ClaudeAnalysisType, number>
    recent: ClaudeInsightWithDetails[]
    trending_tags: Array<{ tag: string; count: number }>
  }
  analytics: {
    avg_confidence_score: number
    most_active_analysis_type: ClaudeAnalysisType
    insights_this_month: number
  }
}

// Claude 검색 필터 인터페이스
export interface ClaudeSearchFilters {
  analysis_type?: ClaudeAnalysisType[]
  status?: ('active' | 'archived')[]
  tags?: string[]
  date_range?: {
    start: string
    end: string
  }
  confidence_range?: {
    min: number
    max: number
  }
  search_query?: string
}

// Claude 검색 결과 인터페이스
export interface ClaudeSearchResult {
  insights: ClaudeInsightWithDetails[]
  total_count: number
  has_more: boolean
  next_page?: number
}

// Claude 통계 인터페이스
export interface ClaudeStatistics {
  period: {
    start_date: string
    end_date: string
  }
  insights: {
    total: number
    by_type: Record<ClaudeAnalysisType, number>
    avg_confidence: number
    top_tags: Array<{ tag: string; count: number }>
  }
  trends: {
    insights_trend: Array<{ date: string; count: number }>
    confidence_trend: Array<{ date: string; avg_confidence: number }>
  }
}

// API 응답 타입들
export interface CreateClaudeInsightResponse {
  insight: ClaudeInsight
  success: boolean
  message?: string
}


export interface ClaudeInsightListResponse {
  insights: ClaudeInsightWithDetails[]
  total: number
  page: number
  per_page: number
  has_next: boolean
}


// 에러 타입들
export class ClaudeError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ClaudeError'
  }
}

export class ClaudeValidationError extends ClaudeError {
  constructor(
    message: string,
    public field: string,
    public value?: unknown
  ) {
    super(message, 'VALIDATION_ERROR', { field, value })
    this.name = 'ClaudeValidationError'
  }
}


// 상수들
export const CLAUDE_ANALYSIS_TYPES: Record<ClaudeAnalysisType, { 
  name: string
  description: string
  color: string
  icon: string
}> = {
  trend: {
    name: '트렌드 분석',
    description: '시간에 따른 패턴과 변화 추이 분석',
    color: '#2563eb', // blue-600
    icon: '📈'
  },
  financial: {
    name: '재무 분석',
    description: '수익성, 비용, 재무 성과 분석',
    color: '#059669', // green-600
    icon: '💰'
  },
  marketing: {
    name: '마케팅 분석',
    description: '학생 모집, 마케팅 효과 분석',
    color: '#dc2626', // red-600
    icon: '🎯'
  },
  student_mgmt: {
    name: '학생 관리 분석',
    description: '학습 성과, 출석률, 학생 관리 분석',
    color: '#7c3aed', // violet-600
    icon: '🎓'
  }
} as const


// Claude 분석 유틸리티 함수들
export const claudeUtils = {
  /**
   * 신뢰도 점수를 텍스트로 변환
   */
  getConfidenceLabel: (score: number): string => {
    if (score >= 0.9) return '매우 높음'
    if (score >= 0.7) return '높음'
    if (score >= 0.5) return '보통'
    if (score >= 0.3) return '낮음'
    return '매우 낮음'
  },

  /**
   * 신뢰도 점수에 따른 색상 반환
   */
  getConfidenceColor: (score: number): string => {
    if (score >= 0.9) return '#059669' // green-600
    if (score >= 0.7) return '#0d9488' // teal-600
    if (score >= 0.5) return '#ca8a04' // yellow-600
    if (score >= 0.3) return '#ea580c' // orange-600
    return '#dc2626' // red-600
  },

  /**
   * 추천사항 우선순위에 따른 색상 반환
   */
  getPriorityColor: (priority: ClaudeRecommendation['priority']): string => {
    switch (priority) {
      case 'highest': return '#991b1b' // red-800
      case 'high': return '#dc2626' // red-600
      case 'medium': return '#ca8a04' // yellow-600
      case 'low': return '#059669' // green-600
      case 'info': return '#2563eb' // blue-600
      default: return '#6b7280' // gray-500
    }
  },

  /**
   * 날짜 범위 포맷팅
   */
  formatDateRange: (datePeriod: ClaudeDataPeriod): string => {
    if (!datePeriod.start_date) return datePeriod.description || '기간 정보 없음'
    
    const start = new Date(datePeriod.start_date).toLocaleDateString('ko-KR')
    const end = datePeriod.end_date 
      ? new Date(datePeriod.end_date).toLocaleDateString('ko-KR')
      : '현재'
    
    return `${start} ~ ${end}`
  },

  /**
   * 태그 색상 생성 (해시 기반)
   */
  getTagColor: (tag: string): string => {
    const colors = [
      '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
      '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
      '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
      '#ec4899', '#f43f5e'
    ]
    
    let hash = 0
    for (let i = 0; i < tag.length; i++) {
      hash = tag.charCodeAt(i) + ((hash << 5) - hash)
    }
    
    return colors[Math.abs(hash) % colors.length]
  }
} as const

// Claude Desktop MCP 연동 관련 타입들
export interface MCPClaudeRequest {
  operation: 'create_insight' | 'query_insights' | 'get_statistics'
  data: ClaudeAnalysisRequest | ClaudeSearchFilters | {}
  context?: {
    user_id?: string
    session_id?: string
    timestamp?: string
  }
}

export interface MCPClaudeResponse {
  success: boolean
  data?: ClaudeInsight | ClaudeSearchResult | ClaudeStatistics
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

// 내보내기용 기본 타입들
export type {
  Database
}