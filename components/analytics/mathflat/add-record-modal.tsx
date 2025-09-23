"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { MathflatType } from "@/lib/mathflat/types"

interface AddRecordModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studentOptions: Array<{id: string, name: string}>
  onSuccess: () => void
}

export function AddRecordModal({ open, onOpenChange, studentOptions, onSuccess }: AddRecordModalProps) {
  const [formData, setFormData] = useState({
    studentId: "",
    studentName: "",
    date: new Date().toISOString().split('T')[0],
    mathflatType: "학습지" as MathflatType,
    bookTitle: "",
    problemSolved: 0,
    correctCount: 0,
    wrongCount: 0
  })
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleSubmit = async () => {
    try {
      if (!formData.studentId) {
        toast.error("학생을 선택해주세요")
        return
      }

      setLoading(true)

      // 학생 이름 가져오기
      const selectedStudent = studentOptions.find(s => s.id === formData.studentId)
      const studentName = selectedStudent?.name || ''

      // 정답률 계산
      const totalProblems = formData.correctCount + formData.wrongCount
      const correctRate = totalProblems > 0 ? Math.round((formData.correctCount / totalProblems) * 100) : 0

      const { data, error } = await supabase
        .from('mathflat_records')
        .insert({
          student_id: formData.studentId,
          student_name: studentName,
          event_date: formData.date,
          mathflat_type: formData.mathflatType,
          book_title: formData.bookTitle,
          problem_solved: totalProblems,
          correct_count: formData.correctCount,
          wrong_count: formData.wrongCount,
          correct_rate: correctRate
        })

      if (error) {
        console.error('Error saving record:', error)
        toast.error("기록 저장에 실패했습니다")
      } else {
        toast.success("학습 기록이 추가되었습니다")
        onOpenChange(false)
        // 폼 초기화
        setFormData({
          studentId: "",
          studentName: "",
          date: new Date().toISOString().split('T')[0],
          mathflatType: "학습지" as MathflatType,
          bookTitle: "",
          problemSolved: 0,
          correctCount: 0,
          wrongCount: 0
        })
        onSuccess() // 부모 컴포넌트의 데이터 새로고침
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error("오류가 발생했습니다")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>학습기록 추가</DialogTitle>
          <DialogDescription>
            매쓰플랫 학습 기록을 수동으로 추가합니다
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="student" className="text-right">
              학생
            </Label>
            <Select
              value={formData.studentId}
              onValueChange={(value) => setFormData({...formData, studentId: value})}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="학생 선택" />
              </SelectTrigger>
              <SelectContent>
                {studentOptions.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            {loading ? "추가 중..." : "추가"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}