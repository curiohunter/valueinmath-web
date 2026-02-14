"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { PdfUpload } from "./pdf-upload"
import { createSchoolExam, updateSchoolExam } from "@/lib/school-exam-client"
import { SchoolSelector, type SchoolData } from "@/components/students/SchoolSelector"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import type { SchoolExam, SchoolExamFormData, SchoolType } from "@/types/school-exam"

interface SchoolExamModalProps {
  isOpen: boolean
  onClose: () => void
  exam?: SchoolExam | null
  onSuccess?: () => void
}

export function SchoolExamModal({ isOpen, onClose, exam, onSuccess }: SchoolExamModalProps) {
  const [loading, setLoading] = useState(false)
  const [initialSchool, setInitialSchool] = useState<SchoolData | null>(null)
  const [formData, setFormData] = useState<SchoolExamFormData>({
    school_id: null,
    school_type: "중학교",
    grade: 1,
    semester: 1,
    school_name: "",
    exam_year: new Date().getFullYear(),
    exam_type: "중간고사",
    is_collected: false,
    is_uploaded_to_mathflat: false,
    notes: "",
    pdf_file: undefined,
  })

  // 수정 모드: school_id로 학교 정보 조회
  useEffect(() => {
    async function loadSchool() {
      if (!exam?.school_id) {
        setInitialSchool(null)
        return
      }
      const supabase = getSupabaseBrowserClient()
      const { data } = await supabase
        .from("schools")
        .select("id, name, school_type, province, district")
        .eq("id", exam.school_id)
        .single()
      if (data) {
        setInitialSchool(data as SchoolData)
      }
    }
    if (isOpen && exam?.school_id) {
      loadSchool()
    } else {
      setInitialSchool(null)
    }
  }, [exam?.school_id, isOpen])

  useEffect(() => {
    if (exam) {
      setFormData({
        school_id: exam.school_id,
        school_type: exam.school_type,
        grade: exam.grade,
        semester: exam.semester,
        school_name: exam.school_name,
        exam_year: exam.exam_year,
        exam_type: exam.exam_type,
        is_collected: exam.is_collected,
        is_uploaded_to_mathflat: exam.is_uploaded_to_mathflat,
        notes: exam.notes || "",
        pdf_file: undefined, // 기존 PDF는 유지되며, 새로 선택한 경우에만 교체됨
      })
    } else {
      setFormData({
        school_id: null,
        school_type: "중학교",
        grade: 1,
        semester: 1,
        school_name: "",
        exam_year: new Date().getFullYear(),
        exam_type: "중간고사",
        is_collected: false,
        is_uploaded_to_mathflat: false,
        notes: "",
        pdf_file: undefined,
      })
    }
  }, [exam, isOpen])

  const handleSchoolSelect = (school: SchoolData | null) => {
    if (school) {
      // school_type 매핑: schools 테이블의 "중학교"/"고등학교" → SchoolType
      const schoolType: SchoolType = school.school_type === "고등학교" ? "고등학교" : "중학교"
      setFormData((prev) => ({
        ...prev,
        school_id: school.id,
        school_name: school.name,
        school_type: schoolType,
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        school_id: null,
        school_name: "",
        school_type: "중학교",
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.school_id) {
      toast.error("학교를 선택해주세요")
      return
    }

    // 신규 등록 시 PDF 파일이 필수
    if (!exam && !formData.pdf_file) {
      toast.error("PDF 파일을 선택해주세요")
      return
    }

    setLoading(true)
    try {
      if (exam) {
        // 수정 모드
        await updateSchoolExam(exam.id, formData)
        toast.success("시험지가 수정되었습니다")
      } else {
        // 생성 모드
        await createSchoolExam(formData)
        toast.success("시험지가 등록되었습니다")
      }

      onSuccess?.()
      onClose()
    } catch (error) {
      console.error("Error saving school exam:", error)
      toast.error(exam ? "시험지 수정에 실패했습니다" : "시험지 등록에 실패했습니다")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{exam ? "시험지 수정" : "시험지 등록"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 학교 선택 */}
          <div className="space-y-2">
            <Label>학교 *</Label>
            <SchoolSelector
              initialSchool={initialSchool}
              onSelect={handleSchoolSelect}
            />
          </div>

          {/* 학년 / 학기 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="grade">학년 *</Label>
              <Select
                value={formData.grade.toString()}
                onValueChange={(value) =>
                  setFormData({ ...formData, grade: parseInt(value) as 1 | 2 | 3 })
                }
                disabled={loading}
              >
                <SelectTrigger id="grade">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1학년</SelectItem>
                  <SelectItem value="2">2학년</SelectItem>
                  <SelectItem value="3">3학년</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="semester">학기 *</Label>
              <Select
                value={formData.semester.toString()}
                onValueChange={(value) =>
                  setFormData({ ...formData, semester: parseInt(value) as 1 | 2 })
                }
                disabled={loading}
              >
                <SelectTrigger id="semester">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1학기</SelectItem>
                  <SelectItem value="2">2학기</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 출제연도 / 시험유형 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="exam_year">출제연도 *</Label>
              <Input
                id="exam_year"
                type="number"
                value={formData.exam_year}
                onChange={(e) =>
                  setFormData({ ...formData, exam_year: parseInt(e.target.value) })
                }
                min="2000"
                max="2100"
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="exam_type">시험 유형 *</Label>
              <Select
                value={formData.exam_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, exam_type: value as "중간고사" | "기말고사" })
                }
                disabled={loading}
              >
                <SelectTrigger id="exam_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="중간고사">중간고사</SelectItem>
                  <SelectItem value="기말고사">기말고사</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 수집 여부 / 매쓰플랫 업로드 여부 */}
          <div className="space-y-3">
            <label className="flex items-center space-x-2 cursor-pointer">
              <Checkbox
                checked={formData.is_collected}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_collected: checked as boolean })
                }
                disabled={loading}
              />
              <span className="text-sm font-medium leading-none">
                시험지 수집 완료
              </span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <Checkbox
                checked={formData.is_uploaded_to_mathflat}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_uploaded_to_mathflat: checked as boolean })
                }
                disabled={loading}
              />
              <span className="text-sm font-medium leading-none">
                매쓰플랫 업로드 완료
              </span>
            </label>
          </div>

          {/* PDF 파일 */}
          <div className="space-y-2">
            <Label>
              PDF 파일 {!exam && "*"}
            </Label>
            {exam && exam.pdf_file_path && !formData.pdf_file && (
              <p className="text-sm text-muted-foreground">
                기존 파일: {exam.pdf_file_path.split("_").pop()}
                {exam.pdf_file_size && ` (${(exam.pdf_file_size / 1024 / 1024).toFixed(2)} MB)`}
              </p>
            )}
            <PdfUpload
              value={formData.pdf_file || null}
              onChange={(file) => setFormData({ ...formData, pdf_file: file || undefined })}
              disabled={loading}
            />
            {exam && formData.pdf_file && (
              <p className="text-sm text-muted-foreground">
                새 파일을 선택하면 기존 파일이 교체됩니다
              </p>
            )}
          </div>

          {/* 비고 */}
          <div className="space-y-2">
            <Label htmlFor="notes">비고</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="추가 메모사항..."
              rows={3}
              disabled={loading}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "저장 중..." : exam ? "수정" : "등록"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
