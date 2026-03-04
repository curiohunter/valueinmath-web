"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { UserCheck, UserX, Clock, Bell } from "lucide-react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

interface PendingUser {
  id: string
  email: string | null
  name: string | null
  approval_status: string | null
  created_at: string | null
}

export function PendingApprovalSection() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const supabase = getSupabaseBrowserClient()

  // 관리자 권한 및 데이터 로드
  useEffect(() => {
    async function loadData() {
      try {
        // 관리자 권한 확인 (getUser()로 서버 검증)
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return

        const { data: employee } = await supabase
          .from("employees")
          .select("position")
          .eq("auth_id", user.id)
          .single()

        const adminStatus = employee?.position === "원장" || employee?.position === "부원장"
        setIsAdmin(adminStatus)

        if (!adminStatus) {
          setIsLoading(false)
          return
        }

        // 승인 대기 중인 사용자 목록 가져오기
        const { data: pendingUsersData, error } = await supabase
          .from("profiles")
          .select("id, name, email, approval_status, created_at")
          .in("approval_status", ["pending", "rejected"])
          .order("created_at", { ascending: false })

        if (error) {
          console.error("Error fetching pending users:", error)
        } else {
          setPendingUsers((pendingUsersData || []) as PendingUser[])
        }
      } catch (error) {
        console.error("Error loading data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  // 실시간 새로운 승인 요청 구독
  useEffect(() => {
    if (!isAdmin) return

    const channel = supabase
      .channel("pending_approvals")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public", 
          table: "profiles",
        },
        (payload) => {
          const newUser = payload.new as PendingUser
          if (newUser.approval_status === "pending") {
            // 새로운 승인 요청 알림
            toast.info(`🔔 ${newUser.email}님이 회원가입했습니다. 승인이 필요합니다.`, {
              duration: 10000, // 10초간 표시
            })

            // 목록에 추가
            setPendingUsers(prev => [newUser, ...prev])
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
        },
        (payload) => {
          const updatedUser = payload.new as PendingUser
          // 승인 상태 변경 시 목록 업데이트
          setPendingUsers(prev => 
            prev.map(user => 
              user.id === updatedUser.id 
                ? { ...user, approval_status: updatedUser.approval_status }
                : user
            )
          )
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [isAdmin, supabase])

  // 사용자 승인 처리
  const handleApproveUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ approval_status: "approved" })
        .eq("id", userId)

      if (error) throw error

      toast.success("사용자가 성공적으로 승인되었습니다.")

      // 승인된 사용자를 목록에서 제거
      setPendingUsers(prev => prev.filter(user => user.id !== userId))
    } catch (error) {
      console.error("Error approving user:", error)
      toast.error("사용자 승인 중 오류가 발생했습니다.")
    }
  }

  // 사용자 거부 처리
  const handleRejectUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ approval_status: "rejected" })
        .eq("id", userId)

      if (error) throw error

      toast.info("사용자가 거부되었습니다.")

      // 상태 업데이트
      setPendingUsers(prev => 
        prev.map(user => 
          user.id === userId 
            ? { ...user, approval_status: "rejected" }
            : user
        )
      )
    } catch (error) {
      console.error("Error rejecting user:", error)
      toast.error("사용자 거부 중 오류가 발생했습니다.")
    }
  }

  // 거부된 사용자 재검토 처리
  const handleReapproveUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ approval_status: "pending" })
        .eq("id", userId)

      if (error) throw error

      toast.info("사용자가 승인 대기 상태로 변경되었습니다.")

      // 상태 업데이트
      setPendingUsers(prev => 
        prev.map(user => 
          user.id === userId 
            ? { ...user, approval_status: "pending" }
            : user
        )
      )
    } catch (error) {
      console.error("Error re-approving user:", error)
      toast.error("재검토 요청 중 오류가 발생했습니다.")
    }
  }

  // 승인 상태 뱃지
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            승인 대기
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            <UserX className="w-3 h-3 mr-1" />
            거부됨
          </Badge>
        )
      default:
        return null
    }
  }

  // 관리자가 아니면 렌더링하지 않음
  if (!isAdmin) return null

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            사용자 승인 관리
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">로딩 중...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          사용자 승인 관리
          {pendingUsers.filter(u => u.approval_status === "pending").length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {pendingUsers.filter(u => u.approval_status === "pending").length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pendingUsers.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">승인 대기 중인 사용자가 없습니다.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이메일</TableHead>
                <TableHead>이름</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>등록일</TableHead>
                <TableHead>작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email || "이메일 없음"}</TableCell>
                  <TableCell>{user.name || "이름 없음"}</TableCell>
                  <TableCell>{getStatusBadge(user.approval_status || "")}</TableCell>
                  <TableCell>
                    {user.created_at ? new Date(user.created_at).toLocaleDateString("ko-KR", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    }) : "날짜 없음"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {user.approval_status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleApproveUser(user.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <UserCheck className="w-4 h-4 mr-1" />
                            승인
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRejectUser(user.id)}
                          >
                            <UserX className="w-4 h-4 mr-1" />
                            거부
                          </Button>
                        </>
                      )}
                      {user.approval_status === "rejected" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReapproveUser(user.id)}
                        >
                          <Clock className="w-4 h-4 mr-1" />
                          재검토
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
