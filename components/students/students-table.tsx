"use client"

import { useState, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Edit, Trash2, FileText, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { Textarea } from "@/components/ui/textarea"
import { StudentFormModal } from "./student-form-modal"
import { Pagination } from "@/components/ui/pagination"
import type { Student, StudentFilters } from "@/types/student"
import { useStudents } from "@/hooks/use-students"
import { updateStudentNotes } from "@/lib/student-client"

export function StudentsTable() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const page = Number(searchParams.get("page") || "1")
  const pageSize = 10

  // URL에서 필터 값 가져오기
  const search = searchParams.get("search") || ""
  const department = searchParams.get("department") || "all"
  const status = searchParams.get("status") || "재원" // 기본값을 "재원"으로 설정
  const school_type = searchParams.get("school_type") || "all"
  const grade = searchParams.get("grade") || "all"
  const sortBy = searchParams.get("sortBy") || "name" // 정렬 기준
  const sortOrder = searchParams.get("sortOrder") || "asc" // 정렬 순서

  // 필터 객체 메모이제이션
  const filters = useMemo<StudentFilters>(
    () => ({
      search,
      department: department as any,
      status: status as any,
      school_type: school_type as any,
      grade: grade === "all" ? "all" : Number(grade),
    }),
    [search, department, status, school_type, grade],
  )

  const { students, totalCount, isLoading, mutate, deleteStudent } = useStudents(page, pageSize, filters, sortBy, sortOrder as "asc" | "desc")

  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // 메모 관련 상태
  const [notesModalOpen, setNotesModalOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [notes, setNotes] = useState("")
  const [isSavingNotes, setIsSavingNotes] = useState(false)

  // 학생 수정 버튼 클릭 처리
  const handleEdit = (student: Student) => {
    try {
      // 학생 정보를 깊은 복사하여 전달 (JSON 파싱 오류 방지)
      const studentCopy = {
        ...student,
        start_date: student.start_date,
        end_date: student.end_date,
        first_contact_date: student.first_contact_date,
      }
      setEditingStudent(studentCopy)
      setIsModalOpen(true)
    } catch (error) {
      console.error("Error preparing student data for edit:", error)
      toast({
        title: "오류 발생",
        description: "학생 정보를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  // 학생 삭제 처리
  const handleDelete = async (id: string) => {
    setIsDeleting(true)
    try {
      const result = await deleteStudent(id)

      if (result.success) {
        toast({
          title: "학생 삭제 완료",
          description: "학생 정보가 성공적으로 삭제되었습니다.",
        })
      } else {
        toast({
          title: "삭제 실패",
          description: "학생 정보 삭제 중 오류가 발생했습니다.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting student:", error)
      toast({
        title: "삭제 실패",
        description: "학생 정보 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // 메모 모달 열기
  const handleOpenNotesModal = (student: Student) => {
    setSelectedStudent(student)
    setNotes(student.notes || "")
    setNotesModalOpen(true)
  }

  // 메모 저장
  const handleSaveNotes = async () => {
    if (!selectedStudent) return

    setIsSavingNotes(true)
    try {
      const result = await updateStudentNotes(selectedStudent.id, notes)

      if (result.success) {
        toast({
          title: "메모 저장 완료",
          description: "학생 메모가 성공적으로 저장되었습니다.",
        })
        mutate() // 데이터 새로고침
        setNotesModalOpen(false)
      } else {
        throw result.error
      }
    } catch (error) {
      console.error("Error saving notes:", error)
      toast({
        title: "메모 저장 실패",
        description: "메모 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsSavingNotes(false)
    }
  }

  // 정렬 변경 처리
  const handleSort = (field: "name" | "start_date" | "end_date") => {
    const params = new URLSearchParams(searchParams)
    
    if (sortBy === field) {
      // 같은 필드 클릭시 정렬 순서 토글
      params.set("sortOrder", sortOrder === "asc" ? "desc" : "asc")
    } else {
      // 다른 필드 클릭시 해당 필드로 변경하고 오름차순으로
      params.set("sortBy", field)
      params.set("sortOrder", "asc")
    }
    
    // 페이지를 1로 리셋
    params.set("page", "1")
    
    router.push(`/students?${params.toString()}`)
  }

  // 정렬 아이콘 표시
  const getSortIcon = (field: "name" | "start_date" | "end_date") => {
    if (sortBy !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-gray-400" />
    }
    return sortOrder === "asc" 
      ? <ArrowUp className="ml-2 h-4 w-4 text-blue-600" />
      : <ArrowDown className="ml-2 h-4 w-4 text-blue-600" />
  }


  // 상태 배지 색상 매핑
  const statusColorMap: Record<string, string> = {
    재원: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    퇴원: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    휴원: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    미등록: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    신규상담: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  }

  // 신규상담 배지 색상 결정 함수 (학부모 작성 vs 직원 작성)
  const getNewConsultationColor = (createdByType: string | undefined) => {
    if (createdByType === 'self_service') {
      // 학부모가 직접 작성한 경우 - 주황색으로 구분
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300 border border-orange-300 dark:border-orange-700"
    }
    // 직원이 작성한 경우 - 기본 파란색
    return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
  }

  // 담당관 배지 색상 매핑
  const departmentColorMap: Record<string, string> = {
    고등관: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    중등관: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
    영재관: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
  }

  // 총 페이지 수 계산
  const totalPages = Math.ceil(totalCount / pageSize)

  if (isLoading) {
    return <div className="p-8 text-center">로딩 중...</div>
  }

  return (
    <div>
      <div className="relative overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[10%]">
                <button
                  className="flex items-center font-medium hover:text-gray-900 dark:hover:text-gray-100"
                  onClick={() => handleSort("name")}
                >
                  이름
                  {getSortIcon("name")}
                </button>
              </TableHead>
              <TableHead className="w-[10%]">학교</TableHead>
              <TableHead className="w-[7%]">학년</TableHead>
              <TableHead className="w-[8%]">담당관</TableHead>
              <TableHead className="w-[7%]">상태</TableHead>
              <TableHead className="w-[12%]">학생 연락처</TableHead>
              <TableHead className="w-[12%]">학부모 연락처</TableHead>
              <TableHead className="w-[10%]">
                <button
                  className="flex items-center font-medium hover:text-gray-900 dark:hover:text-gray-100"
                  onClick={() => handleSort("start_date")}
                >
                  시작일
                  {getSortIcon("start_date")}
                </button>
              </TableHead>
              <TableHead className="w-[10%]">
                <button
                  className="flex items-center font-medium hover:text-gray-900 dark:hover:text-gray-100"
                  onClick={() => handleSort("end_date")}
                >
                  종료일
                  {getSortIcon("end_date")}
                </button>
              </TableHead>
              <TableHead className="w-[10%] text-center">메모</TableHead>
              <TableHead className="w-[6%] text-center">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="h-24 text-center">
                  학생 정보가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>{student.school || "-"}</TableCell>
                  <TableCell>{student.grade ? `${student.grade}학년` : "-"}</TableCell>
                  <TableCell>
                    {student.department ? (
                      <Badge className={departmentColorMap[student.department] || ""}>{student.department}</Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        student.status === '신규상담'
                          ? getNewConsultationColor(student.created_by_type)
                          : (statusColorMap[student.status] || "")
                      }
                    >
                      {student.status}
                      {student.status === '신규상담' && student.created_by_type === 'self_service' && (
                        <span className="ml-1 text-xs">(홈페이지)</span>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>{student.student_phone || "-"}</TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <div>{student.parent_phone || "-"}</div>
                      {student.payment_phone && student.payment_phone !== student.parent_phone && (
                        <div className="text-xs text-muted-foreground">({student.payment_phone})</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {student.start_date ? new Date(student.start_date).toLocaleDateString("ko-KR") : "-"}
                  </TableCell>
                  <TableCell>
                    {student.end_date ? new Date(student.end_date).toLocaleDateString("ko-KR") : "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenNotesModal(student)}
                      className={`${student.notes ? "text-blue-600" : "text-muted-foreground"}`}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      {student.notes ? "보기" : "추가"}
                    </Button>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(student)}>
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">수정</span>
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                            <span className="sr-only">삭제</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>학생 정보 삭제</AlertDialogTitle>
                            <AlertDialogDescription>
                              {student.name} 학생의 정보를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>취소</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(student.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              disabled={isDeleting}
                            >
                              {isDeleting ? "삭제 중..." : "삭제"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center py-6">
          <Pagination totalPages={totalPages} currentPage={page} />
        </div>
      )}

      {/* 학생 정보 수정 모달 */}
      {editingStudent && (
        <StudentFormModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          student={editingStudent}
          onSuccess={() => {
            setEditingStudent(null)
            mutate()
          }}
        />
      )}

      {/* 메모 모달 */}
      <Dialog open={notesModalOpen} onOpenChange={setNotesModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selectedStudent?.name} 학생 메모</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="학생에 대한 메모를 입력하세요."
              className="min-h-[200px]"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesModalOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveNotes} disabled={isSavingNotes}>
              {isSavingNotes ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
