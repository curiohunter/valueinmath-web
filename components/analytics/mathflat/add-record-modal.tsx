"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface AddRecordModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studentOptions: Array<{id: string, name: string}>
  onSuccess: () => void
}

export function AddRecordModal({ open, onOpenChange, studentOptions, onSuccess }: AddRecordModalProps) {
  const [formData, setFormData] = useState({
    studentId: "",
    date: new Date().toISOString().split('T')[0],
    category: "학습지",
    problemsSolved: 0,
    accuracyRate: 100
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
      const { data, error } = await supabase
        .from('mathflat_records')
        .insert({
          student_id: formData.studentId,
          date: formData.date,
          category: formData.category,
          problems_solved: formData.problemsSolved,
          accuracy_rate: formData.accuracyRate
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
          date: new Date().toISOString().split('T')[0],
          category: "학습지",
          problemsSolved: 0,
          accuracyRate: 100
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
            {loading ? "추가 중..." : "추가"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}