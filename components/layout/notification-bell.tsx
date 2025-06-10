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
import { toast } from "@/components/ui/use-toast"
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
      console.log('🔍 알림 벨: loadData 시작, 사용자:', user)
      if (!user) {
        console.log('🔍 알림 벨: 사용자 없음, 종료')
        return
      }

      try {
        console.log('🔍 알림 벨: 사용자 ID:', user.id)
        
        // 관리자 권한 확인
        const { data: employee, error: employeeError } = await supabase
          .from("employees")
          .select("position, name")
          .eq("auth_id", user.id)
          .single()

        console.log('🔍 알림 벨: 직원 조회 결과:', { employee, employeeError })
        
        const adminStatus = employee?.position === "원장" || employee?.position === "부원장"
        console.log('🔍 알림 벨: 관리자 여부:', adminStatus)
        
        setIsAdmin(adminStatus)

        if (!adminStatus) {
          console.log('🔍 알림 벨: 관리자 아님, 종료')
          return
        }

        // 승인 대기 중인 사용자 목록 가져오기
        console.log('🔍 알림 벨: pending 사용자 조회 시작')
        const { data: pendingUsersData, error } = await supabase
          .from("profiles")
          .select("id, name, email, approval_status, created_at")
          .eq("approval_status", "pending")
          .order("created_at", { ascending: false })

        console.log('🔍 알림 벨: 조회 결과:', { pendingUsersData, error })
        
        if (error) {
          console.error("❌ 알림 벨: pending 사용자 조회 오류:", error)
        } else {
          console.log('✅ 알림 벨: pending 사용자 설정:', pendingUsersData?.length || 0, '명')
          setPendingUsers(pendingUsersData || [])
        }
      } catch (error) {
        console.error("❌ 알림 벨: 전체 오류:", error)
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
            toast({
              title: "🔔 새로운 회원가입!",
              description: `${payload.new.email}님이 회원가입했습니다. 승인이 필요합니다.`,
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
          console.log('📨 알림 벨: UPDATE 이벤트 수신:', payload)
          
          // pending으로 변경된 경우 목록에 추가
          if (payload.new.approval_status === "pending") {
            console.log('📨 알림 벨: pending 상태 추가')
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
            console.log('📨 알림 벨: pending 아닌 상태로 변경, 목록에서 제거')
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
      console.log('🔄 알림 벨: 수동 새로고침')
      
      // 먼저 서버 사이드 테스트
      const serverResult = await testGetPendingUsers()
      console.log('🧪 서버 사이드 테스트 결과:', serverResult)
      
      // 클라이언트 사이드 조회 (대체 방법)
      console.log('🔄 알림 벨: 대체 방법 시도 - 서버 데이터 사용')
      
      // 서버 사이드 데이터가 있으면 그것을 사용
      if (serverResult.success && serverResult.pendingUsers) {
        console.log('✅ 알림 벨: 서버 데이터 사용:', serverResult.pendingUsers.length, '명')
        setPendingUsers(serverResult.pendingUsers)
        return
      }
      
      // 폴백: 클라이언트 사이드 조회
      const { data: pendingUsersData, error } = await supabase
        .from("profiles")
        .select("id, name, email, approval_status, created_at")
        .eq("approval_status", "pending")
        .order("created_at", { ascending: false })

      console.log('🖥️ 클라이언트 사이드 결과:', { pendingUsersData, error })
      
      if (error) {
        console.error("❌ 알림 벨: 새로고침 오류:", error)
      } else {
        console.log('🔄 알림 벨: 새로고침 완료:', pendingUsersData?.length || 0, '명')
        setPendingUsers(pendingUsersData || [])
      }
    } catch (error) {
      console.error("❌ 알림 벨: 새로고침 전체 오류:", error)
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
              승인 대기 알림
              {pendingCount > 0 && (
                <Badge variant="destructive">{pendingCount}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {pendingCount === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">승인 대기 중인 사용자가 없습니다</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {pendingUsers.map((user) => (
                  <div key={user.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{user.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.name && user.name.trim() !== "" ? user.name : "이름 없음"} • {new Date(user.created_at).toLocaleDateString("ko-KR")}
                        </p>
                      </div>
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        <Clock className="w-3 h-3 mr-1" />
                        대기
                      </Badge>
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
                        직원 관리에서 연결하기
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
