"use client"

import { useState, useEffect } from "react"
import { Bell, UserCheck, UserX, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { testGetPendingUsers } from "@/actions/test-pending-users"

interface PendingUser {
  id: string
  email: string
  name: string
  approval_status: string
  created_at: string
}

interface NotificationBellProps {
  user: any
}

export function NotificationBell({ user }: NotificationBellProps) {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const supabase = createClientComponentClient()

  // 관리자 권한 및 데이터 로드
  useEffect(() => {
    async function loadData() {
      if (!user) {
        return
      }

      try {
        
        // 관리자 권한 확인
        const { data: employee, error: employeeError } = await supabase
          .from("employees")
          .select("position, name")
          .eq("auth_id", user.id)
          .single()

        
        const adminStatus = employee?.position === "원장" || employee?.position === "부원장"
        
        setIsAdmin(adminStatus)

        if (!adminStatus) {
          return
        }

        // 승인 대기 중인 사용자 목록 가져오기
        const { data: pendingUsersData, error } = await supabase
          .from("profiles")
          .select("id, name, email, approval_status, created_at")
          .eq("approval_status", "pending")
          .order("created_at", { ascending: false })

        
        if (error) {
        } else {
          setPendingUsers(pendingUsersData || [])
        }
      } catch (error) {
      }
    }

    loadData()
  }, [user, supabase])

  // 실시간 새로운 승인 요청 구독
  useEffect(() => {
    if (!isAdmin) return

    const channel = supabase
      .channel("notification_bell")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "profiles",
        },
        (payload) => {
          if (payload.new.approval_status === "pending") {
            // 새로운 승인 요청 알림
            toast.info(`🔔 ${payload.new.email}님이 회원가입했습니다. 승인이 필요합니다.`, {
              duration: 10000,
            })

            // 목록에 추가
            setPendingUsers(prev => [payload.new as PendingUser, ...prev])
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
          
          // pending으로 변경된 경우 목록에 추가
          if (payload.new.approval_status === "pending") {
            setPendingUsers(prev => {
              // 중복 확인
              const exists = prev.some(user => user.id === payload.new.id)
              if (exists) {
                return prev.map(user => 
                  user.id === payload.new.id ? payload.new as PendingUser : user
                )
              }
              return [payload.new as PendingUser, ...prev]
            })
          }
          // 승인/거부 시 목록에서 제거
          else if (payload.new.approval_status !== "pending") {
            setPendingUsers(prev => prev.filter(user => user.id !== payload.new.id))
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [isAdmin, supabase])

  // 수동 새로고침 기능 추가
  const refreshPendingUsers = async () => {
    if (!isAdmin) return
    
    try {
      
      // 먼저 서버 사이드 테스트
      const serverResult = await testGetPendingUsers()
      
      // 클라이언트 사이드 조회 (대체 방법)
      
      // 서버 사이드 데이터가 있으면 그것을 사용
      if (serverResult.success && serverResult.pendingUsers) {
        setPendingUsers(serverResult.pendingUsers)
        return
      }
      
      // 폴백: 클라이언트 사이드 조회
      const { data: pendingUsersData, error } = await supabase
        .from("profiles")
        .select("id, name, email, approval_status, created_at")
        .eq("approval_status", "pending")
        .order("created_at", { ascending: false })

      
      if (error) {
      } else {
        setPendingUsers(pendingUsersData || [])
      }
    } catch (error) {
    }
  }

  // 드롭다운 열 때마다 새로고침
  useEffect(() => {
    if (isOpen && isAdmin) {
      refreshPendingUsers()
    }
  }, [isOpen, isAdmin])

  // 관리자가 아니면 일반 알림 버튼만 표시
  if (!isAdmin) {
    return (
      <Button 
        variant="ghost" 
        size="icon" 
        className="relative h-9 w-9 rounded-full hover:bg-gray-100 transition-colors"
        disabled
      >
        <Bell className="h-4 w-4" />
      </Button>
    )
  }

  const pendingCount = pendingUsers.length

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative h-9 w-9 rounded-full hover:bg-gray-100 transition-colors"
        >
          <Bell className="h-4 w-4" />
          {pendingCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {pendingCount > 9 ? "9+" : pendingCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="w-4 h-4" />
              신규 가입 알림
              {pendingCount > 0 && (
                <Badge variant="destructive">{pendingCount}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {pendingCount === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">신규 가입 신청이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {pendingUsers.map((user) => (
                  <div key={user.id} className="border rounded-lg p-3 space-y-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        이름: {user.name && user.name.trim() !== "" ? user.name : "이름 없음"}, 이메일: {user.email}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        신청 계정연결 하세요
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsOpen(false)
                          window.location.href = '/employees'
                        }}
                        className="flex-1"
                      >
                        <UserCheck className="w-3 h-3 mr-1" />
                        확인
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
