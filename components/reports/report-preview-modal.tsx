"use client"

import { useState, useEffect } from "react"
import { FileText, Edit2, Save, X, Loader2, Calendar, User, School } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import type { ReportTableRow } from "@/types/reports"
import { ReportStatusLabel } from "@/types/reports"

interface ReportPreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  report: ReportTableRow | null
  onSave?: (reportId: string, content: string) => Promise<void>
}

export function ReportPreviewModal({
  open,
  onOpenChange,
  report,
  onSave
}: ReportPreviewModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [reportContent, setReportContent] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  // 보고서 내용 가져오기
  useEffect(() => {
    if (open && report?.reportId) {
      fetchReportContent()
    } else {
      // 모달이 닫히거나 보고서가 없을 때 초기화
      setReportContent("")
      setIsEditing(false)
      setEditedContent("")
    }
  }, [open, report?.reportId])

  const fetchReportContent = async () => {
    if (!report?.reportId) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/reports/${report.reportId}`)
      if (!response.ok) throw new Error("보고서 조회 실패")
      
      const data = await response.json()
      setReportContent(data.reportContent || "")
    } catch (error) {
      console.error("보고서 조회 오류:", error)
      toast.error("보고서를 불러오는 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  // 편집 모드 시작
  const handleStartEdit = () => {
    setIsEditing(true)
    setEditedContent(reportContent)
  }

  // 편집 취소
  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditedContent("")
  }

  // 보고서 저장
  const handleSave = async () => {
    if (!report?.reportId || !onSave) return

    setIsSaving(true)
    try {
      await onSave(report.reportId, editedContent)
      
      // 성공 시 원본 업데이트
      setReportContent(editedContent)
      setIsEditing(false)
      
      toast.success("보고서가 저장되었습니다.")
    } catch (error) {
      console.error("보고서 저장 오류:", error)
      toast.error("보고서 저장 중 오류가 발생했습니다.")
    } finally {
      setIsSaving(false)
    }
  }

  if (!report) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            월간 학습 보고서
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 mt-3">
              {/* 학생 정보 */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span className="font-medium">{report.studentName}</span>
                </div>
                <div className="flex items-center gap-1">
                  <School className="h-4 w-4" />
                  <span>{report.school || "학교 미등록"} {report.grade}학년</span>
                </div>
                {report.className && (
                  <Badge variant="secondary">{report.className}</Badge>
                )}
              </div>

              {/* 보고서 정보 */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{report.year}년 {report.month}월</span>
                </div>
                <Badge variant="outline">
                  {ReportStatusLabel[report.reportStatus]}
                </Badge>
                {report.generatedAt && (
                  <span>
                    생성일: {format(new Date(report.generatedAt), "MM/dd HH:mm", { locale: ko })}
                  </span>
                )}
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <Separator />

        {/* 보고서 내용 */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : isEditing ? (
            <ScrollArea className="h-[60vh] px-1">
              <div className="pr-4 py-4">
                <label className="text-sm font-medium mb-2 block">보고서 내용</label>
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="min-h-[400px] font-mono text-sm resize-none"
                  placeholder="보고서 내용을 입력하세요..."
                />
              </div>
            </ScrollArea>
          ) : (
            <ScrollArea className="h-[60vh] px-1">
              <div className="pr-4 py-4">
                {/* 보고서 본문 */}
                <div className="whitespace-pre-wrap font-mono text-sm">
                  {reportContent || "보고서 내용이 없습니다."}
                </div>
              </div>
            </ScrollArea>
          )}
        </div>

        <Separator />

        <DialogFooter>
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                disabled={isSaving}
              >
                <X className="h-4 w-4 mr-2" />
                취소
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    저장
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                닫기
              </Button>
              {onSave && (
                <Button
                  variant="outline"
                  onClick={handleStartEdit}
                  disabled={isLoading}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  편집
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}