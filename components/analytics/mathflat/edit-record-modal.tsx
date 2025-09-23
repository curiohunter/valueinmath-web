"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { MathflatRecord, MathflatType } from "@/lib/mathflat/types"

interface EditRecordModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record: MathflatRecord
  studentOptions: Array<{id: string, name: string}>
  onSave: (record: Partial<MathflatRecord>) => void
}

export function EditRecordModal({ open, onOpenChange, record, studentOptions, onSave }: EditRecordModalProps) {
  const [formData, setFormData] = useState({
    studentId: record.student_id,
    studentName: record.student_name,
    date: record.event_date,
    mathflatType: record.mathflat_type,
    bookTitle: record.book_title,
    correctCount: record.correct_count,
    wrongCount: record.wrong_count
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // 모달이 열릴 때마다 기존 데이터로 초기화
    setFormData({
      studentId: record.student_id,
      studentName: record.student_name,
      date: record.event_date,
      mathflatType: record.mathflat_type,
      bookTitle: record.book_title,
      correctCount: record.correct_count,
      wrongCount: record.wrong_count
    })
  }, [record])

  const handleSubmit = async () => {
    setLoading(true)

    // 정답률 계산
    const totalProblems = formData.correctCount + formData.wrongCount
    const correctRate = totalProblems > 0 ? Math.round((formData.correctCount / totalProblems) * 100) : 0

    await onSave({
      event_date: formData.date,
      mathflat_type: formData.mathflatType,
      book_title: formData.bookTitle,
      problem_solved: totalProblems,
      correct_count: formData.correctCount,
      wrong_count: formData.wrongCount,
      correct_rate: correctRate
    })
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>학습기록 수정</DialogTitle>
          <DialogDescription>
            매쓰플랫 학습 기록을 수정합니다
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="student" className="text-right">
              학생
            </Label>
            <div className="col-span-3 px-3 py-2 border rounded bg-gray-50">
              {record.student_name || '알 수 없음'}
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right">
              날짜
            </Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="mathflatType" className="text-right">
              유형
            </Label>
            <Select
              value={formData.mathflatType}
              onValueChange={(value) => setFormData({...formData, mathflatType: value as MathflatType})}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="교재">교재</SelectItem>
                <SelectItem value="학습지">학습지</SelectItem>
                <SelectItem value="챌린지">챌린지</SelectItem>
                <SelectItem value="챌린지오답">챌린지오답</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="bookTitle" className="text-right">
              교재명
            </Label>
            <Input
              id="bookTitle"
              type="text"
              value={formData.bookTitle}
              onChange={(e) => setFormData({...formData, bookTitle: e.target.value})}
              className="col-span-3"
              placeholder="교재명 입력"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="correct" className="text-right">
              정답 수
            </Label>
            <Input
              id="correct"
              type="number"
              value={formData.correctCount}
              onChange={(e) => setFormData({...formData, correctCount: parseInt(e.target.value) || 0})}
              className="col-span-3"
              min="0"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="wrong" className="text-right">
              오답 수
            </Label>
            <Input
              id="wrong"
              type="number"
              value={formData.wrongCount}
              onChange={(e) => setFormData({...formData, wrongCount: parseInt(e.target.value) || 0})}
              className="col-span-3"
              min="0"
            />
          </div>

          {/* 정답률 자동 계산 표시 */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">정답률</Label>
            <div className="col-span-3 text-sm font-medium">
              {formData.correctCount + formData.wrongCount > 0
                ? `${Math.round((formData.correctCount / (formData.correctCount + formData.wrongCount)) * 100)}%`
                : '0%'
              }
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "수정 중..." : "수정"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}