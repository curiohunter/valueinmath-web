"use client"

import { useState, useMemo } from "react"
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
import { FileText, Edit2, Trash2, Eye } from "lucide-react"
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
import { deleteSchoolExamScore } from "@/lib/school-exam-score-client"
import { getPDFDownloadUrl } from "@/lib/school-exam-client"
import type { SchoolExamScore } from "@/types/school-exam-score"

interface SchoolExamScoreTableProps {
  scores: SchoolExamScore[]
  onDelete: () => void
  onEdit: (score: SchoolExamScore) => void
}

export function SchoolExamScoreTable({ scores, onDelete, onEdit }: SchoolExamScoreTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [scoreToDelete, setScoreToDelete] = useState<SchoolExamScore | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  // 정렬된 성적 목록
  const sortedScores = useMemo(() => {
    return [...scores].sort((a, b) => {
      // 1. 연도 내림차순 (최근 연도가 위로)
      if (a.exam_year !== b.exam_year) {
        return b.exam_year - a.exam_year
      }
      // 2. 학기 내림차순 (2학기가 위로)
      if (a.semester !== b.semester) {
        return b.semester - a.semester
      }
      // 3. 시험 유형 (기말이 위로)
      if (a.exam_type !== b.exam_type) {
        return a.exam_type === "기말고사" ? -1 : 1
      }
      // 4. 학교 유형 (고등학교가 위로)
      if (a.school_type !== b.school_type) {
        return a.school_type === "고등학교" ? -1 : 1
      }
      return 0
    })
  }, [scores])

  const handleDeleteClick = (score: SchoolExamScore) => {
    setScoreToDelete(score)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!scoreToDelete) return

    setIsDeleting(true)
    try {
      await deleteSchoolExamScore(scoreToDelete.id)
      toast.success("성적이 삭제되었습니다")
      setDeleteDialogOpen(false)
      setScoreToDelete(null)
      onDelete()
    } catch (error) {
      console.error("Error deleting score:", error)
      toast.error("성적 삭제에 실패했습니다")
    } finally {
      setIsDeleting(false)
    }
  }

  const handlePreviewPDF = async (score: SchoolExamScore) => {
    if (!score.school_exam?.pdf_file_path) {
      toast.error("PDF 파일이 없습니다")
      return
    }

    setDownloadingId(score.id)
    try {
      const url = await getPDFDownloadUrl(score.school_exam.pdf_file_path)
      window.open(url, '_blank')
      toast.success("새 탭에서 PDF를 열었습니다")
    } catch (error) {
      console.error("Error previewing PDF:", error)
      toast.error("PDF 미리보기에 실패했습니다")
    } finally {
      setDownloadingId(null)
    }
  }

  const getScoreColor = (score: number | null) => {
    if (score === null) return ""
    if (score >= 90) return "text-green-600 font-semibold"
    if (score >= 80) return "text-blue-600 font-semibold"
    if (score >= 70) return "text-yellow-600 font-semibold"
    if (score >= 60) return "text-orange-600 font-semibold"
    return "text-red-600 font-semibold"
  }

  if (scores.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center text-muted-foreground">
        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">등록된 성적이 없습니다</p>
        <p className="text-sm mt-2">상단의 "성적 등록" 버튼을 눌러 성적을 추가하세요</p>
      </div>
    )
  }

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">학생명</TableHead>
              <TableHead className="w-[150px]">학교명</TableHead>
              <TableHead className="w-[60px]">학년</TableHead>
              <TableHead className="w-[60px]">연도</TableHead>
              <TableHead className="w-[60px]">학기</TableHead>
              <TableHead className="w-[80px]">시험</TableHead>
              <TableHead className="w-[100px]">과목</TableHead>
              <TableHead className="w-[80px] text-center">점수</TableHead>
              <TableHead className="w-[60px] text-center">시험지</TableHead>
              <TableHead className="w-[100px] text-center">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedScores.map((score) => (
              <TableRow key={score.id}>
                <TableCell className="w-[100px] font-medium">
                  {score.student?.name}
                </TableCell>
                <TableCell className="w-[150px]">
                  <div className="truncate" title={score.school_name}>
                    {score.school_name}
                  </div>
                </TableCell>
                <TableCell className="w-[60px]">{score.grade}학년</TableCell>
                <TableCell className="w-[60px] text-gray-600">{score.exam_year}</TableCell>
                <TableCell className="w-[60px]">{score.semester}학기</TableCell>
                <TableCell className="w-[80px]">
                  <Badge
                    className={
                      score.exam_type === "중간고사"
                        ? "bg-cyan-100 text-cyan-800 hover:bg-cyan-200"
                        : "bg-orange-100 text-orange-800 hover:bg-orange-200"
                    }
                  >
                    {score.exam_type}
                  </Badge>
                </TableCell>
                <TableCell className="w-[100px]">{score.subject}</TableCell>
                <TableCell className={`w-[80px] text-center ${getScoreColor(score.score)}`}>
                  {score.score !== null ? score.score : "-"}
                </TableCell>
                <TableCell className="w-[60px]">
                  <div className="flex items-center justify-center">
                    {score.school_exam?.pdf_file_path ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreviewPDF(score)}
                        disabled={downloadingId === score.id}
                        className="h-8 w-8 p-0"
                        title="시험지 보기"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="w-[100px]">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(score)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(score)}
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
            <AlertDialogTitle>성적 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              {scoreToDelete && (
                <>
                  <span className="font-medium">
                    {scoreToDelete.student?.name} - {scoreToDelete.subject} ({scoreToDelete.score})
                  </span>
                  을(를) 삭제하시겠습니까?
                  <br />
                  <br />
                  이 작업은 되돌릴 수 없습니다.
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
