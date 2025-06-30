"use client"
import { Suspense, useState } from "react"
import { ClassesHeader } from "@/app/(dashboard)/students/classes/classes-header"
import { ClassesFilters } from "@/app/(dashboard)/students/classes/classes-filters"
import { ClassesTable } from "@/app/(dashboard)/students/classes/classes-table"
import { Card, CardContent } from "@/components/ui/card"
import { ClassFormModal } from "@/app/(dashboard)/students/classes/class-form-modal"
import { useEffect, useState as useClientState } from "react"
import { createClient } from "@supabase/supabase-js"
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

  useEffect(() => {
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    supabase.from("classes").select("*, monthly_fee").then(({ data }) => setClasses(data ?? []))
    supabase.from("employees")
      .select("id, name, position")
      .in("position", ["원장", "강사"])
      .then(({ data }) => setTeachers(data ?? []))
    supabase.from("students").select("id, name, status, school_type, grade").then(({ data }) => setStudents(data ?? []))
    supabase.from("class_students").select("class_id, student_id").then(({ data }) => setClassStudents(data ?? []))
  }, [])

  // 반별 학생 수 매핑
  const studentsCountMap = classStudents.reduce((acc: Record<string, number>, cs: any) => {
    acc[cs.class_id] = (acc[cs.class_id] || 0) + 1
    return acc
  }, {})

  // 담당 선생님/과목 필터 적용
  let filteredClasses = classes;
  if (teacherFilter !== "all") {
    filteredClasses = filteredClasses.filter((c: any) => c.teacher_id === teacherFilter)
  }
  if (subjectFilter !== "all") {
    filteredClasses = filteredClasses.filter((c: any) => c.subject === subjectFilter)
  }


  // 수정 기능: 수정 모달 오픈 (상세에서 바로)
  const handleEdit = (classData: any) => {
    setEditClass(classData)
  }

  // 수정 모달에서 저장 후 닫기
  const handleEditClose = () => {
    setEditClass(null)
    window.location.reload()
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
              classes={filteredClasses}
              teachers={teachers}
              students={students}
              studentsCountMap={studentsCountMap}
              onDetail={handleEdit}
            />
          </Suspense>
        </CardContent>
      </Card>
      <ClassFormModal open={modalOpen} onClose={() => setModalOpen(false)} teachers={teachers} students={students} />
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