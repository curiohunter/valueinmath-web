import React, { useState, useMemo, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Plus, X } from "lucide-react"

interface Teacher {
  id: string
  name: string
}
interface Student {
  id: string
  name: string
  grade?: number | null
  school_type?: string | null
  status?: string // 재원/퇴원 등
}

interface ClassFormModalProps {
  open: boolean
  onClose: () => void
  teachers: Teacher[]
  students: Student[]
  mode?: "create" | "edit"
  initialData?: {
    id?: string
    name: string
    subject: string
    teacher_id: string
    selectedStudentIds: string[]
  }
}

// 학교+학년 그룹명 생성
function getGroupName(schoolType: string | null | undefined, grade: number | null | undefined) {
  if (!schoolType || !grade) return "기타";
  if (schoolType === "초등학교") return `초${grade}`;
  if (schoolType === "중학교") return `중${grade}`;
  if (schoolType === "고등학교") return `고${grade}`;
  return "기타";
}

export function ClassFormModal({ open, onClose, teachers, students, mode = "create", initialData }: ClassFormModalProps) {
  const safeTeachers = teachers ?? [];
  const enrolledStudents = useMemo(() => (students ?? []).filter(s => s.status && s.status.trim().includes('재원')), [students])

  // 상태: mode/edit 여부에 따라 초기값 세팅
  const [name, setName] = useState("")
  const [subject, setSubject] = useState("수학")
  const [teacherSearch, setTeacherSearch] = useState("")
  const [studentSearch, setStudentSearch] = useState("")
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null)
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(false)

  // edit 모드일 때 초기값 세팅
  useEffect(() => {
    if (open && mode === "edit" && initialData) {
      setName(initialData.name)
      setSubject(initialData.subject)
      const teacher = teachers.find(t => t.id === initialData.teacher_id) || null
      setSelectedTeacher(teacher)
      setSelectedStudents(
        enrolledStudents.filter(s => initialData.selectedStudentIds.includes(s.id))
      )
    } else if (open && mode === "create") {
      setName("")
      setSubject("수학")
      setSelectedTeacher(null)
      setSelectedStudents([])
    }
  }, [open, mode, initialData, teachers, enrolledStudents])

  // 가나다순 정렬 함수
  const sortByName = <T extends { name: string }>(arr: T[]) => [...arr].sort((a, b) => a.name.localeCompare(b.name, 'ko'))

  // 선생님/학생 검색 + 정렬
  const filteredTeachers = useMemo(() =>
    sortByName(safeTeachers.filter(t => t.name.includes(teacherSearch))),
    [safeTeachers, teacherSearch]
  )
  const filteredStudents = useMemo(() =>
    enrolledStudents.filter(s => s.name.includes(studentSearch)),
    [enrolledStudents, studentSearch]
  )

  // 학년 그룹 정렬 함수
  const gradeOrder = (group: string) => {
    if (group.startsWith('초')) return 0 + (parseInt(group.replace('초', ''), 10) || 0)
    if (group.startsWith('중')) return 10 + (parseInt(group.replace('중', ''), 10) || 0)
    if (group.startsWith('고')) return 20 + (parseInt(group.replace('고', ''), 10) || 0)
    return 99
  }

  // 학교+학년별 그룹핑, 그룹명/학생 모두 커스텀 정렬
  const groupedStudents = useMemo(() => {
    const groups: Record<string, Student[]> = {}
    filteredStudents.forEach(s => {
      const group = getGroupName(s.school_type ?? null, s.grade ?? null)
      if (!groups[group]) groups[group] = []
      groups[group].push(s)
    })
    Object.keys(groups).forEach(group => {
      groups[group] = sortByName(groups[group])
    })
    return Object.fromEntries(Object.entries(groups).sort(([a], [b]) => gradeOrder(a) - gradeOrder(b)))
  }, [filteredStudents])

  if (!open) return null

  // 학생 추가/제거
  const addStudent = (s: Student) => {
    if (!selectedStudents.find(stu => stu.id === s.id)) {
      setSelectedStudents([...selectedStudents, s])
    }
  }
  const removeStudent = (id: string) => {
    setSelectedStudents(selectedStudents.filter(s => s.id !== id))
  }

  // 선생님 선택/해제
  const handleSelectTeacher = (t: Teacher) => setSelectedTeacher(t)
  const handleRemoveTeacher = () => setSelectedTeacher(null)

  // 저장/등록
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTeacher) {
      alert("담당 선생님을 선택하세요.")
      return
    }
    setLoading(true)
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    if (mode === "create") {
      // 1. 반 생성
      const { data: newClass, error } = await supabase.from("classes").insert({
        name,
        subject,
        teacher_id: selectedTeacher.id,
      }).select().single()
      if (error) {
        alert("반 생성 실패: " + error.message)
        setLoading(false)
        return
      }
      // 2. 반-학생 매핑 생성
      if (newClass && selectedStudents.length > 0) {
        const inserts = selectedStudents.map(student => ({ class_id: newClass.id, student_id: student.id }))
        await supabase.from("class_students").insert(inserts)
      }
    } else if (mode === "edit" && initialData?.id) {
      // 1. 반 정보 수정
      const { error } = await supabase.from("classes").update({
        name,
        subject,
        teacher_id: selectedTeacher.id,
      }).eq("id", initialData.id)
      if (error) {
        setLoading(false)
        alert("수정 실패: " + error.message)
        return
      }
      // 2. 기존 반-학생 매핑 삭제 후 새로 insert
      await supabase.from("class_students").delete().eq("class_id", initialData.id)
      if (selectedStudents.length > 0) {
        const inserts = selectedStudents.map(student => ({ class_id: initialData.id, student_id: student.id }))
        await supabase.from("class_students").insert(inserts)
      }
    }
    setLoading(false)
    onClose()
    window.location.reload()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow w-full max-w-6xl">
        {/* 헤더 + 반이름/과목 입력 */}
        <div className="flex items-center gap-4 mb-4">
          <h2 className="text-xl font-bold">{mode === "edit" ? "반 정보 수정" : "반 만들기"}</h2>
          <Input className="w-48" placeholder="반 이름" value={name} onChange={e => setName(e.target.value)} required />
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="과목" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="수학">수학</SelectItem>
              <SelectItem value="과학">과학</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4 grid grid-cols-4 gap-4">
            {/* 1. 반 선생님 */}
            <Card className="flex flex-col h-[480px]">
              <CardHeader className="font-semibold text-base">반 선생님</CardHeader>
              <CardContent className="flex-1 flex flex-col overflow-y-auto gap-2">
                <Input placeholder="선생님 이름 검색" value={teacherSearch} onChange={e => setTeacherSearch(e.target.value)} 
                  onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
                />
                <div className="flex-1 border rounded overflow-y-auto bg-gray-50">
                  {filteredTeachers.map(t => (
                    <div key={t.id} className="flex items-center justify-between px-2 py-1 hover:bg-gray-100">
                      <span>{t.name}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="rounded-full border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-400 w-8 h-8"
                        onClick={() => handleSelectTeacher(t)}
                        disabled={!!selectedTeacher && selectedTeacher.id === t.id}
                      >
                        <Plus size={18} />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            {/* 2. 선택된 선생님 */}
            <Card className="flex flex-col h-[480px]">
              <CardHeader className="font-semibold text-base">선택된 선생님</CardHeader>
              <CardContent className="flex flex-col items-start flex-1 justify-start">
                <div className="flex flex-wrap gap-2 w-full">
                  {selectedTeacher ? (
                    <div className="flex items-center px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800">
                      <span className="mr-2">{selectedTeacher.name}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="rounded-full text-red-500 hover:bg-red-100"
                        onClick={handleRemoveTeacher}
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  ) : (
                    <span className="text-gray-400 flex items-center h-full">없음</span>
                  )}
                </div>
              </CardContent>
            </Card>
            {/* 3. 반 학생(재원생, 학교+학년별 아코디언) */}
            <Card className="flex flex-col h-[480px]">
              <CardHeader className="font-semibold text-base">반 학생</CardHeader>
              <CardContent className="flex-1 flex flex-col overflow-y-auto gap-2">
                <Input placeholder="학생 이름 검색" value={studentSearch} onChange={e => setStudentSearch(e.target.value)} 
                  onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
                />
                <div className="flex-1 border rounded overflow-y-auto bg-gray-50">
                  <Accordion type="multiple">
                    {Object.entries(groupedStudents).map(([group, students]) => (
                      <AccordionItem value={group} key={group} className="relative">
                        <div className="flex items-center px-2 py-1">
                          <span className="font-semibold w-12 min-w-12 text-left">{group}</span>
                          <span className="pl-3 text-xs text-muted-foreground w-12 min-w-12 flex-shrink-0 whitespace-nowrap">{students.length}명</span>
                          <div className="flex-1" />
                          <Button
                            size="icon"
                            variant="outline"
                            className="rounded-full border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-400 w-8 h-8"
                            tabIndex={-1}
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedStudents(prev => {
                                const ids = new Set(prev.map(s => s.id));
                                const toAdd = students.filter(s => !ids.has(s.id));
                                return [...prev, ...toAdd];
                              });
                            }}
                          ><Plus size={18} /></Button>
                          <AccordionTrigger className="ml-2" />
                        </div>
                        <AccordionContent>
                          {students.map(s => (
                            <div key={s.id} className="flex items-center justify-between px-6 py-1 hover:bg-gray-100">
                              <span>{s.name}</span>
                              <Button size="icon" variant="outline" className="rounded-full border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-400 w-8 h-8" onClick={() => addStudent(s)} disabled={!!selectedStudents.find(stu => stu.id === s.id)}><Plus size={18} /></Button>
                            </div>
                          ))}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </CardContent>
            </Card>
            {/* 4. 선택된 학생 */}
            <Card className="flex flex-col h-[480px]">
              <CardHeader className="font-semibold text-base">선택된 학생</CardHeader>
              <CardContent className="flex flex-col gap-2 flex-1 overflow-y-auto">
                <div className="font-semibold text-sm text-muted-foreground mb-1">선택된 학생 {selectedStudents.length}명</div>
                <div className="flex flex-wrap gap-2">
                  {selectedStudents.length === 0 ? (
                    <span className="text-gray-400 flex items-center justify-center h-full">없음</span>
                  ) : (
                    selectedStudents.map(s => (
                      <div key={s.id} className="flex items-center px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800">
                        <span className="mr-2">{s.name}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="rounded-full text-red-500 hover:bg-red-100"
                          onClick={() => removeStudent(s.id)}
                        >
                          <X size={16} />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>취소</Button>
            <Button type="submit" variant="default" disabled={loading}>{loading ? (mode === "edit" ? "저장 중..." : "등록 중...") : (mode === "edit" ? "저장" : "등록하기")}</Button>
          </div>
        </form>
      </div>
    </div>
  )
} 