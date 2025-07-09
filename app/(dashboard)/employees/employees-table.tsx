"use client"

import { useState, useMemo, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Edit, Trash2, FileText, Link, Link2Off } from "lucide-react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EmployeeFormModal } from "./employee-form-modal"
import { Pagination } from "@/components/ui/pagination"
import type { Employee, EmployeeFilters } from "@/types/employee"
import { useEmployees } from "@/hooks/use-employees"
import { updateEmployeeNotes } from "@/services/employee-service"
import { linkEmployeeToUser } from "@/actions/auth-actions"

// 사용자 타입 정의
interface User {
  id: string
  email: string
  name: string
  isLinked: boolean
  approval_status?: string
}

function isEmployeeRow(row: any): row is { position: any } {
  return row && typeof row === "object" && "position" in row
}

export function EmployeesTable() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const page = Number(searchParams.get("page") || "1")
  const pageSize = 10

  // Get filter values from URL
  const search = searchParams.get("search") || ""
  const position = searchParams.get("position") || "all"
  const status = searchParams.get("status") || "재직" // 기본값을 "재직"으로 설정

  // 필터 객체를 메모이제이션하여 불필요한 렌더링 방지
  const filters = useMemo<EmployeeFilters>(
    () => ({
      search,
      department: "all", // 부서 필터 제거로 항상 "all"로 설정
      position: position as any,
      status: status as any,
    }),
    [search, position, status],
  )

  const { employees, totalCount, isLoading, mutate, deleteEmployee } = useEmployees(page, pageSize, filters)

  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // 메모 관련 상태
  const [notesModalOpen, setNotesModalOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [notes, setNotes] = useState("")
  const [isSavingNotes, setIsSavingNotes] = useState(false)

  // 계정 연결 관련 상태
  const [users, setUsers] = useState<User[]>([])
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [linkingEmployee, setLinkingEmployee] = useState<Employee | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [isLinking, setIsLinking] = useState(false)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)

  // 사용자 목록 가져오기
  useEffect(() => {
    async function fetchUsers() {
      setIsLoadingUsers(true)
      try {
        const res = await fetch("/api/list-users")
        const { users: userData, error } = await res.json()

        // userData 타입 명시
        type UserData = { id: string; email: string; name: string; isLinked: boolean }
        const usersTyped: UserData[] = userData

        if (error) {
          console.error("Error fetching users:", error)
          toast({
            title: "사용자 목록 로드 실패",
            description: "사용자 목록을 가져오는 중 오류가 발생했습니다.",
            variant: "destructive",
          })
          return
        }

        setUsers(usersTyped.map(u => ({ ...u, email: u.email || "" })))
      } catch (error) {
        console.error("Error fetching users:", error)
        toast({
          title: "사용자 목록 로드 실패",
          description: "사용자 목록을 가져오는 중 오류가 발생했습니다.",
          variant: "destructive",
        })
      } finally {
        setIsLoadingUsers(false)
      }
    }

    fetchUsers()
  }, [])

  // Handle edit button click
  const handleEdit = (employee: Employee) => {
    // 직원 정보를 깊은 복사하여 전달
    setEditingEmployee(JSON.parse(JSON.stringify(employee)))
    setIsModalOpen(true)
  }

  // Handle delete confirmation
  const handleDelete = async (id: string) => {
    setIsDeleting(true)
    try {
      const result = await deleteEmployee(id)

      if (result.success) {
        toast({
          title: "직원 삭제 완료",
          description: "직원 정보가 성공적으로 삭제되었습니다.",
        })
      } else {
        toast({
          title: "삭제 실패",
          description: "직원 정보 삭제 중 오류가 발생했습니다.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting employee:", error)
      toast({
        title: "삭제 실패",
        description: "직원 정보 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // 메모 모달 열기
  const handleOpenNotesModal = (employee: Employee) => {
    setSelectedEmployee(employee)
    setNotes(employee.notes || "")
    setNotesModalOpen(true)
  }

  // 메모 저장
  const handleSaveNotes = async () => {
    if (!selectedEmployee) return

    setIsSavingNotes(true)
    try {
      const result = await updateEmployeeNotes(selectedEmployee.id, notes)

      if (result.success) {
        toast({
          title: "메모 저장 완료",
          description: "직원 메모가 성공적으로 저장되었습니다.",
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

  // 계정 연결 모달 열기
  const handleOpenLinkModal = (employee: Employee) => {
    setLinkingEmployee(employee)
    setSelectedUserId(employee.auth_id || "")
    setLinkModalOpen(true)
  }

  // 드롭다운에는 연결되지 않은 계정만 표시
  const unlinkedUsers = useMemo(() => {
    // 이미 연결된 사용자 ID 목록 가져오기
    const connectedUserIds = employees
      .filter(emp => emp.auth_id)
      .map(emp => emp.auth_id)
    
    // console.log('현재 연결된 사용자 ID:', connectedUserIds)
    
    // 이미 연결된 사용자 제외 (현재 선택된 직원이 연결된 사용자는 포함)
    const availableUsers = users.filter(user => 
      !connectedUserIds.includes(user.id) || user.id === linkingEmployee?.auth_id
    )
    
    // console.log('사용 가능한 사용자:', availableUsers)
    
    return availableUsers
  }, [users, employees, linkingEmployee?.auth_id])

  // 연결된 사용자 정보 가져오기 (전체 users 배열에서 찾음)
  const getLinkedUserInfo = (authId: string | null) => {
    if (!authId) return null
    return users.find((user) => user.id === authId) || null
  }

  // Status badge color mapping
  const statusColorMap: Record<string, string> = {
    재직: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    퇴직: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  }

  // Department badge color mapping
  const departmentColorMap: Record<string, string> = {
    고등관: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    중등관: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
    영재관: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
    데스크: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  }

  // Position badge color mapping
  const positionColorMap: Record<string, string> = {
    원장: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    부원장: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    강사: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
    데스크직원: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
    데스크보조: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
  }

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / pageSize)

  // 계정 연결/해제 처리 함수 추가
  const handleLinkAccount = async () => {
    if (!linkingEmployee) return
    setIsLinking(true)
    try {
      // "none" 선택 시 연결 해제
      const userId = selectedUserId === "none" ? null : selectedUserId
      const result = await linkEmployeeToUser(linkingEmployee.id, userId)
      if (result.success) {
        toast({
          title: userId ? "계정 연결 완료" : "계정 연결 해제",
          description: userId
            ? "직원과 계정이 성공적으로 연결되었습니다."
            : "계정 연결이 해제되었습니다.",
        })
        setLinkModalOpen(false)
        setLinkingEmployee(null)
        setSelectedUserId("")
        mutate()
      } else {
        throw result.error
      }
    } catch (error) {
      toast({
        title: "계정 연결 실패",
        description: "계정 연결 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsLinking(false)
    }
  }

  if (isLoading) {
    return <div className="p-8 text-center">로딩 중...</div>
  }

  // 디버깅용 로그
  // console.log(
  //   "Employees with auth_id:",
  //   employees.map((e) => ({ name: e.name, auth_id: e.auth_id })),
  // )

  // 데이터 필터링
  const safeEmployees = Array.isArray(employees) ? employees.filter(isEmployeeRow) : []

  return (
    <div>
      <div className="relative overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[10%]">이름</TableHead>
              <TableHead className="w-[10%]">직책</TableHead>
              <TableHead className="w-[10%]">부서</TableHead>
              <TableHead className="w-[7%]">상태</TableHead>
              <TableHead className="w-[13%]">연락처</TableHead>
              <TableHead className="w-[10%]">입사일</TableHead>
              <TableHead className="w-[10%]">퇴사일</TableHead>
              <TableHead className="w-[15%]">연결된 계정</TableHead>
              <TableHead className="w-[7%] text-center">메모</TableHead>
              <TableHead className="w-[8%] text-center">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {safeEmployees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center">
                  직원 정보가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              safeEmployees.map((employee) => {
                return (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell>
                      {employee.position ? (
                        <Badge className={positionColorMap[employee.position]}>{employee.position}</Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {employee.department ? (
                        <Badge className={departmentColorMap[employee.department]}>{employee.department}</Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColorMap[employee.status]}>{employee.status}</Badge>
                    </TableCell>
                    <TableCell>{employee.phone || "-"}</TableCell>
                    <TableCell>
                      {employee.hire_date ? new Date(employee.hire_date).toLocaleDateString("ko-KR") : "-"}
                    </TableCell>
                    <TableCell>
                      {employee.resign_date ? new Date(employee.resign_date).toLocaleDateString("ko-KR") : "-"}
                    </TableCell>
                    <TableCell>
                      {employee.auth_id ? (
                        <div className="flex items-center">
                          <Badge
                            variant="outline"
                            className="bg-blue-50 text-blue-700 border-blue-200 mr-2 max-w-[200px] truncate"
                          >
                            {(() => {
                              // 연결된 사용자 정보 가져오기
                              const linkedUser = getLinkedUserInfo(employee.auth_id)

                              // 이메일 주소 표시 로직
                              if (linkedUser && linkedUser.email) {
                                return linkedUser.email
                              } else if (employee.auth_id) {
                                // 사용자 정보가 없지만 auth_id가 있는 경우
                                return `ID: ${employee.auth_id.substring(0, 8)}...`
                              } else {
                                return "연결된 계정 없음"
                              }
                            })()}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenLinkModal(employee)}
                            title="계정 연결 관리"
                          >
                            <Link className="h-4 w-4 text-blue-600" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <span className="text-muted-foreground text-sm mr-2">연결된 계정 없음</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenLinkModal(employee)}
                            title="계정 연결하기"
                          >
                            <Link2Off className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenNotesModal(employee)}
                        className={`${employee.notes ? "text-blue-600" : "text-muted-foreground"}`}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        {employee.notes ? "보기" : "추가"}
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(employee)}>
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
                              <AlertDialogTitle>직원 정보 삭제</AlertDialogTitle>
                              <AlertDialogDescription>
                                {employee.name} 직원의 정보를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>취소</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(employee.id)}
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
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center py-6">
          <Pagination totalPages={totalPages} currentPage={page} />
        </div>
      )}

      <EmployeeFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        employee={editingEmployee}
        onSuccess={() => {
          setEditingEmployee(null)
          mutate()
        }}
      />

      {/* 메모 모달 */}
      <Dialog open={notesModalOpen} onOpenChange={setNotesModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selectedEmployee?.name} 직원 메모</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="직원에 대한 메모를 입력하세요."
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

      {/* 계정 연결 모달 */}
      <Dialog open={linkModalOpen} onOpenChange={setLinkModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{linkingEmployee?.name} 직원 계정 연결</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            {isLoadingUsers ? (
              <div className="text-center py-4">사용자 목록 로딩 중...</div>
            ) : (
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="연결할 계정 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">계정 연결 해제</SelectItem>
                  {unlinkedUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex flex-col">
                        <span>{user.email}</span>
                        {user.name && user.name !== user.email && (
                          <span className="text-sm text-muted-foreground">이름: {user.name}</span>
                        )}
                        <span className="text-xs font-medium">
                          {user.approval_status === 'approved' && (
                            <span className="text-green-600">승인됨</span>
                          )}
                          {user.approval_status === 'pending' && (
                            <span className="text-amber-600">승인 대기중</span>
                          )}
                          {!user.approval_status && (
                            <span className="text-blue-600">등록 폼 미작성</span>
                          )}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <p className="text-sm text-muted-foreground mt-4">
              직원과 사용자 계정을 연결하면 해당 직원이 시스템에 로그인할 수 있습니다. 연결을 해제하면 해당 직원은 더
              이상 로그인할 수 없습니다.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkModalOpen(false)}>
              취소
            </Button>
            <Button onClick={handleLinkAccount} disabled={isLinking || isLoadingUsers}>
              {isLinking ? "처리 중..." : selectedUserId === "none" ? "연결 해제" : "계정 연결"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
