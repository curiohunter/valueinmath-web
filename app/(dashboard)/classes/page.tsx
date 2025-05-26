"use client"
import { Suspense, useState } from "react"
import { ClassesHeader } from "@/app/(dashboard)/classes/classes-header"
import { ClassesFilters } from "@/app/(dashboard)/classes/classes-filters"
import { ClassesTable } from "@/app/(dashboard)/classes/classes-table"
import { Card, CardContent } from "@/components/ui/card"
import { ClassFormModal } from "@/app/(dashboard)/classes/class-form-modal"
import { useEffect, useState as useClientState } from "react"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

export default function ClassesPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [detailClass, setDetailClass] = useState<any | null>(null)
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
    supabase.from("classes").select("*").then(({ data }) => setClasses(data ?? []))
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

  // 삭제 기능
  const handleDelete = async () => {
    if (!detailClass) return
    if (!window.confirm("정말 삭제하시겠습니까?")) return
    setLoading(true)
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.from("class_students").delete().eq("class_id", detailClass.id)
    const { error } = await supabase.from("classes").delete().eq("id", detailClass.id)
    setLoading(false)
    if (error) {
      alert("삭제 실패: " + error.message)
      return
    }
    setDetailClass(null)
    window.location.reload()
  }

  // 수정 기능: 수정 모달 오픈
  const handleEdit = () => {
    setEditClass(detailClass)
    setDetailClass(null)
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
              onDetail={setDetailClass}
            />
          </Suspense>
        </CardContent>
      </Card>
      <ClassFormModal open={modalOpen} onClose={() => setModalOpen(false)} teachers={teachers} students={students} />
      {/* 상세 모달: detailClass가 있으면 */}
      {detailClass && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">반 상세</h2>
            <div className="space-y-2 mb-6">
              <div><span className="font-semibold">반 이름:</span> {detailClass.name}</div>
              <div><span className="font-semibold">과목:</span> {detailClass.subject}</div>
              <div><span className="font-semibold">담당 선생님:</span> {teachers.find(t => t.id === detailClass.teacher_id)?.name || '-'}</div>
              <div>
                <span className="font-semibold">학생 목록:</span>
                {classStudents.filter(cs => cs.class_id === detailClass.id).length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {classStudents.filter(cs => cs.class_id === detailClass.id).map(cs => {
                      const student = students.find(s => s.id === cs.student_id)
                      return student ? (
                        <span key={student.id} className="px-2 py-1 rounded bg-muted text-sm">{student.name}</span>
                      ) : null
                    })}
                  </div>
                ) : (
                  <span className="ml-2 text-muted-foreground">학생 없음</span>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-8">
              <button className="btn btn-outline" onClick={handleEdit} disabled={loading}>✏️ 수정</button>
              <button className="btn btn-error" onClick={handleDelete} disabled={loading}>🗑️ 삭제</button>
              <button className="btn" onClick={() => setDetailClass(null)} disabled={loading}>❌ 닫기</button>
            </div>
          </div>
        </div>
      )}
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
          selectedStudentIds: classStudents.filter(cs => cs.class_id === editClass.id).map(cs => cs.student_id)
        } : undefined}
      />
    </div>
  )
} 