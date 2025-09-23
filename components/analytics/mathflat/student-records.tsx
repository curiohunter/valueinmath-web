"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Download, Plus, Search, Filter } from "lucide-react"
import { toast } from "sonner"
import { RecordFilters } from "./record-filters"
import { RecordTable } from "./record-table"
import { AddRecordModal } from "./add-record-modal"
import { EditRecordModal } from "./edit-record-modal"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import type { MathflatRecord } from "@/lib/mathflat/types"

export function StudentRecords() {
  const [records, setRecords] = useState<MathflatRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [mathflatTypeFilter, setMathflatTypeFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("week") // week, month, all
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [studentOptions, setStudentOptions] = useState<Array<{id: string, name: string}>>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [recordToEdit, setRecordToEdit] = useState<MathflatRecord | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(20)

  useEffect(() => {
    loadRecords()
    loadOptions()
  }, [dateFilter, mathflatTypeFilter, selectedStudents, searchTerm, currentPage])

  // 학생 옵션 로드
  const loadOptions = async () => {
    try {
      // pageSize를 충분히 크게 설정하여 모든 재원 학생을 가져옴
      const response = await fetch('/api/students?status=재원&pageSize=100')
      if (response.ok) {
        const result = await response.json()
        setStudentOptions((result.data || []).map((s: any) => ({ id: s.id, name: s.name })))
      }
    } catch (error) {
      console.error('Error loading student options:', error)
    }
  }

  const handleDelete = async () => {
    if (!recordToDelete) return

    try {
      const response = await fetch(`/api/mathflat/records?id=${recordToDelete}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('기록이 삭제되었습니다')
        loadRecords()
      } else {
        toast.error('기록 삭제에 실패했습니다')
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
      const response = await fetch('/api/mathflat/records', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: recordToEdit.id,
          ...updatedRecord
        })
      })

      if (response.ok) {
        toast.success('기록이 수정되었습니다')
        setEditModalOpen(false)
        setRecordToEdit(null)
        loadRecords()
      } else {
        toast.error('기록 수정에 실패했습니다')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('오류가 발생했습니다')
    }
  }

  const loadRecords = async () => {
    setLoading(true)
    try {
      // 날짜 범위 계산
      let startDate, endDate;
      const today = new Date()
      endDate = today.toISOString().split('T')[0]

      if (dateFilter === 'week') {
        const weekAgo = new Date(today)
        weekAgo.setDate(weekAgo.getDate() - 7)
        startDate = weekAgo.toISOString().split('T')[0]
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(today)
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        startDate = monthAgo.toISOString().split('T')[0]
      }

      // API 파라미터 구성
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString()
      })

      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      if (mathflatTypeFilter !== 'all') params.append('mathflatTypes', mathflatTypeFilter)
      if (selectedStudents.length > 0) params.append('studentIds', selectedStudents.join(','))
      if (searchTerm) params.append('search', searchTerm)

      const response = await fetch(`/api/mathflat/records?${params}`)
      if (response.ok) {
        const result = await response.json()
        setRecords(result.data || [])
        setTotalCount(result.pagination?.totalCount || 0)
      }
    } catch (error) {
      console.error('Unexpected error:', error)
      toast.error('데이터 로딩 중 오류 발생')
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    const headers = ['날짜', '학생', '유형', '교재명', '푼 문제수', '정답 수', '오답 수', '정답률']
    const rows = records.map(r => [
      r.event_date,
      r.student_name || '',
      r.mathflat_type || '',
      r.book_title || '',
      r.problem_solved || 0,
      r.correct_count || 0,
      r.wrong_count || 0,
      `${r.correct_rate || 0}%`
    ])

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

  const getTypeColor = (type: string) => {
    switch (type) {
      case '교재': return 'bg-blue-100 text-blue-700'
      case '학습지': return 'bg-green-100 text-green-700'
      case '챌린지': return 'bg-purple-100 text-purple-700'
      case '챌린지오답': return 'bg-orange-100 text-orange-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>학습 기록</CardTitle>
              <CardDescription>
                매쓰플랫 학습 데이터 (총 {totalCount}건)
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                기록 추가
              </Button>
              <Button onClick={exportToCSV} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                CSV 내보내기
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* 필터 컴포넌트 */}
          <RecordFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            dateFilter={dateFilter}
            setDateFilter={setDateFilter}
            mathflatTypeFilter={mathflatTypeFilter}
            setMathflatTypeFilter={setMathflatTypeFilter}
            selectedStudents={selectedStudents}
            setSelectedStudents={setSelectedStudents}
            studentOptions={studentOptions}
          />

          {/* 테이블 컴포넌트 */}
          <RecordTable
            records={records}
            loading={loading}
            onEdit={handleEdit}
            onDelete={(recordId) => {
              setRecordToDelete(recordId)
              setDeleteDialogOpen(true)
            }}
            currentPage={currentPage}
            totalPages={Math.ceil(totalCount / pageSize)}
            onPageChange={setCurrentPage}
            getTypeColor={getTypeColor}
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