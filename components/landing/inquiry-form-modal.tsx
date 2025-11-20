"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"

interface InquiryFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InquiryFormModal({ open, onOpenChange }: InquiryFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    parent_phone: "",
    school_type: undefined as string | undefined,
    grade: undefined as number | undefined,
    notes: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 필수 필드 검증
    if (!formData.name.trim()) {
      toast.error("학생 이름을 입력해주세요.")
      return
    }

    if (!formData.parent_phone.trim()) {
      toast.error("학부모 연락처를 입력해주세요.")
      return
    }

    setIsSubmitting(true)

    try {
      const supabase = createClient()

      // 전화번호에서 하이픈 제거 (숫자만 남김)
      const cleanedPhone = formData.parent_phone.replace(/[^0-9]/g, '')

      // 전화번호 형식 검증 (11자리 숫자)
      const phoneRegex = /^01[0-9]{9}$/
      if (!phoneRegex.test(cleanedPhone)) {
        toast.error('올바른 전화번호 형식이 아닙니다. (예: 010-1234-5678)')
        setIsSubmitting(false)
        return
      }

      // 오늘 날짜 (KST)
      const today = new Date()
      const kstDate = new Date(today.getTime() + (9 * 60 * 60 * 1000))
        .toISOString()
        .split('T')[0]

      const insertData = {
        name: formData.name,
        parent_phone: cleanedPhone,
        school_type: formData.school_type || null,
        grade: formData.grade || null,
        notes: formData.notes || null,
        status: '신규상담' as const,
        lead_source: '홈페이지' as const,
        created_by_type: 'self_service' as const,
        first_contact_date: kstDate,
      }

      const { error } = await supabase
        .from('students')
        .insert(insertData)

      if (error) {
        console.error('상담 신청 오류:', error)
        throw new Error(`상담 신청 실패: ${error.message}`)
      }

      toast.success("상담 신청이 완료되었습니다. 곧 연락드리겠습니다.", {
        duration: 5000,
      })

      // 폼 초기화 및 모달 닫기
      setFormData({
        name: "",
        parent_phone: "",
        school_type: undefined,
        grade: undefined,
        notes: "",
      })
      onOpenChange(false)
    } catch (error) {
      console.error(error)
      toast.error(
        error instanceof Error
          ? error.message
          : "상담 신청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
      )
    } finally {
      setIsSubmitting(false)
    }
  }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>무료 상담 신청</DialogTitle>
          <DialogDescription>
            간단한 정보를 입력하시면 빠르게 상담해드리겠습니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* 학생 이름 (필수) */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              학생 이름 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="홍길동"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* 학부모 연락처 (필수) */}
          <div className="space-y-2">
            <Label htmlFor="parent_phone" className="text-sm font-medium">
              학부모 연락처 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="parent_phone"
              type="tel"
              value={formData.parent_phone}
              onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
              placeholder="01012345678"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* 학년 (선택) */}
          <div className="space-y-2">
            <Label htmlFor="grade" className="text-sm font-medium">
              학년 (선택)
            </Label>
            <Select
              value={formData.school_type && formData.grade ? `${formData.school_type}-${formData.grade}` : undefined}
              onValueChange={(value) => {
                if (value) {
                  const [school_type, grade] = value.split('-')
                  setFormData({ ...formData, school_type, grade: parseInt(grade) })
                } else {
                  setFormData({ ...formData, school_type: undefined, grade: undefined })
                }
              }}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="학년을 선택해주세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="초등학교-1">초등 1학년</SelectItem>
                <SelectItem value="초등학교-2">초등 2학년</SelectItem>
                <SelectItem value="초등학교-3">초등 3학년</SelectItem>
                <SelectItem value="초등학교-4">초등 4학년</SelectItem>
                <SelectItem value="초등학교-5">초등 5학년</SelectItem>
                <SelectItem value="초등학교-6">초등 6학년</SelectItem>
                <SelectItem value="중학교-1">중등 1학년</SelectItem>
                <SelectItem value="중학교-2">중등 2학년</SelectItem>
                <SelectItem value="중학교-3">중등 3학년</SelectItem>
                <SelectItem value="고등학교-1">고등 1학년</SelectItem>
                <SelectItem value="고등학교-2">고등 2학년</SelectItem>
                <SelectItem value="고등학교-3">고등 3학년</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 간단한 문의사항 (선택) */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              간단한 문의사항 (선택)
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="진도상황, 문의사항 간단히 적어주세요. (최대 200자)"
              maxLength={200}
              rows={3}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground text-right">
              {formData.notes.length} / 200자
            </p>
          </div>

          {/* 제출 버튼 */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  신청 중...
                </>
              ) : (
                "상담 신청"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
