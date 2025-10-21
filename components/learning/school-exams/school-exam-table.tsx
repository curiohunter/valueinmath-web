"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Download, Edit2, Trash2, CheckCircle2, Circle } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
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
import { getPDFDownloadUrl, deleteSchoolExam } from "@/lib/school-exam-client"
import type { SchoolExam } from "@/types/school-exam"

interface SchoolExamTableProps {
  exams: SchoolExam[]
  onEdit: (exam: SchoolExam) => void
  onDelete: () => void
}

export function SchoolExamTable({ exams, onEdit, onDelete }: SchoolExamTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [examToDelete, setExamToDelete] = useState<SchoolExam | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const handleDownload = async (exam: SchoolExam) => {
    if (!exam.pdf_file_path) {
      toast.error("PDF 파일이 없습니다")
      return
    }

    setDownloadingId(exam.id)
    try {
      const url = await getPDFDownloadUrl(exam.pdf_file_path)

      // 새 창에서 열기 (다운로드)
      const link = document.createElement("a")
      link.href = url
      link.target = "_blank"
      link.download = `${exam.school_name}_${exam.exam_year}_${exam.exam_type}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success("PDF 다운로드가 시작되었습니다")
    } catch (error) {
      console.error("Error downloading PDF:", error)
      toast.error("PDF 다운로드에 실패했습니다")
    } finally {
      setDownloadingId(null)
    }
  }

  const handleDeleteClick = (exam: SchoolExam) => {
    setExamToDelete(exam)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!examToDelete) return

    setIsDeleting(true)
    try {
      await deleteSchoolExam(examToDelete.id)
      toast.success("시험지가 삭제되었습니다")
      setDeleteDialogOpen(false)
      setExamToDelete(null)
      onDelete()
    } catch (error) {
      console.error("Error deleting exam:", error)
      toast.error("시험지 삭제에 실패했습니다")
    } finally {
      setIsDeleting(false)
    }
  }

  if (exams.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center text-muted-foreground">
        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">등록된 시험지가 없습니다</p>
        <p className="text-sm mt-2">상단의 "시험지 등록" 버튼을 눌러 시험지를 추가하세요</p>
      </div>
    )
  }

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">학교 타입</TableHead>
              <TableHead className="w-[70px]">학년</TableHead>
              <TableHead className="w-[70px]">학기</TableHead>
              <TableHead className="w-[180px]">학교명</TableHead>
              <TableHead className="w-[90px]">출제연도</TableHead>
              <TableHead className="w-[100px]">시험 유형</TableHead>
              <TableHead className="w-[80px] text-center">수집 상태</TableHead>
              <TableHead className="w-[80px] text-center">매쓰플랫</TableHead>
              <TableHead className="w-[80px] text-center">PDF</TableHead>
              <TableHead className="w-[100px] text-center">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exams.map((exam) => (
              <TableRow key={exam.id}>
                <TableCell className="w-[100px]">
                  <Badge variant="outline">{exam.school_type}</Badge>
                </TableCell>
                <TableCell className="w-[70px]">{exam.grade}학년</TableCell>
                <TableCell className="w-[70px]">{exam.semester}학기</TableCell>
                <TableCell className="w-[180px]">
                  <div className="font-medium truncate" title={exam.school_name}>
                    {exam.school_name}
                  </div>
                </TableCell>
                <TableCell className="w-[90px]">{exam.exam_year}년</TableCell>
                <TableCell className="w-[100px]">
                  <Badge variant={exam.exam_type === "중간고사" ? "secondary" : "default"}>
                    {exam.exam_type}
                  </Badge>
                </TableCell>
                <TableCell className="w-[80px]">
                  <div className="flex items-center justify-center">
                    {exam.is_collected ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="w-[80px]">
                  <div className="flex items-center justify-center">
                    {exam.is_uploaded_to_mathflat ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="w-[80px]">
                  <div className="flex items-center justify-center">
                    {exam.pdf_file_path ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(exam)}
                        disabled={downloadingId === exam.id}
                        className="h-8 w-8 p-0"
                      >
                        <Download className="w-5 h-5" />
                      </Button>
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="w-[100px]">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(exam)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(exam)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>시험지 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              {examToDelete && (
                <>
                  <span className="font-medium">
                    {examToDelete.school_name} ({examToDelete.exam_year}년 {examToDelete.exam_type})
                  </span>
                  을(를) 삭제하시겠습니까?
                  <br />
                  <br />
                  이 작업은 되돌릴 수 없으며, PDF 파일도 함께 삭제됩니다.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
