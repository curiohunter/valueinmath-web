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
import { createSchoolExamScores, updateSchoolExamScore, getActiveStudents } from "@/lib/school-exam-score-client"
import { getSchoolExams } from "@/lib/school-exam-client"
import { SchoolSelector, type SchoolData } from "@/components/students/SchoolSelector"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import type { SchoolExamScoreFormData, SchoolExamScore } from "@/types/school-exam-score"
import type { SchoolExam } from "@/types/school-exam"

interface SchoolExamScoreModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  editingScore?: SchoolExamScore | null
}

interface ScoreItem {
  subject: string
  score: string
}

export function SchoolExamScoreModal({ isOpen, onClose, onSuccess, editingScore }: SchoolExamScoreModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [students, setStudents] = useState<Array<{ id: string; name: string; status: string; school_id: string | null; school_name: string | null; school_grade: number | null }>>([])
  const [availableExams, setAvailableExams] = useState<SchoolExam[]>([])
  const [studentSearchOpen, setStudentSearchOpen] = useState(false)
  const [studentSearchValue, setStudentSearchValue] = useState("")
  const [initialSchool, setInitialSchool] = useState<SchoolData | null>(null)

  // Form state
  const [studentId, setStudentId] = useState("")
  const [schoolId, setSchoolId] = useState("")
  const [grade, setGrade] = useState<"1" | "2" | "3">("1")
  const [semester, setSemester] = useState<"1" | "2">("1")
  const [examYear, setExamYear] = useState(new Date().getFullYear().toString())
  const [examType, setExamType] = useState<"중간고사" | "기말고사">("중간고사")
  const [schoolExamId, setSchoolExamId] = useState<string>("none")
  const [scores, setScores] = useState<ScoreItem[]>([{ subject: "", score: "" }])
  const [notes, setNotes] = useState("")

  // Load students on mount
  useEffect(() => {
    async function loadStudents() {
      try {
        const studentsData = await getActiveStudents()
        setStudents(studentsData)
      } catch {
        // silently fail - will show empty list
      }
    }
    if (isOpen) {
      loadStudents()
    }
  }, [isOpen])

  // 수정 모드: school_id로 학교 정보 조회
  useEffect(() => {
    async function loadSchool() {
      if (!editingScore?.school_id) {
        setInitialSchool(null)
        return
      }
      const supabase = getSupabaseBrowserClient()
      const { data } = await supabase
        .from("schools")
        .select("id, name, school_type, province, district")
        .eq("id", editingScore.school_id)
        .single()
      if (data) {
        setInitialSchool(data as SchoolData)
      }
    }
    if (isOpen && editingScore?.school_id) {
      loadSchool()
    } else if (isOpen && !editingScore) {
      setInitialSchool(null)
    }
  }, [editingScore?.school_id, isOpen])

  // Load matching school exams when exam info changes
  useEffect(() => {
    async function loadMatchingExams() {
      if (!schoolId || !examYear) {
        setAvailableExams([])
        return
      }

      try {
        // initialSchool이 현재 schoolId와 일치하면 이름 사용, 아니면 빈 검색
        const schoolName = initialSchool?.id === schoolId ? initialSchool.name : ""
        const { data } = await getSchoolExams(1, 100, {
          search: schoolName,
        })
        // 클라이언트 필터로 정확한 매칭
        const filtered = data.filter(exam =>
          exam.school_id === schoolId &&
          exam.exam_year === parseInt(examYear) &&
          exam.semester === parseInt(semester) &&
          exam.exam_type === examType &&
          exam.grade === parseInt(grade)
        )
        setAvailableExams(filtered)
      } catch {
        setAvailableExams([])
      }
    }
    loadMatchingExams()
  }, [schoolId, initialSchool, examYear, semester, examType, grade])

  // Initialize form when editingScore changes
  useEffect(() => {
    if (editingScore && isOpen) {
      // Edit mode: populate form with existing data
      setStudentId(editingScore.student_id)
      setSchoolId(editingScore.school_id || "")
      setGrade(editingScore.grade.toString() as "1" | "2" | "3")
      setSemester(editingScore.semester.toString() as "1" | "2")
      setExamYear(editingScore.exam_year.toString())
      setExamType(editingScore.exam_type)
      setSchoolExamId(editingScore.school_exam_id || "none")
      setScores([{ subject: editingScore.subject, score: editingScore.score?.toString() || "" }])
      setNotes(editingScore.notes || "")
    } else if (!editingScore && isOpen) {
      // Create mode: reset to defaults (will be handled by handleClose)
    }
  }, [editingScore, isOpen])

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
    if (!schoolId) {
      toast.error("학교를 선택해주세요")
      return
    }
    if (scores.some((s) => !s.subject)) {
      toast.error("모든 과목명을 입력해주세요")
      return
    }

    setIsSubmitting(true)
    try {
      if (editingScore) {
        // Edit mode: update single score
        const updateData = {
          school_id: schoolId,
          grade: parseInt(grade) as 1 | 2 | 3,
          semester: parseInt(semester) as 1 | 2,
          exam_year: parseInt(examYear),
          exam_type: examType,
          school_exam_id: schoolExamId === "none" ? null : schoolExamId,
          subject: scores[0].subject,
          score: scores[0].score ? parseFloat(scores[0].score) : null,
          notes,
        }
        await updateSchoolExamScore(editingScore.id, updateData)
        toast.success("성적이 수정되었습니다")
      } else {
        // Create mode: create multiple scores
        const formData: SchoolExamScoreFormData = {
          student_id: studentId,
          school_id: schoolId,
          grade: parseInt(grade) as 1 | 2 | 3,
          semester: parseInt(semester) as 1 | 2,
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
      }
      onSuccess()
      handleClose()
    } catch (error: any) {
      const errorMessage = error?.message || `성적 ${editingScore ? "수정" : "등록"}에 실패했습니다`
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    // Reset form
    setStudentId("")
    setStudentSearchValue("")
    setSchoolId("")
    setInitialSchool(null)
    setGrade("1")
    setSemester("1")
    setExamYear(new Date().getFullYear().toString())
    setExamType("중간고사")
    setSchoolExamId("none")
    setScores([{ subject: "", score: "" }])
    setNotes("")
    onClose()
  }

  // 학생 선택 시 학교/학년 자동 설정
  const handleStudentSelect = async (student: typeof students[0]) => {
    setStudentId(student.id)
    setStudentSearchOpen(false)
    setStudentSearchValue("")

    // 학생의 현재 학교 정보가 있으면 자동 설정
    if (student.school_id) {
      setSchoolId(student.school_id)
      // SchoolSelector에 전달할 initialSchool 로드
      const supabase = getSupabaseBrowserClient()
      const { data } = await supabase
        .from("schools")
        .select("id, name, school_type, province, district")
        .eq("id", student.school_id)
        .single()
      if (data) {
        setInitialSchool(data as SchoolData)
      }
    }
    if (student.school_grade) {
      setGrade(student.school_grade.toString() as "1" | "2" | "3")
    }
  }

  // SchoolSelector 콜백
  const handleSchoolSelect = (school: SchoolData | null) => {
    if (school) {
      setSchoolId(school.id)
      setInitialSchool(school)
    } else {
      setSchoolId("")
      setInitialSchool(null)
    }
  }

  const selectedStudent = students.find((s) => s.id === studentId)

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingScore ? "학교 시험 성적 수정" : "학교 시험 성적 등록"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 학생 선택 (검색 가능) */}
          <div className="space-y-2">
            <Label>학생 *</Label>
            <Popover open={studentSearchOpen} onOpenChange={setStudentSearchOpen} modal={true}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={studentSearchOpen}
                  className="w-full justify-between"
                  disabled={!!editingScore}
                >
                  {selectedStudent
                    ? `${selectedStudent.name} (${selectedStudent.school_name || "학교 미등록"} ${selectedStudent.school_grade || "?"}학년)`
                    : "학생 선택..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0 pointer-events-auto" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="학생 이름 검색..."
                    value={studentSearchValue}
                    onValueChange={setStudentSearchValue}
                  />
                  <CommandList>
                    <CommandEmpty>검색 결과가 없습니다</CommandEmpty>
                    <CommandGroup>
                      {students
                        .filter((student) =>
                          student.name.toLowerCase().includes(studentSearchValue.toLowerCase())
                        )
                        .map((student) => (
                          <CommandItem
                            key={student.id}
                            value={student.id}
                            onSelect={() => handleStudentSelect(student)}
                            className="cursor-pointer"
                          >
                            <Check
                              className={cn("mr-2 h-4 w-4", studentId === student.id ? "opacity-100" : "opacity-0")}
                            />
                            {student.name} ({student.school_name || "학교 미등록"} {student.school_grade || "?"}학년) - {student.status}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* 학교 선택 */}
          <div className="space-y-2">
            <Label>학교 *</Label>
            <SchoolSelector
              initialSchool={initialSchool}
              onSelect={handleSchoolSelect}
            />
          </div>

          {/* 시험 정보 */}
          <div className="grid grid-cols-2 gap-4">
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
              {isSubmitting ? `${editingScore ? "수정" : "등록"} 중...` : editingScore ? "수정" : "등록"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
