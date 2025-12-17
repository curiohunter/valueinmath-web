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
import { EditStudentLinkModal } from "./edit-student-link-modal"

interface PendingApproval {
  id: string
  user_id: string | null
  email: string
  name: string
  role: string
  student_name: string | null
  student_names: string[] | null
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
  created_at: string
  approval_status: string
  student_names: string[]
}

export function ParentStudentApprovalSection() {
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([])
  const [approvedRegistrations, setApprovedRegistrations] = useState<ApprovedRegistration[]>([])
  const [loading, setLoading] = useState(true)
  const [approvedLoading, setApprovedLoading] = useState(true)
  const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedEditProfile, setSelectedEditProfile] = useState<ApprovedRegistration | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

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
      // Get student info for each registration (use first student name for display)
      const approvalsWithStudentInfo = await Promise.all(
        (data || []).map(async (reg) => {
          const studentName = reg.student_names?.[0] || reg.student_name
          if (studentName) {
            const { data: student } = await supabase
              .from("students")
              .select("grade, school")
              .eq("name", studentName)
              .single()

            return {
              ...reg,
              student_names: reg.student_names || (reg.student_name ? [reg.student_name] : null),
              student_grade: student?.grade || null,
              student_school: student?.school || null,
            }
          }
          return {
            ...reg,
            student_names: reg.student_names || null,
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

    // Get approved profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, name, email, role, created_at, approval_status")
      .eq("approval_status", "approved")
      .in("role", ["student", "parent"])
      .order("created_at", { ascending: false })

    if (profilesError) {
      console.error("Failed to load approved registrations:", profilesError)
      toast.error("승인 내역을 불러오는데 실패했습니다")
      setApprovedRegistrations([])
      setApprovedLoading(false)
      return
    }

    // Get student names for each profile via profile_students junction table
    const registrationsWithStudentInfo = await Promise.all(
      (profiles || []).map(async (profile) => {
        // Query profile_students to get linked students
        const { data: profileStudents, error: psError } = await supabase
          .from("profile_students")
          .select("student_id, is_primary")
          .eq("profile_id", profile.id)
          .order("is_primary", { ascending: false })

        if (psError) {
          console.error("Error fetching profile_students:", psError)
          return {
            ...profile,
            student_names: [],
          }
        }

        if (!profileStudents || profileStudents.length === 0) {
          return {
            ...profile,
            student_names: [],
          }
        }

        // Get student names
        const studentIds = profileStudents.map(ps => ps.student_id)
        const { data: students, error: studentsError } = await supabase
          .from("students")
          .select("id, name")
          .in("id", studentIds)

        if (studentsError) {
          console.error("Error fetching students:", studentsError)
          return {
            ...profile,
            student_names: [],
          }
        }

        // Order student names by is_primary (primary first)
        const orderedNames = profileStudents.map(ps => {
          const student = students?.find(s => s.id === ps.student_id)
          return student?.name || "알 수 없음"
        })

        return {
          ...profile,
          student_names: orderedNames,
        }
      })
    )

    // Filter to only show profiles with linked students
    const filteredRegistrations = registrationsWithStudentInfo.filter(r => r.student_names.length > 0)
    setApprovedRegistrations(filteredRegistrations)
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

  const handleEditProfile = (registration: ApprovedRegistration) => {
    setSelectedEditProfile(registration)
    setIsEditModalOpen(true)
  }

  const handleRevokeApproval = async (registration: ApprovedRegistration) => {
    const supabase = createClient()

    try {
      // 1. Delete all profile_students records for this user
      const { error: psDeleteError } = await supabase
        .from("profile_students")
        .delete()
        .eq("profile_id", registration.id)

      if (psDeleteError) {
        throw psDeleteError
      }

      // 2. Update profiles: set student_id to null and approval_status to pending
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          student_id: null,
          approval_status: "pending",
        })
        .eq("id", registration.id)

      if (profileError) {
        throw profileError
      }

      // 3. Update pending_registrations status back to pending (if exists)
      await supabase
        .from("pending_registrations")
        .update({ status: "pending" })
        .eq("user_id", registration.id)

      toast.success("승인이 취소되었습니다. 대기 목록에서 다시 승인할 수 있습니다.")
      loadPendingApprovals()
      loadApprovedRegistrations()
    } catch (error: any) {
      console.error("Revoke approval failed:", error)
      toast.error("승인 취소에 실패했습니다: " + (error.message || ""))
    }
  }

  const handleEditSuccess = () => {
    setIsEditModalOpen(false)
    setSelectedEditProfile(null)
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
                      {(approval.student_names?.length || approval.student_name) && (
                        <div className="flex items-center gap-1">
                          학생: <span className="font-medium text-foreground">
                            {approval.student_names?.join(", ") || approval.student_name}
                            {approval.student_names?.length === 1 && approval.student_school && ` (${approval.student_school.replace(/학교$/, "")}${approval.student_grade || ""})`}
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
          onEdit={handleEditProfile}
          onRevoke={handleRevokeApproval}
          onRefresh={loadApprovedRegistrations}
        />
      </div>

      {/* Edit Student Link Modal */}
      {selectedEditProfile && (
        <EditStudentLinkModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setSelectedEditProfile(null)
          }}
          profile={selectedEditProfile}
          onSuccess={handleEditSuccess}
        />
      )}
    </>
  )
}
