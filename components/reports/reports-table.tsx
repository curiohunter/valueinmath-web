"use client"

import { useState } from "react"
import { Eye, FileText, RefreshCw, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import type { ReportTableRow } from "@/types/reports"
import { ReportStatus, ReportStatusLabel, ReportStatusColor } from "@/types/reports"

interface ReportsTableProps {
  reports: ReportTableRow[]
  isLoading: boolean
  onViewReport: (report: ReportTableRow) => void
  onGenerateReport: (studentId: string) => Promise<void>
  onDeleteReport: (reportId: string) => Promise<void>
  onRefresh: () => void
}

export function ReportsTable({
  reports,
  isLoading,
  onViewReport,
  onGenerateReport,
  onDeleteReport,
  onRefresh,
}: ReportsTableProps) {
  const [generatingReports, setGeneratingReports] = useState<Set<string>>(new Set())
  const [deletingReport, setDeletingReport] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [reportToDelete, setReportToDelete] = useState<ReportTableRow | null>(null)

  // 보고서 생성/재생성 핸들러
  const handleGenerateReport = async (studentId: string, studentName: string) => {
    setGeneratingReports(prev => new Set(prev).add(studentId))
    try {
      await onGenerateReport(studentId)
      toast.success(`${studentName} 학생의 보고서가 생성되었습니다.`)
    } catch (error) {
      toast.error("보고서 생성 중 오류가 발생했습니다.")
    } finally {
      setGeneratingReports(prev => {
        const newSet = new Set(prev)
        newSet.delete(studentId)
        return newSet
      })
    }
  }

  // 보고서 삭제 핸들러
  const handleDeleteReport = async () => {
    if (!reportToDelete?.reportId) return

    setDeletingReport(reportToDelete.reportId)
    try {
      await onDeleteReport(reportToDelete.reportId)
      toast.success(`${reportToDelete.studentName} 학생의 보고서가 삭제되었습니다.`)
      setDeleteDialogOpen(false)
    } catch (error) {
      toast.error("보고서 삭제 중 오류가 발생했습니다.")
    } finally {
      setDeletingReport(null)
      setReportToDelete(null)
    }
  }

  // 날짜 포맷 함수
  const formatDate = (dateString?: string) => {
    if (!dateString) return "-"
    try {
      return format(new Date(dateString), "MM/dd HH:mm", { locale: ko })
    } catch {
      return "-"
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium">조회된 학생이 없습니다</p>
        <p className="text-sm text-muted-foreground mt-1">
          필터를 조정하거나 새로고침을 시도해보세요
        </p>
        <Button onClick={onRefresh} variant="outline" className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          새로고침
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>학생명</TableHead>
              <TableHead>학년</TableHead>
              <TableHead>학교</TableHead>
              <TableHead>반</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>생성일</TableHead>
              <TableHead>수정일</TableHead>
              <TableHead className="text-right">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.map((report) => {
              const isGenerating = generatingReports.has(report.studentId)
              const isDeleting = deletingReport === report.reportId

              return (
                <TableRow key={report.studentId}>
                  <TableCell className="font-medium">{report.studentName}</TableCell>
                  <TableCell>{report.grade || "-"}학년</TableCell>
                  <TableCell>{report.school || "-"}</TableCell>
                  <TableCell>{report.className || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={ReportStatusColor[report.reportStatus]}>
                      {ReportStatusLabel[report.reportStatus]}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(report.generatedAt)}</TableCell>
                  <TableCell>{formatDate(report.updatedAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* 보기 버튼 (보고서가 있을 때만) */}
                      {report.reportId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewReport(report)}
                          disabled={isGenerating || isDeleting}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}

                      {/* 생성/재생성 버튼 */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleGenerateReport(report.studentId, report.studentName)}
                        disabled={isGenerating || isDeleting}
                      >
                        {isGenerating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : report.reportStatus === ReportStatus.NOT_GENERATED ? (
                          <FileText className="h-4 w-4" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>

                      {/* 삭제 버튼 (보고서가 있을 때만) */}
                      {report.reportId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setReportToDelete(report)
                            setDeleteDialogOpen(true)
                          }}
                          disabled={isGenerating || isDeleting}
                        >
                          {isDeleting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>보고서 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              {reportToDelete?.studentName} 학생의 보고서를 삭제하시겠습니까?
              <br />
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingReport}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteReport}
              disabled={!!deletingReport}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingReport ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  삭제 중...
                </>
              ) : (
                "삭제"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}