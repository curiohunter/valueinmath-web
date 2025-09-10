"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Download, TrendingUp, TrendingDown, ChevronDown, Plus, Edit2, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
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
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  
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
          student:students(
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
    const matchesSearch = studentName.toLowerCase().includes(searchTerm.toLowerCase())
    
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

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedRecords = filteredRecords.slice(startIndex, endIndex)
  
  // 페이지 변경 시 현재 페이지 초기화
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, categoryFilter, dateFilter, selectedStudents, selectedClasses])

  const getCategoryColor = (category: string) => {
    switch (category) {
      case '학습지':
        return 'bg-blue-100 text-blue-800'
      case '교재':
        return 'bg-green-100 text-green-800'
      case '오답/심화':
        return 'bg-purple-100 text-purple-800'
      case '챌린지':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getAccuracyColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600 font-semibold'
    if (rate >= 70) return 'text-blue-600'
    if (rate >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }


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
        {/* 필터 */}
        <div className="mb-4">
          <div className="flex gap-2 flex-wrap">
            <div className="w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="학생 이름 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="기간 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">최근 1주</SelectItem>
                <SelectItem value="month">최근 1개월</SelectItem>
                <SelectItem value="all">전체</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="카테고리" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="학습지">학습지</SelectItem>
                <SelectItem value="교재">교재</SelectItem>
                <SelectItem value="오답/심화">오답/심화</SelectItem>
                <SelectItem value="챌린지">챌린지</SelectItem>
              </SelectContent>
            </Select>
            
            {/* 학생 선택 필터 */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-[130px] justify-between text-sm font-normal"
                >
                  {selectedStudents.length === 0
                    ? "학생 선택"
                    : selectedStudents.length === 1
                    ? studentOptions.find(s => s.id === selectedStudents[0])?.name || "학생 선택"
                    : `${selectedStudents.length}명 선택`
                  }
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0">
                <div className="max-h-64 overflow-y-auto">
                  <div className="p-2 border-b">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs"
                      onClick={() => {
                        if (selectedStudents.length === studentOptions.length) {
                          setSelectedStudents([]);
                        } else {
                          setSelectedStudents(studentOptions.map(s => s.id));
                        }
                      }}
                    >
                      {selectedStudents.length === studentOptions.length ? "전체 해제" : "전체 선택"}
                    </Button>
                  </div>
                  <div className="p-2 space-y-1">
                    {studentOptions.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center space-x-2 py-1.5 px-2 rounded hover:bg-gray-100"
                      >
                        <Checkbox
                          id={`student-${student.id}`}
                          checked={selectedStudents.includes(student.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedStudents([...selectedStudents, student.id]);
                            } else {
                              setSelectedStudents(selectedStudents.filter(id => id !== student.id));
                            }
                          }}
                        />
                        <label
                          htmlFor={`student-${student.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                        >
                          {student.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            
            {/* 반 선택 필터 */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-[130px] justify-between text-sm font-normal"
                >
                  {selectedClasses.length === 0
                    ? "반 선택"
                    : selectedClasses.length === 1
                    ? classOptions.find(c => c.id === selectedClasses[0])?.name || "반 선택"
                    : `${selectedClasses.length}개 반 선택`
                  }
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0">
                <div className="max-h-64 overflow-y-auto">
                  <div className="p-2 border-b">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs"
                      onClick={() => {
                        if (selectedClasses.length === classOptions.length) {
                          setSelectedClasses([]);
                        } else {
                          setSelectedClasses(classOptions.map(c => c.id));
                        }
                      }}
                    >
                      {selectedClasses.length === classOptions.length ? "전체 해제" : "전체 선택"}
                    </Button>
                  </div>
                  <div className="p-2 space-y-1">
                    {classOptions.map((classOption) => (
                      <div
                        key={classOption.id}
                        className="flex items-center space-x-2 py-1.5 px-2 rounded hover:bg-gray-100"
                      >
                        <Checkbox
                          id={`class-${classOption.id}`}
                          checked={selectedClasses.includes(classOption.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedClasses([...selectedClasses, classOption.id]);
                            } else {
                              setSelectedClasses(selectedClasses.filter(id => id !== classOption.id));
                            }
                          }}
                        />
                        <label
                          htmlFor={`class-${classOption.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                        >
                          {classOption.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            
            {/* 학습기록추가 버튼 - 맨 오른쪽에 배치 */}
            <div className="ml-auto">
              <Button onClick={() => setModalOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                학습기록추가
              </Button>
            </div>
          </div>
        </div>

        {/* 테이블 */}
        {loading ? (
          <div className="text-center py-8">로딩 중...</div>
        ) : (
          <>
            <div className="relative overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>날짜</TableHead>
                  <TableHead>학생</TableHead>
                  <TableHead>학교</TableHead>
                  <TableHead>담당반</TableHead>
                  <TableHead>카테고리</TableHead>
                  <TableHead className="text-right">문제 수</TableHead>
                  <TableHead className="text-right">정답률</TableHead>
                  <TableHead className="text-center">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      데이터가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRecords.map((record) => {
                    // 학교와 학년 조합 (학교이름에 이미 초/중/고 포함)
                    const schoolGrade = record.student?.school && record.student?.grade 
                      ? `${record.student.school}${record.student.grade <= 6 ? record.student.grade : record.student.grade <= 9 ? record.student.grade - 6 : record.student.grade - 9}`
                      : '-';
                    
                    // 담당반 정보 추출 (여러 반일 수 있음)
                    const classNames = record.student?.class_students
                      ?.map(cs => cs.classes?.name)
                      .filter(Boolean)
                      .join(', ') || '-';
                    
                    return (
                      <TableRow key={record.id}>
                        <TableCell>
                          {new Date(record.date).toLocaleDateString('ko-KR')}
                        </TableCell>
                        <TableCell className="font-medium">
                          {record.student?.name || '-'}
                        </TableCell>
                        <TableCell>
                          {schoolGrade}
                        </TableCell>
                        <TableCell>
                          {classNames}
                        </TableCell>
                        <TableCell>
                          <Badge className={getCategoryColor(record.category)}>
                            {record.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {record.problems_solved}문제
                        </TableCell>
                        <TableCell className={`text-right ${getAccuracyColor(record.accuracy_rate)}`}>
                          {record.accuracy_rate}%
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEdit(record)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700"
                              onClick={() => {
                                setRecordToDelete(record.id)
                                setDeleteDialogOpen(true)
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
              </Table>
            </div>
            
            {/* 페이지네이션 */}
            {filteredRecords.length > 0 && (
              <div className="flex items-center justify-between mt-4 px-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">페이지당</span>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value))
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10개</SelectItem>
                    <SelectItem value="20">20개</SelectItem>
                    <SelectItem value="50">50개</SelectItem>
                    <SelectItem value="100">100개</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="text-sm text-gray-600">
                총 {filteredRecords.length}개 중 {startIndex + 1}-{Math.min(endIndex, filteredRecords.length)}
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  처음
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  이전
                </Button>
                
                {/* 페이지 번호 표시 */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="min-w-[32px]"
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  다음
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  마지막
                </Button>
              </div>
            </div>
          )}
          </>
        )}
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