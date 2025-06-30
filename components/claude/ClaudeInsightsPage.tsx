"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Search, 
  RefreshCw, 
  Calendar,
  TrendingUp,
  Target,
  GraduationCap
} from "lucide-react"
import { toast } from "sonner"
import { 
  useClaudeInsights, 
  useClaudeDashboardStats,
  useClaudeTags,
  useClaudeInsightMutate
} from "@/hooks/use-claude-insights"
import { InsightCard } from "./InsightCard"
import { InsightFilters } from "./InsightFilters"
import { ReportModal } from "./ReportModal"
import { TagsModal } from "./TagsModal"
import { CLAUDE_ANALYSIS_TYPES, claudeUtils } from "@/types/claude"
import type { ClaudeSearchFilters, ClaudeInsightWithDetails } from "@/types/claude"

export function ClaudeInsightsPage() {
  const [page, setPage] = useState(1)
  const [pageSize] = useState(6)
  const [filters, setFilters] = useState<ClaudeSearchFilters>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedInsight, setSelectedInsight] = useState<ClaudeInsightWithDetails | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showTagsModal, setShowTagsModal] = useState(false)

  const { insights, totalCount, isLoading, error, mutate } = useClaudeInsights(page, pageSize, {
    ...filters,
    search_query: searchQuery || undefined
  })
  
  const { stats, isLoading: statsLoading } = useClaudeDashboardStats()
  const { tags } = useClaudeTags()
  const { deleteInsight } = useClaudeInsightMutate()

  const handleFilterChange = (newFilters: ClaudeSearchFilters) => {
    setFilters(newFilters)
    setPage(1)
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setPage(1)
  }

  const handleViewInsight = (insight: ClaudeInsightWithDetails) => {
    setSelectedInsight(insight)
    setShowReportModal(true)
  }

  const handleInsightUpdate = async () => {
    // 목록 데이터 업데이트
    await mutate()
    
    // 현재 선택된 인사이트도 업데이트
    if (selectedInsight) {
      const updatedInsights = await mutate()
      const updatedInsight = updatedInsights?.data?.find(insight => insight.id === selectedInsight.id)
      if (updatedInsight) {
        setSelectedInsight(updatedInsight)
      }
    }
  }

  const handleDeleteInsight = async (insightId: string) => {
    if (!confirm('이 인사이트를 삭제하시겠습니까?')) {
      return
    }
    
    try {
      toast.info('인사이트를 삭제하는 중...')
      const result = await deleteInsight(insightId)
      
      if (result) {
        toast.success('인사이트가 성공적으로 삭제되었습니다.')
        mutate() // 목록 새로고침
      } else {
        toast.error('인사이트 삭제에 실패했습니다.')
      }
    } catch (error: any) {
      console.error('인사이트 삭제 실패:', error)
      toast.error(`삭제 실패: ${error.message || '알 수 없는 오류가 발생했습니다.'}`)
    }
  }

  const handleRefresh = () => {
    mutate()
  }

  const handleTagSelect = (tag: string) => {
    const currentTags = filters.tags || []
    const newTags = currentTags.includes(tag) 
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag]
    
    setFilters(prev => ({
      ...prev,
      tags: newTags.length > 0 ? newTags : undefined
    }))
    setPage(1)
    setShowTagsModal(false)
  }

  const handleShowTagsModal = () => {
    setShowTagsModal(true)
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-6 space-y-6">
        {/* 헤더 섹션 */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Claude 분석 인사이트</h1>
            
          </div>
          
          <div className="flex items-center gap-2">
            <Button onClick={handleRefresh} variant="outline" size="sm" disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
          </div>
        </div>

        {/* 통계 카드 섹션 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">총 인사이트</p>
                    <p className="text-2xl font-bold">{stats.insights.total}</p>
                    <p className="text-xs text-green-600">
                      이번 달 +{stats.insights.this_month}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">평균 신뢰도</p>
                    <p className="text-2xl font-bold">
                      {Math.round((stats.insights.avg_confidence || 0) * 100)}%
                    </p>
                    <p className="text-xs text-gray-500">
                      신뢰도 점수
                    </p>
                  </div>
                  <Target className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow" 
              onClick={handleShowTagsModal}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">활성 태그</p>
                    <p className="text-2xl font-bold">{tags.length}</p>
                    <p className="text-xs text-gray-500">
                      클릭하여 태그 보기
                    </p>
                  </div>
                  <GraduationCap className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 검색 및 필터 섹션 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="인사이트 제목이나 내용으로 검색..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <InsightFilters
                filters={filters}
                onFiltersChange={handleFilterChange}
                availableTags={tags}
              />
            </div>

            {/* 선택된 태그 필터 표시 */}
            {filters.tags && filters.tags.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-gray-600">선택된 태그:</span>
                  {filters.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-xs cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                      onClick={() => handleTagSelect(tag)}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 인사이트 섹션 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">📊 분석 인사이트</h2>
            <Badge variant="secondary">{insights.length}개</Badge>
          </div>
          
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <p className="text-red-800">
                  인사이트 데이터를 불러오는 중 오류가 발생했습니다: {error.message}
                </p>
              </CardContent>
            </Card>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded"></div>
                      <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                      <div className="h-3 bg-gray-200 rounded w-4/6"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : insights.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <TrendingUp className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 text-sm">
                  {searchQuery || Object.keys(filters).length > 0
                    ? "검색 조건에 맞는 인사이트가 없습니다."
                    : "Claude Desktop에서 분석한 인사이트가 여기에 표시됩니다."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {insights.map((insight) => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  onView={() => handleViewInsight(insight)}
                  onDelete={() => handleDeleteInsight(insight.id)}
                />
              ))}
            </div>
          )}
        </div>


        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              이전
            </Button>
            
            <span className="px-4 py-2 text-sm text-gray-600">
              {page} / {totalPages}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              다음
            </Button>
          </div>
        )}
      </div>

      {/* 상세 모달 */}
      {selectedInsight && (
        <ReportModal
          insight={selectedInsight}
          open={showReportModal}
          onOpenChange={setShowReportModal}
          onInsightUpdate={handleInsightUpdate}
        />
      )}

      {/* 태그 모달 */}
      <TagsModal
        open={showTagsModal}
        onOpenChange={setShowTagsModal}
        tags={tags.map(tagItem => tagItem.tag)}
        onTagSelect={handleTagSelect}
        selectedTags={filters.tags || []}
      />
    </div>
  )
}