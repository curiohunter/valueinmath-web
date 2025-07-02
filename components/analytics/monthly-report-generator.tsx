"use client"

import { useState, useRef, useEffect } from "react"
import { FileText, Download, Printer, Eye, Calendar, User, Edit2, Save, X, List, Check, Trash2, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { saveMonthlyReport, getSavedMonthlyReports, getSavedReportById, deleteSavedReport, updateSavedReport } from "@/services/analytics-service"
import type { MonthlyReportData } from "@/types/analytics"

interface MonthlyReportGeneratorProps {
  monthlyData: MonthlyReportData | null
  reportText: string | null
  isGenerating: boolean
  onGenerateReport: () => Promise<{ success: boolean; data?: string; error?: string }>
  onClearReport: () => void
}

export function MonthlyReportGenerator({
  monthlyData,
  reportText,
  isGenerating,
  onGenerateReport,
  onClearReport
}: MonthlyReportGeneratorProps) {
  const [showPreview, setShowPreview] = useState(false)
  const [editingSections, setEditingSections] = useState<{ [key: number]: boolean }>({})
  const [editedContent, setEditedContent] = useState<{ [key: number]: string }>({})
  const [isSaving, setIsSaving] = useState(false)
  const [savedReports, setSavedReports] = useState<any[]>([])
  const [isLoadingReports, setIsLoadingReports] = useState(false)
  const [activeTab, setActiveTab] = useState("generate")
  const [viewingReport, setViewingReport] = useState<{
    content: string
    student: any
    year: number
    month: number
    monthlyStats?: any
  } | null>(null)
  const [isLoadingViewReport, setIsLoadingViewReport] = useState(false)
  const [isEditingReport, setIsEditingReport] = useState(false)
  const [editingReportId, setEditingReportId] = useState<string | null>(null)
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  const handleGenerateReport = async () => {
    const result = await onGenerateReport()
    if (result.success) {
      setShowPreview(true)
      // 편집 상태 초기화
      setEditingSections({})
      setEditedContent({})
    }
  }

  const handleEditSection = (index: number, content: string) => {
    setEditingSections(prev => ({ ...prev, [index]: true }))
    setEditedContent(prev => ({ ...prev, [index]: content }))
  }

  const handleSaveSection = (index: number) => {
    setEditingSections(prev => ({ ...prev, [index]: false }))
  }

  const handleCancelEdit = (index: number) => {
    setEditingSections(prev => ({ ...prev, [index]: false }))
    setEditedContent(prev => {
      const newContent = { ...prev }
      delete newContent[index]
      return newContent
    })
  }

  const getSectionContent = (index: number, originalContent: string) => {
    return editedContent[index] !== undefined ? editedContent[index] : originalContent
  }

  // 저장된 보고서 목록 가져오기
  useEffect(() => {
    const fetchSavedReports = async () => {
      setIsLoadingReports(true)
      try {
        const result = await getSavedMonthlyReports()
        if (result.success && result.data) {
          setSavedReports(result.data)
        }
      } catch (error) {
        console.error("저장된 보고서 조회 실패:", error)
      } finally {
        setIsLoadingReports(false)
      }
    }
    
    fetchSavedReports()
  }, [])

  // 보고서 저장
  const handleSaveReport = async () => {
    if (!monthlyData || !reportText) return
    
    setIsSaving(true)
    try {
      // 편집된 내용 반영
      let finalReport = reportText
      const sections = reportText.split('\n\n').filter(section => section.trim())
      
      sections.forEach((section, index) => {
        if (editedContent[index]) {
          const lines = section.trim().split('\n')
          const title = lines[0]
          finalReport = finalReport.replace(section, `${title}\n${editedContent[index]}`)
        }
      })
      
      const result = await saveMonthlyReport(
        monthlyData.student.id,
        monthlyData.year,
        monthlyData.month,
        finalReport,
        undefined, // teacher_comment
        monthlyData.monthlyStats
      )
      
      if (result.success) {
        alert("보고서가 저장되었습니다.")
        // 저장된 보고서 목록 새로고침
        const reportsResult = await getSavedMonthlyReports()
        if (reportsResult.success && reportsResult.data) {
          setSavedReports(reportsResult.data)
        }
      } else {
        alert("보고서 저장에 실패했습니다.")
      }
    } catch (error) {
      console.error("보고서 저장 오류:", error)
      alert("보고서 저장 중 오류가 발생했습니다.")
    } finally {
      setIsSaving(false)
    }
  }

  // 저장된 보고서 보기
  const handleViewReport = async (reportId: string) => {
    setIsLoadingViewReport(true)
    try {
      const result = await getSavedReportById(reportId)
      
      if (result.success && result.data) {
        setViewingReport({
          content: result.data.report_content,
          student: result.data.student,
          year: result.data.year,
          month: result.data.month,
          monthlyStats: result.data.monthly_stats
        })
        // 탭은 그대로 유지하고 미리보기만 표시
        setShowPreview(true)
      } else {
        alert("보고서를 불러올 수 없습니다.")
      }
    } catch (error) {
      console.error("보고서 조회 오류:", error)
      alert("보고서 조회 중 오류가 발생했습니다.")
    } finally {
      setIsLoadingViewReport(false)
    }
  }

  // 보고서 삭제
  const handleDeleteReport = async (reportId: string) => {
    if (!confirm("정말로 이 보고서를 삭제하시겠습니까?")) return
    
    setDeletingReportId(reportId)
    try {
      const result = await deleteSavedReport(reportId)
      
      if (result.success) {
        alert("보고서가 삭제되었습니다.")
        // 목록 새로고침
        const reportsResult = await getSavedMonthlyReports()
        if (reportsResult.success && reportsResult.data) {
          setSavedReports(reportsResult.data)
        }
        // 현재 보고 있는 보고서가 삭제된 경우
        if (viewingReport && savedReports.find(r => r.id === reportId)) {
          setViewingReport(null)
          setShowPreview(false)
        }
      } else {
        alert("보고서 삭제에 실패했습니다.")
      }
    } catch (error) {
      console.error("보고서 삭제 오류:", error)
      alert("보고서 삭제 중 오류가 발생했습니다.")
    } finally {
      setDeletingReportId(null)
    }
  }

  // 보고서 수정 저장
  const handleUpdateReport = async () => {
    if (!editingReportId || !viewingReport) return
    
    setIsEditingReport(true)
    try {
      // 편집된 내용 반영
      let finalReport = viewingReport.content
      const sections = viewingReport.content.split('\n\n').filter(section => section.trim())
      
      sections.forEach((section, index) => {
        if (editedContent[index]) {
          const lines = section.trim().split('\n')
          const title = lines[0]
          finalReport = finalReport.replace(section, `${title}\n${editedContent[index]}`)
        }
      })
      
      const result = await updateSavedReport(editingReportId, finalReport)
      
      if (result.success) {
        alert("보고서가 수정되었습니다.")
        // 수정된 내용으로 업데이트
        setViewingReport({
          ...viewingReport,
          content: finalReport
        })
        setEditingSections({})
        setEditedContent({})
        setIsEditingReport(false)
        setEditingReportId(null)
      } else {
        alert("보고서 수정에 실패했습니다.")
      }
    } catch (error) {
      console.error("보고서 수정 오류:", error)
      alert("보고서 수정 중 오류가 발생했습니다.")
    } finally {
      setIsEditingReport(false)
    }
  }

  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>월별 학습 보고서</title>
              <meta charset="utf-8">
              <style>
                body {
                  font-family: 'Malgun Gothic', 'Noto Sans KR', sans-serif;
                  line-height: 1.6;
                  margin: 40px;
                  color: #333;
                }
                .report-header {
                  text-align: center;
                  margin-bottom: 30px;
                  border-bottom: 2px solid #3b82f6;
                  padding-bottom: 20px;
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
                  margin-bottom: 25px;
                  padding: 20px;
                  border: 1px solid #e5e7eb;
                  border-radius: 8px;
                  background-color: #f9fafb;
                }
                .section-title {
                  font-size: 18px;
                  font-weight: bold;
                  color: #1f2937;
                  margin-bottom: 15px;
                  padding-bottom: 8px;
                  border-bottom: 1px solid #d1d5db;
                }
                .stats-grid {
                  display: grid;
                  grid-template-columns: repeat(2, 1fr);
                  gap: 15px;
                  margin: 15px 0;
                }
                .stat-item {
                  padding: 10px;
                  background: white;
                  border-radius: 6px;
                  border: 1px solid #e5e7eb;
                }
                .stat-label {
                  font-size: 12px;
                  color: #6b7280;
                  margin-bottom: 5px;
                }
                .stat-value {
                  font-size: 16px;
                  font-weight: bold;
                  color: #111827;
                }
                .content-text {
                  white-space: pre-line;
                  line-height: 1.8;
                  font-size: 14px;
                }
                .highlight {
                  background-color: #dbeafe;
                  padding: 2px 6px;
                  border-radius: 4px;
                  font-weight: 500;
                }
                @media print {
                  body { margin: 20px; }
                  .report-section { break-inside: avoid; }
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
        setTimeout(() => {
          printWindow.print()
          printWindow.close()
        }, 250)
      }
    }
  }

  const formatReportForDisplay = (text: string, data: MonthlyReportData) => {
    const sections = text.split('\n\n').filter(section => section.trim())
    
    return (
      <div className="space-y-6">
        {/* 보고서 헤더 */}
        <div className="report-header text-center border-b-2 border-blue-600 pb-6">
          <h1 className="report-title text-2xl font-bold text-blue-800 mb-2">
            월별 학습 보고서
          </h1>
          <div className="report-subtitle text-gray-600 space-y-1">
            <p className="text-lg font-medium">{data.student.name} 학생</p>
            <p>{data.year}년 {data.month}월</p>
            {data.student.school && (
              <p>{data.student.school} {data.student.grade}학년</p>
            )}
            {data.student.department && (
              <p className="text-sm">({data.student.department})</p>
            )}
          </div>
        </div>

        {/* 학습 통계 요약 - 생성된 보고서에서만 표시 */}
        {data.monthlyStats && (
          <div className="report-section bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-6 rounded-lg border">
            <h2 className="section-title text-lg font-bold text-gray-800 mb-4">학습 통계 요약</h2>
            <div className="stats-grid grid grid-cols-2 gap-4">
              <div className="stat-item bg-white p-4 rounded-lg border">
                <div className="stat-label text-xs text-gray-500 mb-1">출석률</div>
                <div className="stat-value text-lg font-bold text-blue-600">
                  {data.monthlyStats.attendanceRate || 0}%
                </div>
              </div>
              <div className="stat-item bg-white p-4 rounded-lg border">
                <div className="stat-label text-xs text-gray-500 mb-1">평균 집중도</div>
                <div className="stat-value text-lg font-bold text-green-600">
                  {(data.monthlyStats.avgFocus || 0).toFixed(1)}점
                </div>
              </div>
              <div className="stat-item bg-white p-4 rounded-lg border">
                <div className="stat-label text-xs text-gray-500 mb-1">과제 수행도</div>
                <div className="stat-value text-lg font-bold text-purple-600">
                  {(data.monthlyStats.avgHomework || 0).toFixed(1)}점
                </div>
              </div>
              <div className="stat-item bg-white p-4 rounded-lg border">
                <div className="stat-label text-xs text-gray-500 mb-1">시험 평균</div>
                <div className="stat-value text-lg font-bold text-orange-600">
                  {(data.monthlyStats.avgTestScore || 0).toFixed(1)}점
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 보고서 내용 섹션별 표시 */}
        {sections.map((section, index) => {
          const lines = section.trim().split('\n')
          
          // 종합 평가 섹션 특별 처리
          if (lines[0]?.includes('────────────────────') && lines[1]?.includes('종합 평가')) {
            const title = '종합 평가'
            const content = lines.slice(2).join('\n').trim() || '(선생님이 직접 작성해주세요)'
            const isEditing = editingSections[index]
            const displayContent = getSectionContent(index, content)
            
            return (
              <div key={index} className="report-section bg-gray-50 dark:bg-gray-900/20 p-6 rounded-lg border">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-300">
                  <h2 className="section-title text-lg font-bold text-gray-800">
                    {title}
                  </h2>
                  {(!isEditing && (editingReportId || (!viewingReport && reportText))) ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditSection(index, content)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  ) : isEditing && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSaveSection(index)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelEdit(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                {isEditing ? (
                  <Textarea
                    value={displayContent}
                    onChange={(e) => setEditedContent(prev => ({ ...prev, [index]: e.target.value }))}
                    className="min-h-32 font-mono text-sm"
                    placeholder="종합 평가를 입력하세요..."
                  />
                ) : (
                  <div className="content-text whitespace-pre-line leading-relaxed text-gray-700 dark:text-gray-300">
                    {displayContent}
                  </div>
                )}
              </div>
            )
          }
          
          const title = lines[0]?.replace(/^[■●▶📚📝👨‍🏫]\s*/, '').trim()
          const content = lines.slice(1).join('\n').trim()
          
          if (!title || !content) return null
          
          // 학습 통계 요약은 편집 불가 (index 0은 보통 학습 개요)
          // 수정 모드일 때는 모든 섹션 편집 가능
          const isEditable = editingReportId ? true : (!title.includes('학습 개요') && !title.includes('학업 태도 기록'))
          const isEditing = editingSections[index]
          const displayContent = getSectionContent(index, content)
          
          return (
            <div key={index} className="report-section bg-gray-50 dark:bg-gray-900/20 p-6 rounded-lg border">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-300">
                <h2 className="section-title text-lg font-bold text-gray-800">
                  {title}
                </h2>
                {isEditable && !isEditing && (editingReportId || (!viewingReport && reportText)) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditSection(index, content)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                )}
                {isEditing && (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSaveSection(index)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancelEdit(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              
              {isEditing ? (
                <Textarea
                  value={displayContent}
                  onChange={(e) => setEditedContent(prev => ({ ...prev, [index]: e.target.value }))}
                  className="min-h-32 font-mono text-sm"
                  placeholder="내용을 입력하세요..."
                />
              ) : (
                <div className="content-text whitespace-pre-line leading-relaxed text-gray-700 dark:text-gray-300">
                  {displayContent.split('\n').map((line, lineIndex) => {
                    if (line.trim().startsWith('- ')) {
                      return (
                        <div key={lineIndex} className="ml-4 mb-2">
                          <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2 mt-2"></span>
                          {line.substring(2)}
                        </div>
                      )
                    }
                    return <div key={lineIndex} className="mb-2">{line}</div>
                  })}
                </div>
              )}
            </div>
          )
        })}

        {/* 생성 시간 */}
        <div className="text-center text-sm text-gray-500 mt-8">
          <p>보고서 생성일: {new Date().toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
        </div>
      </div>
    )
  }

  return (
    <Card className="space-y-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          월별 보고서 관리
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate">보고서 생성</TabsTrigger>
            <TabsTrigger value="saved">저장된 보고서</TabsTrigger>
          </TabsList>
          
          <TabsContent value="generate" className="p-6">
            <div className="space-y-6">
              {/* 제어 버튼들 */}
              <div className="flex flex-wrap gap-3">
                <Button 
                  onClick={handleGenerateReport}
                  disabled={!monthlyData || isGenerating}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  {isGenerating ? "생성 중..." : "보고서 생성"}
                </Button>
                
                {reportText && (
                  <>
                    <Button 
                      variant="outline"
                      onClick={() => setShowPreview(!showPreview)}
                      className="flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      {showPreview ? "미리보기 숨기기" : "미리보기"}
                    </Button>
                    
                    <Button 
                      variant="outline"
                      onClick={handleSaveReport}
                      disabled={isSaving}
                      className="flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {isSaving ? "저장 중..." : "보고서 저장"}
                    </Button>
                    
                    <Button 
                      variant="outline"
                      onClick={handlePrint}
                      className="flex items-center gap-2"
                    >
                      <Printer className="h-4 w-4" />
                      인쇄/PDF
                    </Button>
                    
                    <Button 
                      variant="ghost"
                      onClick={onClearReport}
                      className="flex items-center gap-2 text-red-600 hover:text-red-700"
                    >
                      초기화
                    </Button>
                  </>
                )}
              </div>

              {!monthlyData && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">
                      학생과 날짜를 선택하면 보고서를 생성할 수 있습니다.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="saved" className="p-6">
            <div className="space-y-4">
              {isLoadingReports ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : savedReports.length > 0 ? (
                <div className="space-y-2">
                  {savedReports.map((report) => (
                    <div 
                      key={report.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">{report.student?.name}</span>
                          <span className="text-sm text-gray-500">
                            {report.student?.school && `${report.student.school} ${report.student.grade}학년`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {report.year}년 {report.month}월
                          </span>
                          {report.teacher_comment && report.teacher_comment !== "(선생님이 직접 작성해주세요)" && (
                            <Check className="h-3 w-3 text-green-600" />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewReport(report.id)}
                          disabled={isLoadingViewReport}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteReport(report.id)}
                          disabled={deletingReportId === report.id}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <List className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>저장된 보고서가 없습니다.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* 보고서 미리보기 */}
      {showPreview && ((reportText && monthlyData) || viewingReport) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                {viewingReport ? "저장된 보고서" : "보고서 미리보기"}
              </div>
              <div className="flex items-center gap-2">
                {viewingReport && (
                  <>
                    {editingReportId ? (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={handleUpdateReport}
                          disabled={isEditingReport}
                          className="flex items-center gap-2"
                        >
                          <Save className="h-4 w-4" />
                          {isEditingReport ? "저장 중..." : "수정 저장"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingReportId(null)
                            setEditingSections({})
                            setEditedContent({})
                          }}
                        >
                          취소
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const reportId = savedReports.find(r => 
                              r.student?.id === viewingReport.student.id && 
                              r.year === viewingReport.year && 
                              r.month === viewingReport.month
                            )?.id
                            if (reportId) {
                              setEditingReportId(reportId)
                            }
                          }}
                          className="flex items-center gap-2"
                        >
                          <Edit2 className="h-4 w-4" />
                          수정
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePrint}
                          className="flex items-center gap-2"
                        >
                          <Printer className="h-4 w-4" />
                          인쇄/PDF
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setViewingReport(null)
                        setShowPreview(false)
                        setEditingReportId(null)
                        setEditingSections({})
                        setEditedContent({})
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              ref={printRef}
              className="bg-white dark:bg-gray-900 p-8 rounded-lg border shadow-sm"
              style={{ fontFamily: "'Malgun Gothic', 'Noto Sans KR', sans-serif" }}
            >
              {viewingReport 
                ? formatReportForDisplay(viewingReport.content, {
                    student: viewingReport.student,
                    year: viewingReport.year,
                    month: viewingReport.month,
                    monthlyStats: viewingReport.monthlyStats || null
                  } as MonthlyReportData)
                : formatReportForDisplay(reportText!, monthlyData!)
              }
            </div>
          </CardContent>
        </Card>
      )}

      {/* 로딩 상태 */}
      {isGenerating && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                보고서를 생성하고 있습니다...
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </Card>
  )
}