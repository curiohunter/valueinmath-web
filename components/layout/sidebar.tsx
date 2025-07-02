"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Users, Calendar, BookOpen, BarChart3, Settings, Home, LogOut, UserCog, Crown, Bot } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"
// 기존 import 문에서 getUnreadMessagesCount를 제거합니다
// import { getUnreadMessagesCount } from "@/services/chat-service"
// 기존 import 문에 signOut 서버 액션 추가
import { signOut } from "@/actions/auth-actions"

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = getSupabaseBrowserClient()
  const { toast } = useToast()

  // 관리자 권한 확인
  useEffect(() => {
    async function checkAdminStatus() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          setIsAdmin(false)
          setIsLoading(false)
          return
        }

        const { data: employee, error } = await supabase
          .from("employees")
          .select("position")
          .eq("auth_id", session.user.id)
          .maybeSingle()

        if (error) {
          console.error("Error checking admin status:", error)
          setIsAdmin(false)
          return
        }

        setIsAdmin(employee?.position === "원장" || employee?.position === "부원장")
      } catch (error) {
        console.error("Error checking admin status:", error)
        setIsAdmin(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkAdminStatus()
  }, [])

  // 읽지 않은 메시지 수 가져오기
  useEffect(() => {
    async function fetchUnreadCount() {
      try {
        const { data, error } = await supabase
          .rpc('get_unread_message_count')
        
        if (error) throw error
        setUnreadCount(data || 0)
      } catch (error) {
        console.error("Error fetching unread count:", error)
      }
    }

    fetchUnreadCount()

    // 10초마다 업데이트
    const interval = setInterval(fetchUnreadCount, 10000)
    
    // 실시간 구독
    const channel = supabase
      .channel('global-messages-sidebar')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'global_messages' 
        }, 
        () => {
          fetchUnreadCount()
        }
      )
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [])

  // 기본 사이드바 항목
  const sidebarItems = [
    {
      title: "대시보드",
      href: "/dashboard",
      icon: Home,
    },
    {
      title: "AI insight",
      href: "/agent",
      icon: Bot,
    },
    {
      title: "학생 관리",
      href: "/students",
      icon: Users,
    },
    {
      title: "수업 일정",
      href: "/schedule",
      icon: Calendar,
    },
    {
      title: "학습 관리",
      href: "/learning",
      icon: BookOpen,
    },
    {
      title: "통계 분석",
      href: "/analytics",
      icon: BarChart3,
    },
    {
      title: "직원 관리",
      href: "/employees",
      icon: UserCog,
    },
    {
      title: "설정",
      href: "/settings",
      icon: Settings,
    },
  ]

  // 관리자 전용 메뉴
  const adminItems: any[] = [
    // AI 설정 제거됨
  ]

  // 로그아웃 처리 함수를 다음과 같이 변경
  const handleLogout = async () => {
    try {
      setIsSigningOut(true)

      // 서버 액션을 사용하여 로그아웃 처리
      const result = await signOut()

      if (!result.success) {
        throw new Error(result.error || "로그아웃 실패")
      }

      toast({
        title: "로그아웃 성공",
        description: "성공적으로 로그아웃되었습니다.",
        variant: "default",
      })

      // 강제로 페이지 새로고침 및 로그인 페이지로 이동
      window.location.href = "/login"
    } catch (error) {
      console.error("로그아웃 오류:", error)
      toast({
        title: "로그아웃 실패",
        description: "로그아웃 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      })
      setIsSigningOut(false)
    }
  }

  return (
    <div className="h-screen w-40 border-r bg-background flex flex-col">
      <div className="p-4">
        <h1 className="text-xl font-bold">밸류인 수학학원</h1>
      </div>
      <div className="flex-1 px-2 py-2 overflow-y-auto">
        <nav className="space-y-1">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="flex-1">{item.title}</span>
                {/* @ts-ignore - badge 속성이 있는 경우에만 Badge 표시 */}
                {item.badge && (
                  <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                    {/* @ts-ignore */}
                    {item.badge}
                  </Badge>
                )}
              </Link>
            )
          })}
          
          {/* 관리자 전용 메뉴 */}
          {isAdmin && !isLoading && (
            <>
              <div className="px-3 py-2">
                <div className="h-px bg-border"></div>
              </div>
              {adminItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="flex-1">{item.title}</span>
                    <Crown className="h-3 w-3 text-amber-500" />
                  </Link>
                )
              })}
            </>
          )}
        </nav>
      </div>
      <div className="p-2 border-t">
        <Button
          variant="outline"
          className="w-full justify-start text-xs py-2"
          size="sm"
          onClick={handleLogout}
          disabled={isSigningOut}
        >
          <LogOut className="mr-2 h-3 w-3" />
          {isSigningOut ? "로그아웃 중..." : "로그아웃"}
        </Button>
      </div>
    </div>
  )
}
