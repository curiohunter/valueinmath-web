"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  TrendingUp,
  DollarSign,
  Target,
  GraduationCap,
  Calendar,
  Eye,
  Star,
  FileText,
  Trash2
} from "lucide-react"
import { CLAUDE_ANALYSIS_TYPES, claudeUtils } from "@/types/claude"
import type { ClaudeInsightWithDetails } from "@/types/claude"

interface InsightCardProps {
  insight: ClaudeInsightWithDetails
  onView: () => void
  onDelete: () => void
}

const getAnalysisIcon = (type: string) => {
  switch (type) {
    case 'trend':
      return <TrendingUp className="h-4 w-4" />
    case 'financial':
      return <DollarSign className="h-4 w-4" />
    case 'marketing':
      return <Target className="h-4 w-4" />
    case 'student_mgmt':
      return <GraduationCap className="h-4 w-4" />
    default:
      return <TrendingUp className="h-4 w-4" />
  }
}

export function InsightCard({ insight, onView, onDelete }: InsightCardProps) {
  const analysisTypeInfo = CLAUDE_ANALYSIS_TYPES[insight.analysis_type]
  const confidenceLabel = claudeUtils.getConfidenceLabel(insight.confidence_score || 0)
  const confidenceColor = claudeUtils.getConfidenceColor(insight.confidence_score || 0)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPreviewText = (content: string, maxLength = 150) => {
    // 마크다운 헤더와 특수문자 제거하여 플레인 텍스트만 추출
    const plainText = content
      .replace(/#{1,6}\s+/g, '') // 헤더 제거
      .replace(/\*\*(.*?)\*\*/g, '$1') // 볼드 제거
      .replace(/\*(.*?)\*/g, '$1') // 이탤릭 제거
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 링크 제거
      .replace(/```[\s\S]*?```/g, '') // 코드블록 제거
      .replace(/`([^`]+)`/g, '$1') // 인라인 코드 제거
      .replace(/\n+/g, ' ') // 줄바꿈을 공백으로
      .trim()
    
    if (plainText.length <= maxLength) return plainText
    return plainText.substring(0, maxLength) + '...'
  }

  return (
    <Card className="group hover:shadow-md transition-all duration-200 border-l-4" 
          style={{ borderLeftColor: analysisTypeInfo.color }}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* 왼쪽: 메인 정보 */}
          <div className="flex-1 space-y-2">
            {/* 제목과 배지 */}
            <div>
              <h3 className="font-medium text-base line-clamp-1 group-hover:text-blue-600 transition-colors mb-2">
                {insight.title}
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-xs px-2 py-1">
                  <span className="mr-1">{analysisTypeInfo.icon}</span>
                  {analysisTypeInfo.name}
                </Badge>
                <span className="text-xs text-gray-500">
                  신뢰도 {Math.round((insight.confidence_score || 0) * 100)}%
                </span>
              </div>
            </div>

            {/* 태그 표시 */}
            {insight.tags && insight.tags.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {insight.tags.slice(0, 3).map((tag, index) => (
                  <Badge
                    key={index}
                    className="text-xs text-white border-none"
                    style={{ 
                      backgroundColor: claudeUtils.getTagColor(tag)
                    }}
                  >
                    {tag}
                  </Badge>
                ))}
                {insight.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{insight.tags.length - 3}개
                  </Badge>
                )}
              </div>
            )}

            {/* 콘텐츠 미리보기 */}
            <p className="text-sm text-gray-600 line-clamp-2">
              {getPreviewText(insight.content, 150)}
            </p>

            {/* 메타 정보 */}
            <div className="flex items-center gap-4 text-xs text-gray-500">
              {insight.recommendations && insight.recommendations.length > 0 && (
                <span className="flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  추천사항 {insight.recommendations.length}개
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {insight.created_at ? new Date(insight.created_at).toLocaleDateString('ko-KR') : 'N/A'}
              </span>
            </div>
          </div>

          {/* 오른쪽: 액션 버튼 */}
          <div className="flex flex-col gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onView}
              className="h-8 px-3 text-xs"
            >
              <Eye className="h-3 w-3 mr-1" />
              상세보기
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onDelete}
              className="h-8 px-3 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              삭제
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}