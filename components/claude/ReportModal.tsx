"use client"

import { useState, useRef } from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import ReactMarkdown from 'react-markdown'
import { 
  Calendar,
  Star,
  Download,
  Printer,
  AlertTriangle,
  CheckCircle,
  Clock,
  Info,
  CalendarPlus,
  Edit3,
  Trash2,
  Save,
  X,
  Target
} from "lucide-react"
import { CLAUDE_ANALYSIS_TYPES, claudeUtils } from "@/types/claude"
import type { ClaudeInsightWithDetails, ClaudeRecommendation } from "@/types/claude"
import { toast } from "sonner"

interface ReportModalProps {
  insight: ClaudeInsightWithDetails
  open: boolean
  onOpenChange: (open: boolean) => void
  onInsightUpdate?: () => void
}

const getPriorityIcon = (priority: ClaudeRecommendation['priority']) => {
  switch (priority) {
    case 'highest':
      return <AlertTriangle className="h-4 w-4 text-red-800" />
    case 'high':
      return <AlertTriangle className="h-4 w-4 text-red-500" />
    case 'medium':
      return <Clock className="h-4 w-4 text-yellow-500" />
    case 'low':
      return <CheckCircle className="h-4 w-4 text-green-500" />
    case 'info':
      return <Info className="h-4 w-4 text-blue-500" />
    default:
      return <Info className="h-4 w-4 text-gray-500" />
  }
}

const getPriorityLabel = (priority: ClaudeRecommendation['priority']) => {
  switch (priority) {
    case 'highest': return '최우선'
    case 'high': return '높음'
    case 'medium': return '보통'
    case 'low': return '낮음'
    case 'info': return '정보'
    default: return '정보'
  }
}

export function ReportModal({ insight, open, onOpenChange, onInsightUpdate }: ReportModalProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const printRef = useRef<HTMLDivElement>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingRecommendation, setEditingRecommendation] = useState<ClaudeRecommendation | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  
  const analysisTypeInfo = CLAUDE_ANALYSIS_TYPES[insight.analysis_type]
  const confidenceLabel = claudeUtils.getConfidenceLabel(insight.confidence_score || 0)
  const confidenceColor = claudeUtils.getConfidenceColor(insight.confidence_score || 0)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDateRange = () => {
    if (!insight.data_period.start_date) {
      return insight.data_period.description || '기간 정보 없음'
    }
    return claudeUtils.formatDateRange(insight.data_period)
  }

  const sortedRecommendations = [...(insight.recommendations || [])].sort((a, b) => {
    const priorityOrder = { highest: 0, high: 1, medium: 2, low: 3, info: 4 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })

  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Claude 인사이트 보고서</title>
              <meta charset="utf-8">
              <style>
                body {
                  font-family: 'Malgun Gothic', 'Noto Sans KR', sans-serif;
                  line-height: 1.6;
                  margin: 20px;
                  color: #333;
                }
                .report-header {
                  text-align: center;
                  margin-bottom: 20px;
                  border-bottom: 2px solid #3b82f6;
                  padding-bottom: 15px;
                }
                .report-title {
                  font-size: 24px;
                  font-weight: bold;
                  margin-bottom: 10px;
                  color: #1e40af;
                }
                .report-subtitle {
                  font-size: 16px;
                  color: #666;
                  margin-bottom: 5px;
                }
                .report-section {
                  margin-bottom: 20px;
                  padding: 15px;
                  border: 1px solid #e5e7eb;
                  border-radius: 8px;
                }
                .section-title {
                  font-size: 18px;
                  font-weight: bold;
                  margin-bottom: 15px;
                  color: #1f2937;
                }
                .recommendation {
                  margin-bottom: 15px;
                  padding: 10px;
                  border-left: 4px solid #3b82f6;
                  background-color: #f8fafc;
                }
                .priority-high { border-left-color: #dc2626; }
                .priority-medium { border-left-color: #ca8a04; }
                .priority-low { border-left-color: #059669; }
                .priority-info { border-left-color: #2563eb; }
                .metadata-grid {
                  display: grid;
                  grid-template-columns: 1fr;
                  gap: 10px;
                }
                .metadata-item {
                  padding: 8px 12px;
                  background-color: #f9fafb;
                  border-radius: 6px;
                  border: 1px solid #e5e7eb;
                }
                .metadata-item strong {
                  color: #374151;
                  display: inline-block;
                  min-width: 120px;
                }
                @media print {
                  body { margin: 15px; }
                  .report-section { 
                    page-break-inside: avoid; 
                    margin-bottom: 15px;
                  }
                  .report-header { margin-top: 0; }
                  .metadata-grid {
                    grid-template-columns: 1fr 1fr;
                    gap: 8px;
                  }
                  .metadata-item {
                    font-size: 14px;
                    padding: 6px 10px;
                  }
                }
              </style>
            </head>
            <body>
              ${printRef.current.innerHTML}
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.focus()
        printWindow.print()
        printWindow.close()
      }
    }
  }

  const handleAddToCalendar = async (recommendation: ClaudeRecommendation) => {
    try {
      toast.info('일정을 등록하고 있습니다...')
      
      // 캘린더 일정 추가 API 호출
      const eventData = {
        title: `📋 ${recommendation.category}`,
        description: recommendation.action,
        start_time: recommendation.deadline ? new Date(recommendation.deadline).toISOString() : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 마감일 또는 일주일 후
        end_time: recommendation.deadline ? new Date(new Date(recommendation.deadline).getTime() + 60 * 60 * 1000).toISOString() : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(), // 1시간 후
        event_type: 'project'
      }

      const response = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData)
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(`✅ 일정이 성공적으로 등록되었습니다!\n📅 ${recommendation.category}`)
      } else {
        const errorData = await response.json()
        toast.error(`❌ 일정 등록에 실패했습니다.\n${errorData.error || '알 수 없는 오류가 발생했습니다.'}`)
      }
    } catch (error) {
      console.error('일정 등록 중 오류:', error)
      toast.error(`❌ 일정 등록 중 오류가 발생했습니다.\n${error instanceof Error ? error.message : '네트워크 오류'}`)
    }
  }

  // 편집 시작
  const handleEditStart = (index: number, recommendation: ClaudeRecommendation) => {
    setEditingIndex(index)
    setEditingRecommendation({ ...recommendation })
  }

  // 편집 취소
  const handleEditCancel = () => {
    setEditingIndex(null)
    setEditingRecommendation(null)
  }

  // 편집 저장
  const handleEditSave = async () => {
    if (editingRecommendation === null || editingIndex === null) return

    setIsUpdating(true)
    try {
      toast.info('추천사항을 업데이트하는 중...')

      // 새로운 추천사항 배열 생성 (기존 required_resources 필드 유지)
      const updatedRecommendations = [...insight.recommendations]
      const originalRecommendation = insight.recommendations[editingIndex]
      updatedRecommendations[editingIndex] = {
        ...editingRecommendation,
        required_resources: originalRecommendation?.required_resources || []
      }

      const response = await fetch(`/api/claude-insights/${insight.id}/recommendations`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recommendations: updatedRecommendations
        })
      })

      if (response.ok) {
        toast.success('✅ 추천사항이 성공적으로 업데이트되었습니다!')
        
        // 편집 모드 종료
        setEditingIndex(null)
        setEditingRecommendation(null)
        
        // 부모 컴포넌트에서 데이터 다시 로드
        if (onInsightUpdate) {
          onInsightUpdate()
        }
      } else {
        const errorData = await response.json()
        console.error('업데이트 실패 상세:', errorData)
        toast.error(`❌ 업데이트 실패: ${errorData.error || '알 수 없는 오류가 발생했습니다.'}`)
      }
    } catch (error) {
      console.error('추천사항 업데이트 중 오류:', error)
      toast.error(`❌ 업데이트 중 오류가 발생했습니다.\n${error instanceof Error ? error.message : '네트워크 오류'}`)
    } finally {
      setIsUpdating(false)
    }
  }

  // 추천사항 삭제
  const handleDelete = async (index: number) => {
    setIsUpdating(true)
    try {
      toast.info('추천사항을 삭제하는 중...')

      const response = await fetch(`/api/claude-insights/${insight.id}/recommendations?index=${index}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('✅ 추천사항이 성공적으로 삭제되었습니다!')
        
        // 부모 컴포넌트에서 데이터 다시 로드
        if (onInsightUpdate) {
          onInsightUpdate()
        }
      } else {
        const errorData = await response.json()
        toast.error(`❌ 삭제 실패: ${errorData.error || '알 수 없는 오류가 발생했습니다.'}`)
      }
    } catch (error) {
      console.error('추천사항 삭제 중 오류:', error)
      toast.error(`❌ 삭제 중 오류가 발생했습니다.\n${error instanceof Error ? error.message : '네트워크 오류'}`)
    } finally {
      setIsUpdating(false)
    }
  }

  // 키보드 단축키 처리
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (editingIndex !== null) {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault()
        handleEditSave()
      } else if (e.key === 'Escape') {
        handleEditCancel()
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-4xl h-[85vh] overflow-hidden flex flex-col"
        onKeyDown={handleKeyDown}
      >
        {/* 인쇄용 컨텐츠 (숨겨짐) */}
        <div ref={printRef} style={{ display: 'none' }}>
          <div className="report-header">
            <div className="report-title">{insight.title}</div>
            <div className="report-subtitle">분석 유형: {analysisTypeInfo.name}</div>
            <div className="report-subtitle">생성일: {insight.created_at ? formatDate(insight.created_at) : 'N/A'}</div>
            <div className="report-subtitle">신뢰도: {Math.round((insight.confidence_score || 0) * 100)}%</div>
          </div>
          
          <div className="report-section">
            <div className="section-title">분석 내용</div>
            <div dangerouslySetInnerHTML={{
              __html: insight.content.replace(/\n/g, '<br>')
                .replace(/#{1,6}\s+/g, '')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
            }} />
          </div>
          
          {sortedRecommendations.length > 0 && (
            <div className="report-section">
              <div className="section-title">추천사항</div>
              {sortedRecommendations.map((rec, index) => (
                <div key={index} className={`recommendation priority-${rec.priority}`}>
                  <strong>[{getPriorityLabel(rec.priority)}] {rec.category}:</strong><br/>
                  {rec.action}
                  {rec.deadline && <><br/><strong>마감일:</strong> {rec.deadline}</>}
                  {rec.estimated_impact && <><br/><strong>예상 효과:</strong> {rec.estimated_impact}</>}
                </div>
              ))}
            </div>
          )}
          
          {/* 상세정보 (메타데이터) 섹션 */}
          <div className="report-section">
            <div className="section-title">상세정보</div>
            <div className="metadata-grid">
              {insight.metadata?.data_source && (
                <div className="metadata-item">
                  <strong>데이터 소스:</strong> {insight.metadata.data_source}
                </div>
              )}
              {insight.metadata?.analysis_method && (
                <div className="metadata-item">
                  <strong>분석 방법:</strong> {insight.metadata.analysis_method}
                </div>
              )}
              {insight.metadata?.model_version && (
                <div className="metadata-item">
                  <strong>모델 버전:</strong> {insight.metadata.model_version}
                </div>
              )}
              {insight.metadata?.student_count && (
                <div className="metadata-item">
                  <strong>분석 대상 학생 수:</strong> {insight.metadata.student_count}명
                </div>
              )}
              {insight.metadata?.data_quality_score && (
                <div className="metadata-item">
                  <strong>데이터 품질 점수:</strong> {Math.round(insight.metadata.data_quality_score * 100)}%
                </div>
              )}
              {insight.metadata?.processing_time_ms && (
                <div className="metadata-item">
                  <strong>처리 시간:</strong> {insight.metadata.processing_time_ms}ms
                </div>
              )}
              {insight.data_period && (
                <div className="metadata-item">
                  <strong>분석 기간:</strong> {claudeUtils.formatDateRange(insight.data_period)}
                </div>
              )}
              {insight.tags && insight.tags.length > 0 && (
                <div className="metadata-item">
                  <strong>태그:</strong> {insight.tags.join(', ')}
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogHeader>
          <div className="flex items-start justify-between gap-4 pr-8">
            <div className="flex-1">
              <DialogTitle className="text-xl font-bold leading-tight">
                {insight.title}
              </DialogTitle>
              
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge 
                    variant="secondary"
                    style={{ 
                      backgroundColor: `${analysisTypeInfo.color}15`,
                      color: analysisTypeInfo.color,
                      border: `1px solid ${analysisTypeInfo.color}30`
                    }}
                  >
                    <span className="mr-1">{analysisTypeInfo.icon}</span>
                    {analysisTypeInfo.name}
                  </Badge>
                  
                  <Badge 
                    variant="outline"
                    style={{ 
                      color: confidenceColor,
                      borderColor: confidenceColor 
                    }}
                  >
                    <Star className="h-3 w-3 mr-1" />
                    신뢰도 {confidenceLabel}
                  </Badge>
                  
                  <Badge variant="outline" className="text-xs">
                    <Calendar className="h-3 w-3 mr-1" />
                    {insight.created_at ? formatDate(insight.created_at) : 'N/A'}
                  </Badge>
                </div>
                
                {insight.tags && insight.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {insight.tags.map((tag, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary" 
                        className="text-xs"
                        style={{ 
                          backgroundColor: `${claudeUtils.getTagColor(tag)}15`,
                          color: claudeUtils.getTagColor(tag)
                        }}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                인쇄
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <TabsList className="grid grid-cols-3 shrink-0 w-auto">
              <TabsTrigger value="overview">개요</TabsTrigger>
              <TabsTrigger value="recommendations">
                추천사항 
                {sortedRecommendations.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 text-xs">
                    {sortedRecommendations.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="metadata">상세정보</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 h-0">
            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">분석 내용</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-li:text-gray-700">
                    <ReactMarkdown
                      components={{
                        h1: ({node, ...props}) => <h1 className="text-xl font-bold text-gray-900 mb-3" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-lg font-semibold text-gray-900 mb-2 mt-4" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-base font-medium text-gray-900 mb-2 mt-3" {...props} />,
                        p: ({node, ...props}) => <p className="text-sm text-gray-700 mb-2 leading-relaxed" {...props} />,
                        ul: ({node, ...props}) => <ul className="text-sm text-gray-700 mb-2 ml-4 list-disc" {...props} />,
                        ol: ({node, ...props}) => <ol className="text-sm text-gray-700 mb-2 ml-4 list-decimal" {...props} />,
                        li: ({node, ...props}) => <li className="mb-1" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-semibold text-gray-900" {...props} />,
                        em: ({node, ...props}) => <em className="italic text-gray-800" {...props} />,
                        code: ({node, ...props}) => <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono" {...props} />,
                        blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-blue-200 pl-4 italic text-gray-600" {...props} />,
                      }}
                    >
                      {insight.content}
                    </ReactMarkdown>
                  </div>
                </CardContent>
              </Card>

              {insight.data_period && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      분석 기간
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div><strong>기간:</strong> {formatDateRange()}</div>
                      {insight.data_period.scope && (
                        <div><strong>범위:</strong> {insight.data_period.scope}</div>
                      )}
                      {insight.data_period.data_sources && insight.data_period.data_sources.length > 0 && (
                        <div>
                          <strong>데이터 소스:</strong> {insight.data_period.data_sources.join(', ')}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="recommendations" className="space-y-4">
              {sortedRecommendations.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      추천사항이 없습니다
                    </h3>
                    <p className="text-gray-600">
                      이 인사이트에 대한 추천사항이 아직 생성되지 않았습니다.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {sortedRecommendations.map((recommendation, index) => (
                    <Card key={index} className="border-l-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20" 
                          style={{ borderLeftColor: claudeUtils.getPriorityColor(recommendation.priority) }}>
                      <CardContent className="p-6">
                        {editingIndex === index ? (
                          // 편집 모드
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium text-gray-700 block mb-2">카테고리</label>
                                <Input
                                  value={editingRecommendation?.category || ''}
                                  onChange={(e) => setEditingRecommendation(prev => 
                                    prev ? { ...prev, category: e.target.value } : null
                                  )}
                                  placeholder="카테고리를 입력하세요"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700 block mb-2">우선순위</label>
                                <Select
                                  value={editingRecommendation?.priority || 'info'}
                                  onValueChange={(value: 'highest' | 'high' | 'medium' | 'low' | 'info') => 
                                    setEditingRecommendation(prev => 
                                      prev ? { ...prev, priority: value } : null
                                    )
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="highest">최우선</SelectItem>
                                    <SelectItem value="high">높음</SelectItem>
                                    <SelectItem value="medium">보통</SelectItem>
                                    <SelectItem value="low">낮음</SelectItem>
                                    <SelectItem value="info">정보</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            
                            <div>
                              <label className="text-sm font-medium text-gray-700 block mb-2">액션</label>
                              <Textarea
                                value={editingRecommendation?.action || ''}
                                onChange={(e) => setEditingRecommendation(prev => 
                                  prev ? { ...prev, action: e.target.value } : null
                                )}
                                placeholder="추천사항을 입력하세요"
                                rows={3}
                              />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium text-gray-700 block mb-2">마감일</label>
                                <Input
                                  type="date"
                                  value={editingRecommendation?.deadline || ''}
                                  onChange={(e) => setEditingRecommendation(prev => 
                                    prev ? { ...prev, deadline: e.target.value } : null
                                  )}
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700 block mb-2">예상 효과</label>
                                <Input
                                  value={editingRecommendation?.estimated_impact || ''}
                                  onChange={(e) => setEditingRecommendation(prev => 
                                    prev ? { ...prev, estimated_impact: e.target.value } : null
                                  )}
                                  placeholder="예상 효과를 입력하세요"
                                />
                              </div>
                            </div>
                            
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleEditCancel}
                                disabled={isUpdating}
                              >
                                <X className="h-4 w-4 mr-1" />
                                취소
                              </Button>
                              <Button
                                size="sm"
                                onClick={handleEditSave}
                                disabled={isUpdating}
                              >
                                <Save className="h-4 w-4 mr-1" />
                                {isUpdating ? '저장 중...' : '저장'}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          // 일반 보기 모드
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1">
                              {getPriorityIcon(recommendation.priority)}
                              <div className="flex-1 space-y-3">
                                <div className="flex items-center gap-2">
                                  <Badge 
                                    variant="secondary"
                                    style={{ 
                                      backgroundColor: `${claudeUtils.getPriorityColor(recommendation.priority)}20`,
                                      color: claudeUtils.getPriorityColor(recommendation.priority),
                                      border: `1px solid ${claudeUtils.getPriorityColor(recommendation.priority)}40`
                                    }}
                                  >
                                    {getPriorityLabel(recommendation.priority)}
                                  </Badge>
                                  <span className="text-sm font-semibold text-gray-800">
                                    {recommendation.category}
                                  </span>
                                </div>
                                
                                <p className="text-sm leading-relaxed text-gray-700 font-medium">
                                  {recommendation.action}
                                </p>
                                
                                <div className="space-y-2">
                                  {recommendation.deadline && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Clock className="h-4 w-4 text-orange-500" />
                                      <span className="font-medium text-gray-600">마감일:</span>
                                      <span className="text-orange-600 font-medium">{recommendation.deadline}</span>
                                    </div>
                                  )}
                                  {recommendation.estimated_impact && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                      <span className="font-medium text-gray-600">예상 효과:</span>
                                      <span className="text-green-600 font-medium">{recommendation.estimated_impact}</span>
                                    </div>
                                  )}
                                  {recommendation.required_resources && recommendation.required_resources.length > 0 && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Info className="h-4 w-4 text-blue-500" />
                                      <span className="font-medium text-gray-600">필요 자원:</span>
                                      <span className="text-blue-600 font-medium">{recommendation.required_resources.join(', ')}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex flex-col gap-2 shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAddToCalendar(recommendation)}
                                className="bg-white hover:bg-blue-50 border-blue-200 text-blue-600 hover:text-blue-700"
                              >
                                <CalendarPlus className="h-4 w-4 mr-1" />
                                일정 등록
                              </Button>
                              
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditStart(index, recommendation)}
                                disabled={isUpdating}
                                className="bg-white hover:bg-green-50 border-green-200 text-green-600 hover:text-green-700"
                              >
                                <Edit3 className="h-4 w-4 mr-1" />
                                편집
                              </Button>
                              
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={isUpdating}
                                    className="bg-white hover:bg-red-50 border-red-200 text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    삭제
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>추천사항 삭제</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      이 추천사항을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>취소</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(index)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      삭제
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>


            <TabsContent value="metadata" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">메타데이터</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>신뢰도 점수:</strong> {Math.round((insight.confidence_score || 0) * 100)}%
                    </div>
                    <div>
                      <strong>상태:</strong> {insight.status === 'active' ? '활성' : '보관됨'}
                    </div>
                    <div>
                      <strong>생성일:</strong> {insight.created_at ? formatDate(insight.created_at) : 'N/A'}
                    </div>
                    <div>
                      <strong>최종 수정:</strong> {insight.updated_at ? formatDate(insight.updated_at) : 'N/A'}
                    </div>
                  </div>

                  {insight.metadata && Object.keys(insight.metadata).length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-medium mb-2">추가 정보</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          {Object.entries(insight.metadata).map(([key, value]) => (
                            <div key={key}>
                              <strong>{key}:</strong> {String(value)}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}