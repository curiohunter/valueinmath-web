"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Pencil, Trash2, UserCheck, Clock, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import {
  ConsultationRequest,
  ConsultationRequestStatus,
  ConsultationMethod,
  ConsultationType,
} from "@/types/consultation-requests"
import {
  getConsultationRequests,
  updateConsultationRequestStatus,
  deleteConsultationRequest,
} from "@/services/consultation-requests"
import { createClient } from "@/lib/supabase/client"

const statusConfig = {
  '대기중': { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: Clock },
  '완료': { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 },
}

const methodBadge = {
  '대면': 'bg-purple-100 text-purple-800',
  '전화': 'bg-blue-100 text-blue-800',
}

const typeBadge = {
  '학습관련': 'bg-green-100 text-green-800',
  '운영관련': 'bg-orange-100 text-orange-800',
  '기타': 'bg-gray-100 text-gray-800',
}

export function ConsultationRequestsManagement() {
  const [requests, setRequests] = useState<ConsultationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>("전체")
  const [editingRequest, setEditingRequest] = useState<ConsultationRequest | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deletingRequestId, setDeletingRequestId] = useState<string | null>(null)
  const [employees, setEmployees] = useState<Array<{ id: string; name: string }>>([])
  const [viewingContent, setViewingContent] = useState<string | null>(null)
  const [isContentModalOpen, setIsContentModalOpen] = useState(false)

  // 상담요청 목록 로드
  const loadRequests = async () => {
    setLoading(true)
    try {
      const data = await getConsultationRequests()
      setRequests(data)
    } catch (error) {
      console.error("상담요청 로딩 오류:", error)
      toast.error("상담요청을 불러오는데 실패했습니다.")
    } finally {
      setLoading(false)
    }
  }

  // 직원 목록 로드
  const loadEmployees = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("employees")
      .select("id, name")
      .eq("status", "재직")
      .order("name")

    if (data) {
      setEmployees(data)
    }
  }

  useEffect(() => {
    loadRequests()
    loadEmployees()
  }, [])

  // 필터링된 상담요청
  const filteredRequests = requests.filter((req) => {
    if (filterStatus === "전체") return true
    return req.status === filterStatus
  })

  // 수정 모달 열기
  const handleEdit = (request: ConsultationRequest) => {
    setEditingRequest(request)
    setIsEditModalOpen(true)
  }

  // 수정 저장
  const handleSaveEdit = async () => {
    if (!editingRequest) return

    try {
      await updateConsultationRequestStatus(
        editingRequest.id,
        editingRequest.status,
        editingRequest.counselor_id || undefined
      )
      toast.success("상담요청이 수정되었습니다.")
      setIsEditModalOpen(false)
      setEditingRequest(null)
      loadRequests()
    } catch (error) {
      console.error("수정 오류:", error)
      toast.error("수정에 실패했습니다.")
    }
  }

  // 삭제 확인 모달 열기
  const handleDeleteConfirm = (requestId: string) => {
    setDeletingRequestId(requestId)
    setIsDeleteModalOpen(true)
  }

  // 삭제 실행
  const handleDelete = async () => {
    if (!deletingRequestId) return

    try {
      await deleteConsultationRequest(deletingRequestId)
      toast.success("상담요청이 삭제되었습니다.")
      setIsDeleteModalOpen(false)
      setDeletingRequestId(null)
      loadRequests()
    } catch (error) {
      console.error("삭제 오류:", error)
      toast.error("삭제에 실패했습니다.")
    }
  }

  // 통계
  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === "대기중").length,
    completed: requests.filter((r) => r.status === "완료").length,
  }

  return (
    <div className="space-y-4">
      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">전체 요청</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">대기중</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">완료</p>
          </CardContent>
        </Card>
      </div>

      {/* 필터 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">상담 요청 관리</h3>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="전체">전체</SelectItem>
                <SelectItem value="대기중">대기중</SelectItem>
                <SelectItem value="완료">완료</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {/* 테이블 */}
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">학생명</TableHead>
                  <TableHead className="w-[70px]">요청자</TableHead>
                  <TableHead className="w-[100px]">유형</TableHead>
                  <TableHead className="w-[90px]">방법</TableHead>
                  <TableHead className="w-[120px]">요청일시</TableHead>
                  <TableHead>요청내용</TableHead>
                  <TableHead className="w-[120px]">담당자</TableHead>
                  <TableHead className="w-[110px]">상태</TableHead>
                  <TableHead className="w-[120px] text-center">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      로딩 중...
                    </TableCell>
                  </TableRow>
                ) : filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      상담 요청이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((request) => {
                    const StatusIcon = statusConfig[request.status].icon
                    return (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.student_name}</TableCell>
                        <TableCell className="text-sm text-center">
                          {request.requester_role === 'parent' ? '학부모' : '학생'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={typeBadge[request.type]}>
                            {request.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={methodBadge[request.method]}>
                            {request.method}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(request.created_at), "MM/dd HH:mm", { locale: ko })}
                        </TableCell>
                        <TableCell className="max-w-[250px]">
                          <button
                            className="text-sm truncate text-left hover:text-primary hover:underline w-full"
                            onClick={() => {
                              setViewingContent(request.content)
                              setIsContentModalOpen(true)
                            }}
                          >
                            {request.content}
                          </button>
                        </TableCell>
                        <TableCell className="text-sm">
                          {request.counselor_name || (
                            <span className="text-muted-foreground">미배정</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusConfig[request.status].color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {request.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 justify-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(request)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteConfirm(request.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* 전체 개수 */}
          <div className="text-sm text-muted-foreground text-right mt-4">
            전체 {stats.total}개 중 {filteredRequests.length}개 표시
          </div>
        </CardContent>
      </Card>

      {/* 수정 모달 */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>상담 요청 수정</DialogTitle>
            <DialogDescription>
              상담 요청의 상태와 담당자를 변경할 수 있습니다.
            </DialogDescription>
          </DialogHeader>

          {editingRequest && (
            <div className="space-y-4">
              <div>
                <Label>학생명</Label>
                <div className="text-sm text-muted-foreground mt-1">
                  {editingRequest.student_name}
                </div>
              </div>

              <div>
                <Label>요청 내용</Label>
                <Textarea
                  value={editingRequest.content}
                  readOnly
                  className="mt-1 bg-muted"
                  rows={3}
                />
              </div>

              <div>
                <Label>상태</Label>
                <Select
                  value={editingRequest.status}
                  onValueChange={(value: ConsultationRequestStatus) =>
                    setEditingRequest({ ...editingRequest, status: value })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="대기중">대기중</SelectItem>
                    <SelectItem value="완료">완료</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>담당자</Label>
                <Select
                  value={editingRequest.counselor_id || "unassigned"}
                  onValueChange={(value) =>
                    setEditingRequest({
                      ...editingRequest,
                      counselor_id: value === "unassigned" ? null : value
                    })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="담당자 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">미배정</SelectItem>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveEdit}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 모달 */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>상담 요청 삭제</DialogTitle>
            <DialogDescription>
              정말로 이 상담 요청을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 요청내용 상세보기 모달 */}
      <Dialog open={isContentModalOpen} onOpenChange={setIsContentModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>상담 요청 내용</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <div className="bg-muted p-4 rounded-md whitespace-pre-wrap">
              {viewingContent}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsContentModalOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
