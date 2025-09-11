"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { RecordFilters } from "./record-filters"
import { RecordTable } from "./record-table"
import { AddRecordModal } from "./add-record-modal"
import { EditRecordModal } from "./edit-record-modal"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

interface MathflatRecord {
  id: string
  student_id: string
  date: string
  category: string
  problems_solved: number
  accuracy_rate: number
  student?: {
    name: string
    school: string
    grade: number
    class_students?: Array<{
      classes?: {
        name: string
      }
    }>
  }
}

export function StudentRecords() {
  const [records, setRecords] = useState<MathflatRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("week") // week, month, all
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [selectedClasses, setSelectedClasses] = useState<string[]>([])
  const [studentOptions, setStudentOptions] = useState<Array<{id: string, name: string}>>([])
  const [classOptions, setClassOptions] = useState<Array<{id: string, name: string}>>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [recordToEdit, setRecordToEdit] = useState<MathflatRecord | null>(null)
  
  
  const supabase = createClient()

  useEffect(() => {
    loadRecords()
    loadOptions()
  }, [dateFilter, categoryFilter, selectedStudents, selectedClasses])
  
  // 학생과 반 옵션 로드
  const loadOptions = async () => {
    try {
      // 학생 목록 가져오기
      const { data: students } = await supabase
        .from('students')
        .select('id, name')
        .eq('status', '재원')
        .order('name')
      
      if (students) {
        setStudentOptions(students)
      }
      
      // 반 목록 가져오기
      const { data: classes } = await supabase
        .from('classes')
        .select('id, name')
        .order('name')
      
      if (classes) {
        setClassOptions(classes)
      }
    } catch (error) {
      console.error('Error loading options:', error)
    }
  }

  const handleDelete = async () => {
    if (!recordToDelete) return
    
    try {
      const { error } = await supabase
        .from('mathflat_records')
        .delete()
        .eq('id', recordToDelete)
      
      if (error) {
        console.error('Error deleting record:', error)
        toast.error('기록 삭제에 실패했습니다')
      } else {
        toast.success('기록이 삭제되었습니다')
        loadRecords()
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('오류가 발생했습니다')
    } finally {
      setDeleteDialogOpen(false)
      setRecordToDelete(null)
    }
  }

  const handleEdit = (record: MathflatRecord) => {
    setRecordToEdit(record)
    setEditModalOpen(true)
  }

  const handleEditSave = async (updatedRecord: Partial<MathflatRecord>) => {
    if (!recordToEdit) return
    
    try {
      const { error } = await supabase
        .from('mathflat_records')
        .update({
          date: updatedRecord.date,
          category: updatedRecord.category,
          problems_solved: updatedRecord.problems_solved,
          accuracy_rate: updatedRecord.accuracy_rate
        })
        .eq('id', recordToEdit.id)
      
      if (error) {
        console.error('Error updating record:', error)
        toast.error('기록 수정에 실패했습니다')
      } else {
        toast.success('기록이 수정되었습니다')
        setEditModalOpen(false)
        setRecordToEdit(null)
        loadRecords()
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('오류가 발생했습니다')
    }
  }

  const loadRecords = async () => {
    setLoading(true)
    try {
      // 먼저 기본 데이터 가져오기
      let query = supabase
        .from('mathflat_records')
        .select(`
          *,
          student:student_id(
            name, 
            school, 
            grade,
            class_students(
              classes(
                name
              )
            )
          )
        `)
        .order('date', { ascending: false })
        .order('student_id')

      // 날짜 필터
      if (dateFilter === 'week') {
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        query = query.gte('date', weekAgo.toISOString().split('T')[0])
      } else if (dateFilter === 'month') {
        const monthAgo = new Date()
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        query = query.gte('date', monthAgo.toISOString().split('T')[0])
      }

      // 카테고리 필터
      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error loading records:', error)
        toast.error('데이터 로딩 실패')
      } else {
        setRecords(data || [])
      }
    } catch (error) {
      console.error('Unexpected error:', error)
      toast.error('데이터 로딩 중 오류 발생')
    } finally {
      setLoading(false)
    }
  }

  const filteredRecords = records.filter(record => {
    const studentName = record.student?.name || ''
    const matchesSearch = searchTerm === '' || studentName.toLowerCase().includes(searchTerm.toLowerCase())
    
    // 검색어가 있으면 학생/반 필터를 무시하고 검색 결과만 표시
    if (searchTerm !== '') {
      return matchesSearch
    }
    
    // 학생 필터
    const matchesStudent = selectedStudents.length === 0 || selectedStudents.includes(record.student_id)
    
    // 반 필터 (학생이 속한 반 이름 확인)
    const studentClassNames = record.student?.class_students
      ?.map(cs => cs.classes?.name)
      .filter(Boolean) || []
    
    const matchesClass = selectedClasses.length === 0 || 
      selectedClasses.some(classId => {
        const className = classOptions.find(c => c.id === classId)?.name
        return className && studentClassNames.includes(className)
      })
    
    return matchesSearch && matchesStudent && matchesClass
  })




  const exportToCSV = () => {
    const headers = ['날짜', '학생', '학교', '담당반', '카테고리', '문제수', '정답률']
    // CSV 내보내기는 전체 필터된 데이터 사용
    const rows = filteredRecords.map(r => {
      const schoolGrade = r.student?.school && r.student?.grade 
        ? `${r.student.school}${r.student.grade <= 6 ? r.student.grade : r.student.grade <= 9 ? r.student.grade - 6 : r.student.grade - 9}`
        : '';
      
      const classNames = r.student?.class_students
        ?.map(cs => cs.classes?.name)
        .filter(Boolean)
        .join(', ') || '';
      
      return [
        r.date,
        r.student?.name || '',
        schoolGrade,
        classNames,
        r.category,
        r.problems_solved,
        `${r.accuracy_rate}%`
      ];
    })

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `mathflat_records_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>학습 기록</CardTitle>
              <CardDescription>학생별 매쓰플랫 학습 데이터</CardDescription>
            </div>
            <Button onClick={exportToCSV} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              CSV 내보내기
            </Button>
          </div>
        </CardHeader>
        <CardContent>
        {/* 필터 컴포넌트 */}
        <RecordFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          selectedStudents={selectedStudents}
          setSelectedStudents={setSelectedStudents}
          selectedClasses={selectedClasses}
          setSelectedClasses={setSelectedClasses}
          studentOptions={studentOptions}
          classOptions={classOptions}
          onAddRecord={() => setModalOpen(true)}
        />

        {/* 테이블 컴포넌트 */}
        <RecordTable
          records={filteredRecords}
          loading={loading}
          onEdit={handleEdit}
          onDelete={(recordId) => {
            setRecordToDelete(recordId)
            setDeleteDialogOpen(true)
          }}
        />
        </CardContent>
      </Card>

      {/* 학습기록 추가 모달 */}
      <AddRecordModal 
        open={modalOpen} 
        onOpenChange={setModalOpen}
        studentOptions={studentOptions}
        onSuccess={loadRecords}
      />

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>기록 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 학습 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 수정 모달 */}
      {editModalOpen && recordToEdit && (
        <EditRecordModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          record={recordToEdit}
          studentOptions={studentOptions}
          onSave={handleEditSave}
        />
      )}
    </>
  )
}