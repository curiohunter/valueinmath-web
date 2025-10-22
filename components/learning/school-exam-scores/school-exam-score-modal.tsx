"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Check, ChevronsUpDown, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { createSchoolExamScores, getActiveStudents } from "@/lib/school-exam-score-client"
import { getSchoolExams } from "@/lib/school-exam-client"
import type { SchoolExamScoreFormData } from "@/types/school-exam-score"
import type { SchoolExam } from "@/types/school-exam"

interface SchoolExamScoreModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface ScoreItem {
  subject: string
  score: string
}

export function SchoolExamScoreModal({ isOpen, onClose, onSuccess }: SchoolExamScoreModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [students, setStudents] = useState<Array<{ id: string; name: string; grade: number; status: string; school: string }>>([])
  const [availableExams, setAvailableExams] = useState<SchoolExam[]>([])
  const [studentSearchOpen, setStudentSearchOpen] = useState(false)
  const [studentSearchValue, setStudentSearchValue] = useState("")

  // Form state
  const [studentId, setStudentId] = useState("")
  const [schoolType, setSchoolType] = useState<"중학교" | "고등학교">("중학교")
  const [grade, setGrade] = useState<"1" | "2" | "3">("1")
  const [semester, setSemester] = useState<"1" | "2">("1")
  const [schoolName, setSchoolName] = useState("")
  const [examYear, setExamYear] = useState(new Date().getFullYear().toString())
  const [examType, setExamType] = useState<"중간고사" | "기말고사">("중간고사")
  const [schoolExamId, setSchoolExamId] = useState<string>("none")
  const [scores, setScores] = useState<ScoreItem[]>([{ subject: "", score: "" }])
  const [notes, setNotes] = useState("")

  // Load students on mount
  useEffect(() => {
    async function loadStudents() {
      try {
        const data = await getActiveStudents()
        setStudents(data)
      } catch (error) {
        console.error("Error loading students:", error)
      }
    }
    if (isOpen) {
      loadStudents()
    }
  }, [isOpen])

  // Load matching school exams when exam info changes
  useEffect(() => {
    async function loadMatchingExams() {
      if (!schoolName || !examYear) {
        setAvailableExams([])
        return
      }

      try {
        const { data } = await getSchoolExams(1, 100, {
          school_name: schoolName,
          exam_year: examYear,
          semester: semester,
          exam_type: examType,
          school_type: schoolType,
          grade: grade,
        })
        setAvailableExams(data)
      } catch (error) {
        console.error("Error loading exams:", error)
        setAvailableExams([])
      }
    }
    loadMatchingExams()
  }, [schoolName, examYear, semester, examType, schoolType, grade])

  const handleAddScore = () => {
    setScores([...scores, { subject: "", score: "" }])
  }

  const handleRemoveScore = (index: number) => {
    if (scores.length === 1) return
    setScores(scores.filter((_, i) => i !== index))
  }

  const handleScoreChange = (index: number, field: "subject" | "score", value: string) => {
    const newScores = [...scores]
    newScores[index][field] = value
    setScores(newScores)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!studentId) {
      toast.error("학생을 선택해주세요")
      return
    }
    if (!schoolName) {
      toast.error("학교명을 입력해주세요")
      return
    }
    if (scores.some((s) => !s.subject)) {
      toast.error("모든 과목명을 입력해주세요")
      return
    }

    setIsSubmitting(true)
    try {
      const formData: SchoolExamScoreFormData = {
        student_id: studentId,
        school_type: schoolType,
        grade: parseInt(grade) as 1 | 2 | 3,
        semester: parseInt(semester) as 1 | 2,
        school_name: schoolName,
        exam_year: parseInt(examYear),
        exam_type: examType,
        school_exam_id: schoolExamId === "none" ? null : schoolExamId,
        scores: scores.map((s) => ({
          subject: s.subject,
          score: s.score ? parseFloat(s.score) : null,
        })),
        notes,
      }

      await createSchoolExamScores(formData)
      toast.success("성적이 등록되었습니다")
      onSuccess()
      handleClose()
    } catch (error) {
      console.error("Error creating scores:", error)
      toast.error("성적 등록에 실패했습니다")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    // Reset form
    setStudentId("")
    setStudentSearchValue("")
    setSchoolType("중학교")
    setGrade("1")
    setSemester("1")
    setSchoolName("")
    setExamYear(new Date().getFullYear().toString())
    setExamType("중간고사")
    setSchoolExamId("none")
    setScores([{ subject: "", score: "" }])
    setNotes("")
    onClose()
  }

  const selectedStudent = students.find((s) => s.id === studentId)

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>학교 시험 성적 등록</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 학생 선택 (검색 가능) */}
          <div className="space-y-2">
            <Label>학생 *</Label>
            <Popover open={studentSearchOpen} onOpenChange={setStudentSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={studentSearchOpen}
                  className="w-full justify-between"
                >
                  {selectedStudent
                    ? `${selectedStudent.name} (${selectedStudent.school.replace(/학교$/, "")}${selectedStudent.grade})`
                    : "학생 선택..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="학생 이름 검색..."
                    value={studentSearchValue}
                    onValueChange={setStudentSearchValue}
                  />
                  <CommandList
                    className="max-h-[300px] overflow-y-auto scroll-smooth"
                    onWheel={(e) => {
                      e.stopPropagation()
                    }}
                  >
                    <CommandEmpty>검색 결과가 없습니다</CommandEmpty>
                    <CommandGroup>
                      {students
                        .filter((student) => {
                          return student.name.toLowerCase().includes(studentSearchValue.toLowerCase())
                        })
                        .map((student) => (
                          <CommandItem
                            key={student.id}
                            value={student.name}
                            onSelect={() => {
                              setStudentId(student.id)
                              setStudentSearchOpen(false)
                              setStudentSearchValue("")
                            }}
                          >
                            <Check
                              className={cn("mr-2 h-4 w-4", studentId === student.id ? "opacity-100" : "opacity-0")}
                            />
                            {student.name} ({student.school.replace(/학교$/, "")}{student.grade}) - {student.status}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* 시험 정보 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="school_type">학교 타입 *</Label>
              <Select value={schoolType} onValueChange={(value: "중학교" | "고등학교") => setSchoolType(value)}>
                <SelectTrigger id="school_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="중학교">중학교</SelectItem>
                  <SelectItem value="고등학교">고등학교</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="grade">학년 *</Label>
              <Select value={grade} onValueChange={(value: "1" | "2" | "3") => setGrade(value)}>
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
              <Select value={semester} onValueChange={(value: "1" | "2") => setSemester(value)}>
                <SelectTrigger id="semester">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1학기</SelectItem>
                  <SelectItem value="2">2학기</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="exam_year">출제연도 *</Label>
              <Input
                id="exam_year"
                type="number"
                value={examYear}
                onChange={(e) => setExamYear(e.target.value)}
                placeholder="2025"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="school_name">학교명 *</Label>
              <Input
                id="school_name"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="OO중학교"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="exam_type">시험 유형 *</Label>
              <Select value={examType} onValueChange={(value: "중간고사" | "기말고사") => setExamType(value)}>
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

          {/* 시험지 연결 (선택사항) */}
          {availableExams.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="school_exam_id">시험지 연결 (선택사항)</Label>
              <Select value={schoolExamId} onValueChange={setSchoolExamId}>
                <SelectTrigger id="school_exam_id">
                  <SelectValue placeholder="시험지 선택..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">연결 안 함</SelectItem>
                  {availableExams.map((exam) => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.school_name} - {exam.exam_year}년 {exam.grade}학년 {exam.semester}학기 {exam.exam_type}
                      {exam.pdf_file_path && " (PDF 있음)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 과목별 점수 입력 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>과목별 점수 *</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddScore}>
                <Plus className="w-4 h-4 mr-2" />
                과목 추가
              </Button>
            </div>

            <div className="space-y-2">
              {scores.map((score, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={score.subject}
                    onChange={(e) => handleScoreChange(index, "subject", e.target.value)}
                    placeholder="과목명 (예: 공통수학1, 공통수학2, 통합과학 등)"
                    className="flex-1"
                    required
                  />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={score.score}
                    onChange={(e) => handleScoreChange(index, "score", e.target.value)}
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder="점수 (소수점 가능)"
                    className="w-40"
                  />
                  {scores.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveScore(index)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 비고 */}
          <div className="space-y-2">
            <Label htmlFor="notes">비고</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "등록 중..." : "등록"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
