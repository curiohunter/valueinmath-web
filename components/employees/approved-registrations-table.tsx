"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Pencil, Trash2, Undo2 } from "lucide-react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { toast } from "sonner"

interface ApprovedRegistration {
  id: string
  name: string
  email: string
  role: string
  created_at: string
  approval_status: string
  student_names: string[]
}

interface ApprovedRegistrationsTableProps {
  registrations: ApprovedRegistration[]
  loading: boolean
  onEdit?: (registration: ApprovedRegistration) => void
  onRevoke?: (registration: ApprovedRegistration) => void
  onRefresh?: () => void
}

const ITEMS_PER_PAGE = 10

export function ApprovedRegistrationsTable({
  registrations,
  loading,
  onEdit,
  onRevoke,
  onRefresh,
}: ApprovedRegistrationsTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)

  const handleDelete = async (registration: ApprovedRegistration) => {
    if (!confirm(`정말 이 계정을 완전히 삭제하시겠습니까?\n\n이름: ${registration.name}\n이메일: ${registration.email}\n\n⚠️ 이 작업은 되돌릴 수 없습니다.\n- Auth 계정 삭제\n- 프로필 삭제\n- 학생 연결 정보 삭제`)) {
      return
    }

    setDeleting(registration.id)
    try {
      // Call API to delete user completely (Auth + profile + profile_students)
      const response = await fetch("/api/auth/delete-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: registration.id }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "계정 삭제에 실패했습니다")
      }

      toast.success("계정이 완전히 삭제되었습니다")
      onRefresh?.()
    } catch (error: any) {
      toast.error(error.message || "계정 삭제에 실패했습니다")
      console.error("Delete error:", error)
    } finally {
      setDeleting(null)
    }
  }

  const handleRevoke = async (registration: ApprovedRegistration) => {
    if (!confirm(`정말 이 계정의 승인을 취소하시겠습니까?\n\n이름: ${registration.name}\n이메일: ${registration.email}\n\n승인 취소 시:\n- 학생 연결 정보 삭제\n- 승인 상태가 '대기'로 변경됨\n- 계정은 삭제되지 않습니다`)) {
      return
    }

    setRevoking(registration.id)
    try {
      await onRevoke?.(registration)
    } finally {
      setRevoking(null)
    }
  }

  const totalPages = Math.ceil(registrations.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentRegistrations = registrations.slice(startIndex, endIndex)

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1))
  }

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>승인 내역</CardTitle>
        <CardDescription>
          승인된 학부모/학생 계정 ({registrations.length}개)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">로딩 중...</div>
          </div>
        ) : registrations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            승인 내역이 없습니다.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-sm">이름</th>
                    <th className="text-left py-3 px-4 font-medium text-sm">역할</th>
                    <th className="text-left py-3 px-4 font-medium text-sm">연결된 학생</th>
                    <th className="text-left py-3 px-4 font-medium text-sm">가입일</th>
                    <th className="text-right py-3 px-4 font-medium text-sm">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRegistrations.map((registration) => (
                    <tr key={registration.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div className="font-medium">{registration.name}</div>
                        <div className="text-xs text-muted-foreground">{registration.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={registration.role === "student" ? "default" : "secondary"}>
                          {registration.role === "student" ? "학생" : "학부모"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {registration.student_names.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {registration.student_names.map((name, index) => (
                              <Badge
                                key={index}
                                variant={index === 0 ? "default" : "outline"}
                                className="text-xs"
                              >
                                {index === 0 && registration.student_names.length > 1 && (
                                  <span className="mr-1 opacity-70">대표</span>
                                )}
                                {name}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {format(new Date(registration.created_at), "yyyy-MM-dd", { locale: ko })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEdit?.(registration)}
                            className="h-8"
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            수정
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleRevoke(registration)}
                            disabled={revoking === registration.id}
                            className="h-8"
                          >
                            <Undo2 className="h-3 w-3 mr-1" />
                            {revoking === registration.id ? "취소 중..." : "승인취소"}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(registration)}
                            disabled={deleting === registration.id}
                            className="h-8"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            {deleting === registration.id ? "삭제 중..." : "삭제"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  {startIndex + 1}-{Math.min(endIndex, registrations.length)} / {registrations.length}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    이전
                  </Button>
                  <div className="text-sm">
                    {currentPage} / {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                  >
                    다음
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
