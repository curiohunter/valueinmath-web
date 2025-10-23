"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"

interface ApprovedRegistration {
  id: string
  name: string
  email: string
  role: string
  student_id: string | null
  student_name: string | null
  created_at: string
  approval_status: string
  student_grade: number | null
  student_school: string | null
}

interface ApprovedRegistrationsTableProps {
  registrations: ApprovedRegistration[]
  loading: boolean
}

const ITEMS_PER_PAGE = 10

export function ApprovedRegistrationsTable({
  registrations,
  loading,
}: ApprovedRegistrationsTableProps) {
  const [currentPage, setCurrentPage] = useState(1)

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
                    <th className="text-left py-3 px-4 font-medium text-sm">학생명</th>
                    <th className="text-left py-3 px-4 font-medium text-sm">학교</th>
                    <th className="text-left py-3 px-4 font-medium text-sm">학년</th>
                    <th className="text-left py-3 px-4 font-medium text-sm">가입일</th>
                    <th className="text-left py-3 px-4 font-medium text-sm">승인일</th>
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
                      <td className="py-3 px-4">{registration.student_name || "-"}</td>
                      <td className="py-3 px-4">
                        {registration.student_school?.replace(/학교$/, "") || "-"}
                      </td>
                      <td className="py-3 px-4">
                        {registration.student_grade ? `${registration.student_grade}학년` : "-"}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {format(new Date(registration.created_at), "yyyy-MM-dd", { locale: ko })}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {registration.created_at
                          ? format(new Date(registration.created_at), "yyyy-MM-dd HH:mm", {
                              locale: ko,
                            })
                          : "-"}
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
