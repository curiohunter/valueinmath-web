"use client"

import { useState, useEffect } from "react"
import { FileText, Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import type { ReportTableRow } from "@/types/reports"

export interface BulkGenerateResult {
  studentId: string
  studentName: string
  status: "pending" | "generating" | "success" | "failed"
  error?: string
}

interface BulkGenerateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  students: ReportTableRow[]
  onGenerate: (studentId: string) => Promise<{ reportId?: string }>
  onComplete?: (results: BulkGenerateResult[]) => void
}

export function BulkGenerateDialog({
  open,
  onOpenChange,
  students,
  onGenerate,
  onComplete
}: BulkGenerateDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [results, setResults] = useState<BulkGenerateResult[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  
  // 모달이 열릴 때마다 상태 초기화
  useEffect(() => {
    if (open) {
      setResults([])
      setCurrentIndex(0)
      setIsGenerating(false)
    }
  }, [open])

  // 미생성 학생만 필터
  const ungeneratedStudents = students.filter(s => !s.reportId)
  const totalCount = ungeneratedStudents.length
  
  // 진행률 계산 - currentIndex가 totalCount를 초과하지 않도록 보호
  const safeCurrentIndex = Math.min(currentIndex, totalCount)
  const progress = totalCount > 0 ? (safeCurrentIndex / totalCount) * 100 : 0

  // 성공/실패 카운트
  const successCount = results.filter(r => r.status === "success").length
  const failedCount = results.filter(r => r.status === "failed").length

  // 전체 생성 시작
  const handleStartGeneration = async () => {
    setIsGenerating(true)
    setCurrentIndex(0)
    
    // 초기 결과 배열 생성
    const initialResults: BulkGenerateResult[] = ungeneratedStudents.map(student => ({
      studentId: student.studentId,
      studentName: student.studentName,
      status: "pending" as const
    }))
    setResults(initialResults)

    // 순차적으로 처리
    for (let i = 0; i < ungeneratedStudents.length; i++) {
      const student = ungeneratedStudents[i]
      setCurrentIndex(i + 1)

      // 현재 학생 상태를 generating으로 업데이트
      setResults(prev => prev.map((r, idx) => 
        idx === i ? { ...r, status: "generating" as const } : r
      ))

      try {
        // 보고서 생성 API 호출
        const result = await onGenerate(student.studentId)

        // 성공 상태로 업데이트
        setResults(prev => prev.map((r, idx) => 
          idx === i ? { ...r, status: "success" as const } : r
        ))
      } catch (error) {
        // 실패 상태로 업데이트
        setResults(prev => prev.map((r, idx) => 
          idx === i ? { 
            ...r, 
            status: "failed" as const,
            error: error instanceof Error ? error.message : "알 수 없는 오류"
          } : r
        ))
      }

      // 각 요청 사이에 짧은 딜레이 (서버 부하 방지)
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    setIsGenerating(false)
  }

  // 완료 핸들러
  const handleClose = () => {
    if (onComplete && results.length > 0) {
      onComplete(results)
    }
    onOpenChange(false)
    // 상태 초기화
    setTimeout(() => {
      setResults([])
      setCurrentIndex(0)
    }, 300)
  }

  const getStatusIcon = (status: BulkGenerateResult["status"]) => {
    switch (status) {
      case "pending":
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />
      case "generating":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />
    }
  }

  const getStatusBadge = (status: BulkGenerateResult["status"]) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline">대기중</Badge>
      case "generating":
        return <Badge variant="secondary">생성중</Badge>
      case "success":
        return <Badge className="bg-green-500 text-white">완료</Badge>
      case "failed":
        return <Badge variant="destructive">실패</Badge>
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            보고서 일괄 생성
          </DialogTitle>
          <DialogDescription>
            {!isGenerating && results.length === 0 ? (
              `선택된 필터 조건에서 ${totalCount}명의 학생 보고서를 생성합니다.`
            ) : isGenerating ? (
              `보고서를 생성하는 중입니다... (${currentIndex}/${totalCount})`
            ) : (
              `보고서 생성이 완료되었습니다. (성공: ${successCount}, 실패: ${failedCount})`
            )}
          </DialogDescription>
        </DialogHeader>

        {results.length > 0 && (
          <>
            {/* 진행률 표시 */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>진행률</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* 결과 목록 */}
            <ScrollArea className="h-[300px] rounded-md border p-4">
              <div className="space-y-2">
                {results.map((result, idx) => (
                  <div
                    key={result.studentId}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/30"
                  >
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.status)}
                      <span className="text-sm font-medium">
                        {result.studentName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(result.status)}
                      {result.error && (
                        <span className="text-xs text-muted-foreground">
                          {result.error}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter>
          {!isGenerating && results.length === 0 ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                취소
              </Button>
              <Button onClick={handleStartGeneration} disabled={totalCount === 0}>
                <FileText className="h-4 w-4 mr-2" />
                생성 시작 ({totalCount}명)
              </Button>
            </>
          ) : isGenerating ? (
            <Button disabled>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              생성 중...
            </Button>
          ) : (
            <Button onClick={handleClose}>
              닫기
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}