import React, { useState, useMemo, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/types/database"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Plus, X, Clock, ChevronDown, ChevronUp } from "lucide-react"

interface Teacher {
  id: string
  name: string
}
interface Student {
  id: string
  name: string
  grade?: number | null
  school_type?: string | null
  status?: string
}

interface Schedule {
  day_of_week: '월' | '화' | '수' | '목' | '금' | '토'
  start_time: string
  end_time: string
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
    monthly_fee?: number
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

// 요일 순서 정의
const DAY_ORDER: Record<string, number> = { '월': 0, '화': 1, '수': 2, '목': 3, '금': 4, '토': 5, '일': 6 }

export function ClassFormModal({ open, onClose, teachers, students, mode = "create", initialData }: ClassFormModalProps) {
  const safeTeachers = teachers ?? [];
  const enrolledStudents = useMemo(() => (students ?? []).filter(s => s.status && s.status.trim().includes('재원')), [students])

  // 상태
  const [name, setName] = useState("")
  const [subject, setSubject] = useState("수학")
  const [monthlyFee, setMonthlyFee] = useState("")
  const [teacherSearch, setTeacherSearch] = useState("")
  const [studentSearch, setStudentSearch] = useState("")
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null)
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(false)

  // 시간표 Collapsible 상태
  const [isTimetableOpen, setIsTimetableOpen] = useState(true)

  // edit 모드일 때 초기값 세팅
  useEffect(() => {
    if (open && mode === "edit" && initialData) {
      setName(initialData.name)
      setSubject(initialData.subject)
      setMonthlyFee(initialData.monthly_fee?.toString() || "")
      const teacher = teachers.find(t => t.id === initialData.teacher_id) || null
      setSelectedTeacher(teacher)
      setSelectedStudents(
        enrolledStudents.filter(s => initialData.selectedStudentIds.includes(s.id))
      )

      // Fetch existing schedules for this class
      const fetchSchedules = async () => {
        const supabase = createClient<Database>()
        const { data, error } = await supabase
          .from("class_schedules")
          .select("day_of_week, start_time, end_time")
          .eq("class_id", initialData.id!)
          .order("day_of_week")

        if (!error && data) {
          const formattedSchedules: Schedule[] = data.map(s => ({
            day_of_week: s.day_of_week as Schedule['day_of_week'],
            start_time: s.start_time.substring(0, 5),
            end_time: s.end_time.substring(0, 5),
          }))
          setSchedules(formattedSchedules)
          // 기존 시간표가 있으면 접힌 상태로 시작
          if (formattedSchedules.length > 0) {
            setIsTimetableOpen(false)
          }
        }
      }
      fetchSchedules()
    } else if (open && mode === "create") {
      setName("")
      setSubject("수학")
      setMonthlyFee("")
      setSelectedTeacher(null)
      setSelectedStudents([])
      setSchedules([])
      setIsTimetableOpen(true) // 새 반 생성시 펼쳐진 상태로 시작
    }
  }, [open, mode, initialData, teachers, enrolledStudents])

  // 시간표 요약 텍스트 생성
  const timetableSummary = useMemo(() => {
    if (schedules.length === 0) return ""

    // 요일별로 그룹화
    const grouped: Record<string, string[]> = {}
    schedules.forEach(s => {
      if (!grouped[s.day_of_week]) {
        grouped[s.day_of_week] = []
      }
      grouped[s.day_of_week].push(s.start_time)
    })

    // 요일 순서대로 정렬 후 포맷
    const sortedDays = Object.keys(grouped).sort((a, b) => DAY_ORDER[a] - DAY_ORDER[b])
    const parts = sortedDays.map(day => {
      const times = grouped[day].sort().join(', ')
      return `${day} ${times}`
    })

    return parts.join(' · ')
  }, [schedules])

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

  // 학교+학년별 그룹핑
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

  // 시간표 관리
  const days: Array<'월' | '화' | '수' | '목' | '금' | '토'> = ['월', '화', '수', '목', '금', '토']
  const toggleDay = (day: typeof days[number]) => {
    const exists = schedules.find(s => s.day_of_week === day)
    if (exists) {
      setSchedules(schedules.filter(s => s.day_of_week !== day))
    } else {
      setSchedules([...schedules, { day_of_week: day, start_time: "19:00", end_time: "21:00" }])
    }
  }
  const updateScheduleTime = (day: typeof days[number], field: 'start_time' | 'end_time', value: string) => {
    setSchedules(schedules.map(s =>
      s.day_of_week === day ? { ...s, [field]: value } : s
    ))
  }

  // 저장/등록
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTeacher) {
      toast.error("담당 선생님을 선택하세요.")
      return
    }
    setLoading(true)
    const supabase = createClient<Database>()
    const parsedFee = parseInt(monthlyFee.replace(/[^0-9]/g, '')) || 0

    if (mode === "create") {
      const { data: newClass, error } = await supabase.from("classes").insert({
        name,
        subject,
        teacher_id: selectedTeacher.id,
        monthly_fee: parsedFee,
      }).select().single()
      if (error) {
        toast.error("반 생성 실패: " + error.message)
        setLoading(false)
        return
      }
      if (newClass && selectedStudents.length > 0) {
        const inserts = selectedStudents.map(student => ({ class_id: newClass.id, student_id: student.id }))
        await supabase.from("class_students").insert(inserts)
      }
      if (newClass && schedules.length > 0) {
        const scheduleInserts = schedules.map(s => ({
          class_id: newClass.id,
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
        }))
        await supabase.from("class_schedules").insert(scheduleInserts)
      }
    } else if (mode === "edit" && initialData?.id) {
      const { error } = await supabase.from("classes").update({
        name,
        subject,
        teacher_id: selectedTeacher.id,
        monthly_fee: parsedFee,
      }).eq("id", initialData.id)
      if (error) {
        setLoading(false)
        toast.error("수정 실패: " + error.message)
        return
      }

      const currentStudentIds = new Set(selectedStudents.map(s => s.id))
      const originalStudentIds = new Set(initialData.selectedStudentIds)

      const studentsToAdd = selectedStudents.filter(s => !originalStudentIds.has(s.id))
      const studentsToRemove = initialData.selectedStudentIds.filter(id => !currentStudentIds.has(id))

      if (studentsToRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from("class_students")
          .delete()
          .eq("class_id", initialData.id)
          .in("student_id", studentsToRemove)
        if (deleteError) {
          console.error('class_students 삭제 오류:', deleteError)
        }
      }

      if (studentsToAdd.length > 0) {
        const inserts = studentsToAdd.map(student => ({ class_id: initialData.id, student_id: student.id }))
        const { error: insertError } = await supabase.from("class_students").insert(inserts)
        if (insertError) {
          console.error('class_students 추가 오류:', insertError)
        }
      }

      await supabase.from("class_schedules").delete().eq("class_id", initialData.id)

      if (schedules.length > 0) {
        const scheduleInserts = schedules.map(s => ({
          class_id: initialData.id,
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
        }))
        await supabase.from("class_schedules").insert(scheduleInserts)
      }
    }
    setLoading(false)
    toast.success(mode === "edit" ? "반 정보가 성공적으로 수정되었습니다!" : "새로운 반이 성공적으로 생성되었습니다!")
    onClose()
  }

  // 금액 포맷팅
  const formatCurrency = (value: string) => {
    const number = value.replace(/[^0-9]/g, '')
    if (number) {
      return new Intl.NumberFormat('ko-KR').format(parseInt(number))
    }
    return ''
  }

  const handleMonthlyFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value)
    setMonthlyFee(formatted)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* 헤더 - 제목만 */}
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {mode === "edit" ? "반 정보 수정" : "새 반 만들기"}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* 본문 - 스크롤 영역 */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
            {/* 1. 기본 정보 섹션 */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  반 이름 <span className="text-red-500">*</span>
                </label>
                <Input
                  className="w-full h-10"
                  placeholder="예: 고1 수학반 A"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  과목 <span className="text-red-500">*</span>
                </label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="과목 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="수학">수학</SelectItem>
                    <SelectItem value="과학">과학</SelectItem>
                    <SelectItem value="수학특강">수학특강</SelectItem>
                    <SelectItem value="과학특강">과학특강</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  월 수강료 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    className="w-full h-10 pr-8"
                    placeholder="0"
                    value={monthlyFee}
                    onChange={handleMonthlyFeeChange}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    원
                  </span>
                </div>
              </div>
            </div>

            {/* 2. 시간표 Collapsible 섹션 */}
            <Collapsible open={isTimetableOpen} onOpenChange={setIsTimetableOpen}>
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">시간표</span>
                  <span className="text-xs text-gray-500">
                    {timetableSummary || "시간표를 선택해 주세요"}
                  </span>
                </div>
                {isTimetableOpen ? (
                  <ChevronUp className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                )}
              </CollapsibleTrigger>

              <CollapsibleContent className="mt-2 rounded-lg border border-gray-200 px-4 py-4 bg-white">
                <div className="grid grid-cols-6 gap-3">
                  {days.map(day => {
                    const schedule = schedules.find(s => s.day_of_week === day)
                    const isSelected = !!schedule
                    return (
                      <div key={day} className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {day}
                        </button>
                        {isSelected && (
                          <div className="space-y-2">
                            <Input
                              type="time"
                              value={schedule.start_time}
                              onChange={e => updateScheduleTime(day, 'start_time', e.target.value)}
                              className="h-8 text-xs"
                            />
                            <Input
                              type="time"
                              value={schedule.end_time}
                              onChange={e => updateScheduleTime(day, 'end_time', e.target.value)}
                              className="h-8 text-xs"
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* 3. 선생님/학생 선택 섹션 - 4컬럼 */}
            <div className="grid grid-cols-4 gap-4 min-h-[320px] flex-1">
              {/* 1. 담당 선생님 */}
              <div className="flex flex-col">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">담당 선생님</h3>
                <div className="flex flex-col gap-2 flex-1 bg-gray-50 rounded-xl p-3">
                  <Input
                    placeholder="선생님 검색..."
                    value={teacherSearch}
                    onChange={e => setTeacherSearch(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
                    className="h-9"
                  />
                  <div className="flex-1 space-y-1 overflow-y-auto">
                    {filteredTeachers.map(t => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between px-2 py-1.5 hover:bg-white rounded-lg transition-colors"
                      >
                        <span className="text-sm font-medium text-gray-700">{t.name}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 rounded-full hover:bg-blue-100"
                          onClick={() => handleSelectTeacher(t)}
                          disabled={!!selectedTeacher && selectedTeacher.id === t.id}
                        >
                          <Plus size={14} className="text-blue-600" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. 선택된 선생님 */}
              <div className="flex flex-col">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">선택된 선생님</h3>
                <div className="flex-1 bg-gray-50 rounded-xl p-3">
                  {selectedTeacher ? (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                      <span>{selectedTeacher.name}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-4 w-4 p-0 rounded-full hover:bg-blue-200"
                        onClick={handleRemoveTeacher}
                      >
                        <X size={12} />
                      </Button>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">선택된 선생님이 없습니다</span>
                  )}
                </div>
              </div>

              {/* 3. 학생 선택 */}
              <div className="flex flex-col">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">학생 선택</h3>
                <div className="flex flex-col gap-2 flex-1 bg-gray-50 rounded-xl p-3">
                  <Input
                    placeholder="학생 검색..."
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
                    className="h-9"
                  />
                  <div className="flex-1 overflow-y-auto">
                    <Accordion type="multiple" className="space-y-1">
                      {Object.entries(groupedStudents).map(([group, students]) => (
                        <AccordionItem
                          value={group}
                          key={group}
                          className="bg-white rounded-lg border-0"
                        >
                          <div className="flex items-center px-2 py-1.5">
                            <AccordionTrigger className="flex-1 hover:no-underline py-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{group}</span>
                                <span className="text-xs text-gray-500">{students.length}명</span>
                              </div>
                            </AccordionTrigger>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 rounded-full hover:bg-blue-100 ml-1"
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                setSelectedStudents(prev => {
                                  const ids = new Set(prev.map(s => s.id));
                                  const toAdd = students.filter(s => !ids.has(s.id));
                                  return [...prev, ...toAdd];
                                });
                              }}
                            >
                              <Plus size={14} className="text-blue-600" />
                            </Button>
                          </div>
                          <AccordionContent className="px-2 pb-2 pt-0">
                            <div className="space-y-0.5">
                              {students.map(s => (
                                <div
                                  key={s.id}
                                  className="flex items-center justify-between px-2 py-1 hover:bg-gray-50 rounded transition-colors"
                                >
                                  <span className="text-sm text-gray-700">{s.name}</span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 rounded-full hover:bg-blue-100"
                                    onClick={() => addStudent(s)}
                                    disabled={!!selectedStudents.find(stu => stu.id === s.id)}
                                    type="button"
                                  >
                                    <Plus size={14} className="text-blue-600" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                </div>
              </div>

              {/* 4. 선택된 학생 */}
              <div className="flex flex-col">
                <div className="flex flex-col flex-1 rounded-xl border border-gray-200 overflow-hidden">
                  {/* Sticky 헤더 */}
                  <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-gray-50 px-3 py-2">
                    <h3 className="text-sm font-semibold text-gray-900">선택된 학생</h3>
                    <span className="text-sm font-medium text-blue-600">{selectedStudents.length}명</span>
                  </div>
                  {/* 학생 목록 */}
                  <div className="flex-1 overflow-y-auto p-3 bg-white">
                    {selectedStudents.length === 0 ? (
                      <span className="text-sm text-gray-400">선택된 학생이 없습니다</span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {selectedStudents.map(s => (
                          <div
                            key={s.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-medium"
                          >
                            <span>{s.name}</span>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-4 w-4 p-0 rounded-full hover:bg-blue-200"
                              onClick={() => removeStudent(s.id)}
                            >
                              <X size={12} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 하단 버튼 - 고정 Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="px-6"
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="px-6 bg-black text-white hover:bg-gray-800"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {mode === "edit" ? "저장 중..." : "생성 중..."}
                </div>
              ) : (
                mode === "edit" ? "저장하기" : "반 만들기"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
