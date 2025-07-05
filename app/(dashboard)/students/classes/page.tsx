"use client"
import { Suspense, useState } from "react"
import { ClassesHeader } from "@/app/(dashboard)/students/classes/classes-header"
import { ClassesFilters } from "@/app/(dashboard)/students/classes/classes-filters"
import { ClassesTable } from "@/app/(dashboard)/students/classes/classes-table"
import { Card, CardContent } from "@/components/ui/card"
import { ClassFormModal } from "@/app/(dashboard)/students/classes/class-form-modal"
import { useEffect, useState as useClientState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/types/database"

export default function ClassesPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editClass, setEditClass] = useState<any | null>(null)
  const [classes, setClasses] = useClientState<any[]>([])
  const [teachers, setTeachers] = useClientState<any[]>([])
  const [students, setStudents] = useClientState<any[]>([])
  const [classStudents, setClassStudents] = useClientState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [teacherFilter, setTeacherFilter] = useState("all")
  const [subjectFilter, setSubjectFilter] = useState("all")

  // 데이터 로드 함수
  const loadData = async () => {
    setLoading(true)
    const supabase = createClientComponentClient<Database>()
    
    const [classesRes, teachersRes, studentsRes, classStudentsRes] = await Promise.all([
      supabase.from("classes").select("*, monthly_fee").order("teacher_id", { ascending: true }).order("name", { ascending: true }),
      supabase.from("employees")
        .select("id, name, position")
        .in("position", ["원장", "강사"])
        .order("name", { ascending: true }),
      supabase.from("students").select("id, name, status, school_type, grade").order("name", { ascending: true }),
      supabase.from("class_students").select("class_id, student_id")
    ])
    setClasses(classesRes.data ?? [])
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

  // 담당 선생님/과목 필터 적용 및 정렬
  let filteredClasses = classes;
  if (teacherFilter !== "all") {
    filteredClasses = filteredClasses.filter((c: any) => c.teacher_id === teacherFilter)
  }
  if (subjectFilter !== "all") {
    filteredClasses = filteredClasses.filter((c: any) => c.subject === subjectFilter)
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

  return (
    <div className="space-y-6">
      <ClassesHeader />
      <Card className="overflow-hidden">
        <ClassesFilters
          teachers={teachers}
          onOpen={() => setModalOpen(true)}
          teacherFilter={teacherFilter}
          setTeacherFilter={setTeacherFilter}
          subjectFilter={subjectFilter}
          setSubjectFilter={setSubjectFilter}
        />
        <CardContent className="p-0">
          <Suspense fallback={<div>로딩 중...</div>}>
            <ClassesTable
              classes={sortedClasses}
              teachers={teachers}
              students={students}
              studentsCountMap={studentsCountMap}
              onDetail={handleEdit}
            />
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