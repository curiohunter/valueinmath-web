"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Trash2, AlertTriangle, RefreshCw, UserX } from "lucide-react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface PendingUser {
  id: string
  email: string | null
  name: string | null
  role: string | null
  created_at: string
}

export function PendingUsersSection() {
  const [users, setUsers] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchDeleting, setBatchDeleting] = useState(false)
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false)
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 })

  const fetchPendingUsers = async () => {
    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, name, role, created_at")
      .eq("approval_status", "pending")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching pending users:", error)
      toast.error("미승인 사용자 목록을 불러오는데 실패했습니다")
    } else {
      setUsers(data || [])
    }
    setSelectedIds(new Set())
    setLoading(false)
  }

  useEffect(() => {
    fetchPendingUsers()
  }, [])

  const handleDelete = async () => {
    if (!deleteUserId) return

    setDeleting(true)
    try {
      const response = await fetch("/api/auth/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: deleteUserId }),
      })

      const result = await response.json()

      if (response.ok) {
        toast.success("사용자가 삭제되었습니다")
        setUsers(users.filter(u => u.id !== deleteUserId))
        setSelectedIds(prev => {
          const next = new Set(prev)
          next.delete(deleteUserId)
          return next
        })
      } else {
        toast.error(result.error || "삭제 실패")
      }
    } catch (error) {
      console.error("Delete error:", error)
      toast.error("삭제 중 오류가 발생했습니다")
    } finally {
      setDeleting(false)
      setDeleteUserId(null)
    }
  }

  const handleBatchDelete = async () => {
    const idsToDelete = Array.from(selectedIds)
    if (idsToDelete.length === 0) return

    setBatchDeleting(true)
    setBatchProgress({ current: 0, total: idsToDelete.length })

    let successCount = 0
    let failCount = 0
    const deletedIds: string[] = []

    for (const userId of idsToDelete) {
      try {
        const response = await fetch("/api/auth/delete-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        })

        if (response.ok) {
          successCount++
          deletedIds.push(userId)
        } else {
          failCount++
        }
      } catch {
        failCount++
      }
      setBatchProgress(prev => ({ ...prev, current: prev.current + 1 }))
    }

    setUsers(prev => prev.filter(u => !deletedIds.includes(u.id)))
    setSelectedIds(new Set())

    if (failCount === 0) {
      toast.success(`${successCount}명 삭제 완료`)
    } else {
      toast.warning(`${successCount}명 삭제, ${failCount}명 실패`)
    }

    setBatchDeleting(false)
    setBatchDeleteConfirm(false)
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === users.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(users.map(u => u.id)))
    }
  }

  // 의심스러운 이름 패턴 감지 (무작위 문자열)
  const isSuspiciousName = (name: string | null): boolean => {
    if (!name) return false
    // 연속된 자음/모음 없는 긴 문자열, 또는 무작위 패턴
    const randomPattern = /^[a-zA-Z]{15,}$/
    const hasNoVowelPattern = /^[^aeiouAEIOU]{8,}$/
    return randomPattern.test(name) || hasNoVowelPattern.test(name)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserX className="h-5 w-5" />
            미승인 사용자 관리
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserX className="h-5 w-5" />
                미승인 사용자 관리
              </CardTitle>
              <CardDescription className="mt-1">
                가입 후 승인 대기 중인 사용자 목록입니다. 스팸이나 의심스러운 가입은 삭제할 수 있습니다.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setBatchDeleteConfirm(true)}
                  disabled={batchDeleting}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {batchDeleting
                    ? `삭제 중 (${batchProgress.current}/${batchProgress.total})`
                    : `선택 삭제 (${selectedIds.size})`}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={fetchPendingUsers}>
                <RefreshCw className="h-4 w-4 mr-2" />
                새로고침
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              미승인 대기 중인 사용자가 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {users.length > 1 && (
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Checkbox
                    checked={selectedIds.size === users.length}
                    onCheckedChange={toggleSelectAll}
                    disabled={batchDeleting}
                  />
                  <span className="text-sm text-muted-foreground">
                    전체 선택 ({users.length}명)
                  </span>
                </div>
              )}
              {users.map((user) => {
                const suspicious = isSuspiciousName(user.name)
                return (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      suspicious ? "border-red-200 bg-red-50" : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Checkbox
                        checked={selectedIds.has(user.id)}
                        onCheckedChange={() => toggleSelect(user.id)}
                        disabled={batchDeleting}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {user.name || "(이름 없음)"}
                          </span>
                          {suspicious && (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              의심
                            </Badge>
                          )}
                          {user.role && (
                            <Badge variant="secondary">{user.role}</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {user.email || "(이메일 없음)"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          가입일: {formatDate(user.created_at)}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteUserId(user.id)}
                      disabled={batchDeleting}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      삭제
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 개별 삭제 확인 다이얼로그 */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>사용자 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 사용자를 완전히 삭제하시겠습니까?
              <br />
              <span className="text-red-600 font-medium">
                이 작업은 되돌릴 수 없으며, 인증 정보와 프로필이 모두 삭제됩니다.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 일괄 삭제 확인 다이얼로그 */}
      <AlertDialog open={batchDeleteConfirm} onOpenChange={setBatchDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>선택 사용자 일괄 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              선택한 <strong>{selectedIds.size}명</strong>의 사용자를 모두 삭제하시겠습니까?
              <br />
              <span className="text-red-600 font-medium">
                이 작업은 되돌릴 수 없으며, 모든 인증 정보와 프로필이 삭제됩니다.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={batchDeleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchDelete}
              disabled={batchDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {batchDeleting
                ? `삭제 중 (${batchProgress.current}/${batchProgress.total})...`
                : `${selectedIds.size}명 삭제`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
