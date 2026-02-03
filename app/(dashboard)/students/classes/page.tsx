"use client"
import { Suspense, useState, useMemo } from "react"
import { ClassesHeader } from "@/components/students/classes/classes-header"
import { ClassesFilters } from "@/components/students/classes/classes-filters"
import { ClassesTable } from "@/components/students/classes/classes-table"
import { PrintClassesTable } from "@/components/students/classes/print-classes-table"
import { PrintScheduleGrid } from "@/components/students/classes/PrintScheduleGrid"
import { WeeklyScheduleGridV2 } from "@/components/students/classes/schedule-grid"
import { Card, CardContent } from "@/components/ui/card"
import { ClassFormModal } from "@/components/students/classes/class-form-modal"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useEffect, useState as useClientState } from "react"
import { createClient } from "@/lib/supabase/client"
import ReactDOM from "react-dom/client"
import type { Database } from "@/types/database"
import { Users, UserCheck, UserX, ChevronDown, ChevronUp, TableIcon, CalendarDays } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export default function ClassesPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editClass, setEditClass] = useState<any | null>(null)
  const [classes, setClasses] = useClientState<any[]>([])
  const [teachers, setTeachers] = useClientState<any[]>([])
  const [students, setStudents] = useClientState<any[]>([])
  const [classStudents, setClassStudents] = useClientState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [teacherFilter, setTeacherFilter] = useState<string[]>([])
  const [subjectFilter, setSubjectFilter] = useState("all")
  const [studentSearch, setStudentSearch] = useState("")
  const [viewMode, setViewMode] = useState<"table" | "schedule">("table")

  // 데이터 로드 함수
  const loadData = async () => {
    setLoading(true)
    const supabase = createClient()
    
    const [classesRes, teachersRes, studentsRes, classStudentsRes, schedulesRes] = await Promise.all([
      supabase.from("classes").select("*, monthly_fee").eq("is_active", true).order("teacher_id", { ascending: true }).order("name", { ascending: true }),
      supabase.from("employees")
        .select("id, name, position, status")
        .in("position", ["원장", "강사"])
        .eq("status", "재직")
        .order("name", { ascending: true }),
      supabase.from("students").select("id, name, status, school_type, grade").eq("is_active", true).order("name", { ascending: true }),
      supabase.from("class_students").select("class_id, student_id"),
      supabase.from("class_schedules").select("*")
    ])
    // 시간표를 classes에 매핑
    const classesWithSchedules = (classesRes.data ?? []).map(cls => ({
      ...cls,
      schedules: (schedulesRes.data ?? [])
        .filter(s => s.class_id === cls.id)
        .sort((a, b) => {
          const dayOrder = { '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6, '일': 7 }
          return (dayOrder[a.day_of_week as keyof typeof dayOrder] || 7) - (dayOrder[b.day_of_week as keyof typeof dayOrder] || 7)
        })
    }))

    setClasses(classesWithSchedules)
    setTeachers(teachersRes.data ?? [])
    setStudents(studentsRes.data ?? [])
    setClassStudents(classStudentsRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  // 반별 학생 수 매핑 (재원 상태인 학생만 카운트)
  const studentsCountMap = classStudents.reduce((acc: Record<string, number>, cs: any) => {
    const student = students.find(s => s.id === cs.student_id)
    // 재원 상태인 학생만 카운트
    if (student && student.status === '재원') {
      acc[cs.class_id] = (acc[cs.class_id] || 0) + 1
    }
    return acc
  }, {})

  // 반별 학생 정보 매핑 (재원 상태인 학생만, 학교급+학년 포함)
  const studentNamesMap = classStudents.reduce((acc: Record<string, string[]>, cs: any) => {
    const student = students.find(s => s.id === cs.student_id)
    // 재원 상태인 학생만 포함
    if (student && student.status === '재원') {
      if (!acc[cs.class_id]) {
        acc[cs.class_id] = []
      }
      // 학교급 약어 매핑
      const schoolTypeMap: Record<string, string> = {
        '초등학교': '초',
        '중학교': '중',
        '고등학교': '고'
      }
      const schoolAbbr = schoolTypeMap[student.school_type] || ''
      const gradeStr = student.grade ? `${student.grade}` : ''
      const displayName = schoolAbbr && gradeStr
        ? `${student.name}(${schoolAbbr}${gradeStr})`
        : student.name
      acc[cs.class_id].push(displayName)
    }
    return acc
  }, {})

  // 미배정 학생 펼침 상태
  const [isUnassignedExpanded, setIsUnassignedExpanded] = useState(false)

  // 재원생 현황 계산
  const enrollmentStats = useMemo(() => {
    // 재원생만 필터링
    const activeStudents = students.filter(s => s.status === '재원')

    // 반에 등록된 학생 ID 집합
    const enrolledStudentIds = new Set(
      classStudents
        .filter(cs => {
          const student = students.find(s => s.id === cs.student_id)
          return student && student.status === '재원'
        })
        .map(cs => cs.student_id)
    )

    // 미등록 학생 (재원생이지만 반에 등록되지 않은 학생)
    const unassignedStudents = activeStudents.filter(s => !enrolledStudentIds.has(s.id))

    return {
      totalActive: activeStudents.length,
      enrolled: enrolledStudentIds.size,
      unassigned: unassignedStudents.length,
      unassignedList: unassignedStudents
    }
  }, [students, classStudents])

  // 학생 검색어로 해당 학생이 속한 반 ID 집합 생성
  const classIdsWithSearchedStudent = useMemo(() => {
    if (!studentSearch.trim()) return null

    const searchTerm = studentSearch.trim().toLowerCase()
    const matchingStudentIds = students
      .filter(s => s.name.toLowerCase().includes(searchTerm))
      .map(s => s.id)

    if (matchingStudentIds.length === 0) return new Set<string>()

    const classIds = new Set<string>()
    classStudents.forEach(cs => {
      if (matchingStudentIds.includes(cs.student_id)) {
        classIds.add(cs.class_id)
      }
    })
    return classIds
  }, [studentSearch, students, classStudents])

  // 담당 선생님/과목/학생검색 필터 적용 및 정렬
  let filteredClasses = classes;
  if (teacherFilter.length > 0) {
    filteredClasses = filteredClasses.filter((c: any) => teacherFilter.includes(c.teacher_id))
  }
  if (subjectFilter !== "all") {
    if (subjectFilter === "regular") {
      // 정규전체: 수학, 과학
      filteredClasses = filteredClasses.filter((c: any) => c.subject === "수학" || c.subject === "과학")
    } else if (subjectFilter === "special") {
      // 특강전체: 수학특강, 과학특강
      filteredClasses = filteredClasses.filter((c: any) => c.subject === "수학특강" || c.subject === "과학특강")
    } else {
      // 개별 과목 필터
      filteredClasses = filteredClasses.filter((c: any) => c.subject === subjectFilter)
    }
  }
  // 학생 검색 필터
  if (classIdsWithSearchedStudent !== null) {
    filteredClasses = filteredClasses.filter((c: any) => classIdsWithSearchedStudent.has(c.id))
  }
  
  // 선생님별로 그룹화하여 정렬
  const sortedClasses = [...filteredClasses].sort((a: any, b: any) => {
    // 먼저 선생님 이름으로 정렬
    const teacherA = teachers.find(t => t.id === a.teacher_id)?.name || 'ㅎ'
    const teacherB = teachers.find(t => t.id === b.teacher_id)?.name || 'ㅎ'
    
    if (teacherA !== teacherB) {
      return teacherA.localeCompare(teacherB)
    }
    
    // 같은 선생님이면 반 이름으로 정렬
    return a.name.localeCompare(b.name)
  })


  // 수정 기능: 수정 모달 오픈 (상세에서 바로)
  const handleEdit = (classData: any) => {
    setEditClass(classData)
  }

  // 수정 모달에서 저장 후 닫기
  const handleEditClose = () => {
    setEditClass(null)
    loadData() // 전체 새로고침 대신 데이터만 다시 로드
  }

  // 반 삭제 기능 (Soft Delete - 이력 보존)
  const handleDeleteClass = async (classId: string) => {
    const supabase = createClient()

    try {
      // Soft Delete: is_active = false로 변경
      // - class_enrollments_history에 'class_closed' 이벤트가 트리거로 자동 기록됨
      // - 기존 학생 데이터, 학원비, 학습일지 등 모든 데이터 보존
      const { error: classError } = await supabase
        .from("classes")
        .update({
          is_active: false,
          closed_at: new Date().toISOString(),
          closed_reason: 'manual_close'
        })
        .eq("id", classId)

      if (classError) {
        console.error("반 비활성화 오류:", classError)
        const { toast } = await import("sonner")
        toast.error("반 비활성화 중 오류가 발생했습니다.")
        throw classError
      }

      // 성공 메시지 (sonner toast 사용)
      const { toast } = await import("sonner")
      toast.success("반이 비활성화되었습니다. 모든 이력이 보존됩니다.")

      // 데이터 새로고침
      loadData()
    } catch (error: any) {
      console.error("반 비활성화 중 오류:", error)
      const { toast } = await import("sonner")
      toast.error("반 비활성화 중 오류가 발생했습니다.")
    }
  }

  // 인쇄 기능
  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      const isScheduleView = viewMode === "schedule"
      const title = isScheduleView ? "주간 시간표" : "반 목록 인쇄"

      // HTML 구조 생성
      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="ko">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title}</title>
          <style>
            @media print {
              body {
                margin: 0;
                padding: 20px;
                font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
              }
              .print-container {
                width: 100%;
                max-width: 210mm;
                margin: 0 auto;
              }
              .page-break {
                page-break-before: always;
              }
              .avoid-break {
                page-break-inside: avoid;
              }
            }
            body {
              font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .print-container {
              padding: 20px;
              background: white;
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #333;
            }
            .header h1 {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .header .date {
              color: #666;
              font-size: 14px;
            }
            .teacher-section {
              margin-bottom: 40px;
            }
            .teacher-header {
              background-color: #f0f4f8;
              padding: 10px;
              margin-bottom: 20px;
              font-weight: bold;
              font-size: 16px;
              border-left: 4px solid #3b82f6;
            }
            .class-section {
              margin-bottom: 30px;
              padding: 15px;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
            }
            .class-title {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 10px;
              color: #1f2937;
            }
            .class-info {
              display: flex;
              gap: 20px;
              margin-bottom: 15px;
              font-size: 14px;
              color: #4b5563;
            }
            .student-list {
              margin-top: 10px;
            }
            .student-list-title {
              font-weight: bold;
              margin-bottom: 8px;
              font-size: 14px;
            }
            .student-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 8px;
              font-size: 13px;
            }
            .student-item {
              padding: 4px 8px;
              background-color: #f9fafb;
              border-radius: 4px;
            }
            .summary {
              margin-top: 40px;
              padding: 20px;
              background-color: #f0f9ff;
              border: 2px solid #3b82f6;
              border-radius: 8px;
            }
            .summary h2 {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 15px;
              color: #1e40af;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
            }
            .summary-item {
              text-align: center;
            }
            .summary-label {
              font-size: 12px;
              color: #6b7280;
              margin-bottom: 4px;
            }
            .summary-value {
              font-size: 20px;
              font-weight: bold;
              color: #1f2937;
            }
          </style>
        </head>
        <body>
          <div id="print-root"></div>
        </body>
        </html>
      `)
      printWindow.document.close()

      // React 컴포넌트를 새 창에 렌더링
      const container = printWindow.document.getElementById('print-root')
      if (container) {
        const root = ReactDOM.createRoot(container)

        if (isScheduleView) {
          // 시간표 뷰 인쇄
          root.render(
            <PrintScheduleGrid
              classes={sortedClasses}
              teachers={teachers}
              studentsCountMap={studentsCountMap}
              currentDate={new Date()}
            />
          )
        } else {
          // 반 목록 인쇄
          root.render(
            <PrintClassesTable
              classes={sortedClasses}
              teachers={teachers}
              students={students}
              classStudents={classStudents}
              currentDate={new Date()}
            />
          )
        }

        // 렌더링 완료 후 인쇄
        setTimeout(() => {
          printWindow.focus()
          printWindow.print()
        }, 500)
      }
    }
  }

  return (
    <div className="space-y-6">
      <ClassesHeader />

      {/* 재원생 현황 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 전체 재원생 */}
        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-slate-600 text-white">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">전체 재원생</p>
                <p className="text-2xl font-bold text-slate-800">{enrollmentStats.totalActive}<span className="text-sm font-normal text-slate-500 ml-1">명</span></p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 반 배정 완료 */}
        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-500 text-white">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-emerald-600 font-medium">반 배정 완료</p>
                <p className="text-2xl font-bold text-emerald-700">{enrollmentStats.enrolled}<span className="text-sm font-normal text-emerald-500 ml-1">명</span></p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 반 미배정 */}
        <Card className={cn(
          "border transition-all duration-200",
          enrollmentStats.unassigned > 0
            ? "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300 cursor-pointer hover:shadow-md"
            : "bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200"
        )}
          onClick={() => enrollmentStats.unassigned > 0 && setIsUnassignedExpanded(!isUnassignedExpanded)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2.5 rounded-lg text-white",
                  enrollmentStats.unassigned > 0 ? "bg-amber-500" : "bg-gray-400"
                )}>
                  <UserX className="h-5 w-5" />
                </div>
                <div>
                  <p className={cn(
                    "text-xs font-medium",
                    enrollmentStats.unassigned > 0 ? "text-amber-600" : "text-gray-500"
                  )}>반 미배정</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    enrollmentStats.unassigned > 0 ? "text-amber-700" : "text-gray-500"
                  )}>
                    {enrollmentStats.unassigned}
                    <span className={cn(
                      "text-sm font-normal ml-1",
                      enrollmentStats.unassigned > 0 ? "text-amber-500" : "text-gray-400"
                    )}>명</span>
                  </p>
                </div>
              </div>
              {enrollmentStats.unassigned > 0 && (
                <div className="text-amber-500">
                  {isUnassignedExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 미배정 학생 목록 (펼침) */}
      {isUnassignedExpanded && enrollmentStats.unassigned > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <UserX className="h-4 w-4 text-amber-600" />
              <h3 className="text-sm font-semibold text-amber-800">반 미배정 학생 목록</h3>
              <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 text-xs">
                {enrollmentStats.unassigned}명
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {enrollmentStats.unassignedList.map(student => {
                const schoolTypeMap: Record<string, string> = {
                  '초등학교': '초',
                  '중학교': '중',
                  '고등학교': '고'
                }
                const schoolAbbr = schoolTypeMap[student.school_type] || ''
                const gradeStr = student.grade ? `${student.grade}` : ''
                const displayInfo = schoolAbbr && gradeStr ? `${schoolAbbr}${gradeStr}` : null

                return (
                  <Badge
                    key={student.id}
                    variant="secondary"
                    className="bg-white border border-amber-200 text-amber-800 hover:bg-amber-100 transition-colors px-3 py-1.5 text-sm font-medium"
                  >
                    {student.name}
                    {displayInfo && (
                      <span className="ml-1 text-amber-500 font-normal">({displayInfo})</span>
                    )}
                  </Badge>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100">
          <ClassesFilters
            teachers={teachers}
            onOpen={() => setModalOpen(true)}
            onPrint={handlePrint}
            teacherFilter={teacherFilter}
            setTeacherFilter={setTeacherFilter}
            subjectFilter={subjectFilter}
            setSubjectFilter={setSubjectFilter}
            studentSearch={studentSearch}
            setStudentSearch={setStudentSearch}
          />
          <div className="pr-4">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "table" | "schedule")}>
              <TabsList className="grid grid-cols-2 h-9">
                <TabsTrigger value="table" className="flex items-center gap-1.5 text-xs px-3">
                  <TableIcon className="h-3.5 w-3.5" />
                  반 목록
                </TabsTrigger>
                <TabsTrigger value="schedule" className="flex items-center gap-1.5 text-xs px-3">
                  <CalendarDays className="h-3.5 w-3.5" />
                  시간표
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
        <CardContent className="p-0">
          <Suspense fallback={<div>로딩 중...</div>}>
            {viewMode === "table" ? (
              <ClassesTable
                classes={sortedClasses}
                teachers={teachers}
                students={students}
                studentsCountMap={studentsCountMap}
                studentNamesMap={studentNamesMap}
                onDetail={handleEdit}
                onDelete={handleDeleteClass}
              />
            ) : (
              <div className="p-4">
                <WeeklyScheduleGridV2
                  classes={sortedClasses}
                  teachers={teachers}
                  studentsCountMap={studentsCountMap}
                  onClassClick={handleEdit}
                />
              </div>
            )}
          </Suspense>
        </CardContent>
      </Card>
      <ClassFormModal open={modalOpen} onClose={() => {
        setModalOpen(false)
        loadData() // 새 반 추가 후 데이터 새로고침
      }} teachers={teachers} students={students} />
      {/* 수정 모달: editClass가 있으면 */}
      <ClassFormModal
        open={!!editClass}
        onClose={handleEditClose}
        teachers={teachers}
        students={students}
        mode="edit"
        initialData={editClass ? {
          id: editClass.id,
          name: editClass.name,
          subject: editClass.subject,
          teacher_id: editClass.teacher_id,
          monthly_fee: editClass.monthly_fee,
          selectedStudentIds: classStudents.filter(cs => cs.class_id === editClass.id).map(cs => cs.student_id)
        } : undefined}
      />
    </div>
  )
} 