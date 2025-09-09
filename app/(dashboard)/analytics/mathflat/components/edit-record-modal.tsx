"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface EditRecordModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record: {
    id: string
    student_id: string
    date: string
    category: string
    problems_solved: number
    accuracy_rate: number
    student?: {
      name: string
    }
  }
  studentOptions: Array<{id: string, name: string}>
  onSave: (record: any) => void
}

export function EditRecordModal({ open, onOpenChange, record, studentOptions, onSave }: EditRecordModalProps) {
  const [formData, setFormData] = useState({
    studentId: record.student_id,
    date: record.date,
    category: record.category,
    problemsSolved: record.problems_solved,
    accuracyRate: record.accuracy_rate
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // 모달이 열릴 때마다 기존 데이터로 초기화
    setFormData({
      studentId: record.student_id,
      date: record.date,
      category: record.category,
      problemsSolved: record.problems_solved,
      accuracyRate: record.accuracy_rate
    })
  }, [record])

  const handleSubmit = async () => {
    setLoading(true)
    await onSave({
      date: formData.date,
      category: formData.category,
      problems_solved: formData.problemsSolved,
      accuracy_rate: formData.accuracyRate
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
              {record.student?.name || '알 수 없음'}
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
            <Label htmlFor="category" className="text-right">
              카테고리
            </Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({...formData, category: value})}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="학습지">학습지</SelectItem>
                <SelectItem value="교재">교재</SelectItem>
                <SelectItem value="오답/심화">오답/심화</SelectItem>
                <SelectItem value="챌린지">챌린지</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="problems" className="text-right">
              문제 수
            </Label>
            <Input
              id="problems"
              type="number"
              value={formData.problemsSolved}
              onChange={(e) => setFormData({...formData, problemsSolved: parseInt(e.target.value) || 0})}
              className="col-span-3"
              min="0"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="accuracy" className="text-right">
              정답률 (%)
            </Label>
            <Input
              id="accuracy"
              type="number"
              value={formData.accuracyRate}
              onChange={(e) => setFormData({...formData, accuracyRate: Math.min(100, Math.max(0, parseInt(e.target.value) || 0))})}
              className="col-span-3"
              min="0"
              max="100"
            />
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