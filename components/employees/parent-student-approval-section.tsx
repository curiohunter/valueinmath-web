"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { UserCheck, UserX, Mail, Calendar, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { toast } from "sonner"
import { ParentStudentApprovalModal } from "./parent-student-approval-modal"
import { ApprovedRegistrationsTable } from "./approved-registrations-table"

interface PendingApproval {
  id: string
  user_id: string | null
  email: string
  name: string
  role: string
  student_name: string | null
  status: string | null
  created_at: string | null
  student_grade: number | null
  student_school: string | null
}

interface ApprovedRegistration {
  id: string
  name: string
  email: string
  role: string
  student_id: string | null
  created_at: string
  approval_status: string
  student_grade: number | null
  student_school: string | null
  student_name: string | null
}

export function ParentStudentApprovalSection() {
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([])
  const [approvedRegistrations, setApprovedRegistrations] = useState<ApprovedRegistration[]>([])
  const [loading, setLoading] = useState(true)
  const [approvedLoading, setApprovedLoading] = useState(true)
  const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const loadPendingApprovals = async () => {
    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from("pending_registrations")
      .select("*")
      .eq("status", "pending")
      .in("role", ["student", "parent"])
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Failed to load pending approvals:", error)
      toast.error("대기 중인 승인을 불러오는데 실패했습니다")
      setPendingApprovals([])
    } else {
      // Get student info for each registration
      const approvalsWithStudentInfo = await Promise.all(
        (data || []).map(async (reg) => {
          if (reg.student_name) {
            const { data: student } = await supabase
              .from("students")
              .select("grade, school")
              .eq("name", reg.student_name)
              .single()

            return {
              ...reg,
              student_grade: student?.grade || null,
              student_school: student?.school || null,
            }
          }
          return {
            ...reg,
            student_grade: null,
            student_school: null,
          }
        })
      )
      setPendingApprovals(approvalsWithStudentInfo)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadPendingApprovals()
    loadApprovedRegistrations()
  }, [])

  const loadApprovedRegistrations = async () => {
    setApprovedLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, email, role, student_id, created_at, approval_status")
      .eq("approval_status", "approved")
      .in("role", ["student", "parent"])
      .not("student_id", "is", null)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Failed to load approved registrations:", error)
      toast.error("승인 내역을 불러오는데 실패했습니다")
      setApprovedRegistrations([])
    } else {
      // Get student info for each registration using student_id
      const registrationsWithStudentInfo = await Promise.all(
        (data || []).map(async (reg) => {
          if (reg.student_id) {
            const { data: student, error: studentError } = await supabase
              .from("students")
              .select("name, grade, school")
              .eq("id", reg.student_id)
              .maybeSingle()

            if (studentError) {
              console.error("Error fetching student info:", studentError, "for student_id:", reg.student_id)
            }

            return {
              ...reg,
              student_name: student?.name || null,
              student_grade: student?.grade || null,
              student_school: student?.school || null,
            }
          }
          return {
            ...reg,
            student_name: null,
            student_grade: null,
            student_school: null,
          }
        })
      )

      console.log("Approved registrations with student info:", registrationsWithStudentInfo)
      setApprovedRegistrations(registrationsWithStudentInfo)
    }
    setApprovedLoading(false)
  }

  const handleApprove = (approval: PendingApproval) => {
    setSelectedApproval(approval)
    setIsModalOpen(true)
  }

  const handleReject = async (approvalId: string) => {
    if (!confirm("정말 이 계정을 거부하시겠습니까?")) {
      return
    }

    const supabase = createClient()
    const { error } = await supabase
      .from("pending_registrations")
      .update({ status: "rejected" })
      .eq("id", approvalId)

    if (error) {
      toast.error("계정 거부에 실패했습니다")
      console.error(error)
    } else {
      toast.success("계정이 거부되었습니다")
      loadPendingApprovals()
    }
  }

  const handleDelete = async (registration: PendingApproval) => {
    if (!confirm(`정말 이 계정을 완전히 삭제하시겠습니까?\n이메일: ${registration.email}\n\n이 작업은 되돌릴 수 없습니다.`)) {
      return
    }

    try {
      // If user_id exists, delete from Auth
      if (registration.user_id) {
        const response = await fetch("/api/auth/delete-user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId: registration.user_id }),
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || "계정 삭제에 실패했습니다")
        }
      }

      // Delete from pending_registrations
      const supabase = createClient()
      const { error } = await supabase
        .from("pending_registrations")
        .delete()
        .eq("id", registration.id)

      if (error) {
        throw new Error(error.message)
      }

      toast.success("계정이 완전히 삭제되었습니다")
      loadPendingApprovals()
    } catch (error: any) {
      toast.error(error.message || "계정 삭제에 실패했습니다")
      console.error(error)
    }
  }

  const handleApprovalSuccess = () => {
    setIsModalOpen(false)
    setSelectedApproval(null)
    loadPendingApprovals()
    loadApprovedRegistrations()
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>학부모/학생 승인</CardTitle>
          <CardDescription>신규 학부모 및 학생 계정 승인 관리</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">로딩 중...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>학부모/학생 승인</CardTitle>
          <CardDescription>신규 학부모 및 학생 계정 승인 관리</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingApprovals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              대기 중인 승인 요청이 없습니다.
            </div>
          ) : (
            <div className="space-y-4">
              {pendingApprovals.map((approval) => (
                <div
                  key={approval.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="font-medium">
                        {approval.name}
                      </div>
                      <Badge
                        variant={approval.role === "student" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {approval.role === "student" ? "학생" : "학부모"}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        승인 대기
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {approval.email}
                      </div>
                      {approval.student_name && (
                        <div className="flex items-center gap-1">
                          학생: <span className="font-medium text-foreground">
                            {approval.student_name}
                            {approval.student_school && ` (${approval.student_school.replace(/학교$/, "")}${approval.student_grade || ""})`}
                          </span>
                        </div>
                      )}
                      {approval.created_at && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(approval.created_at), "yyyy년 M월 d일", {
                            locale: ko,
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(approval)}
                      className="flex items-center gap-1"
                    >
                      <UserCheck className="h-4 w-4" />
                      승인
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(approval.id)}
                      className="flex items-center gap-1"
                    >
                      <UserX className="h-4 w-4" />
                      거부
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(approval)}
                      className="flex items-center gap-1"
                    >
                      <Trash2 className="h-4 w-4" />
                      삭제
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedApproval && (
        <ParentStudentApprovalModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedApproval(null)
          }}
          approval={selectedApproval}
          onSuccess={handleApprovalSuccess}
        />
      )}

      {/* Approved Registrations Table */}
      <div className="mt-6">
        <ApprovedRegistrationsTable
          registrations={approvedRegistrations}
          loading={approvedLoading}
        />
      </div>
    </>
  )
}
