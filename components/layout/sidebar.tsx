"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Users, Calendar, BookOpen, BarChart3, Settings, Home, LogOut, UserCog, Crown, FolderOpen, Megaphone, ChevronDown, ChevronRight, MessageSquareText } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState, useMemo } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"
import { signOut } from "@/actions/auth-actions"

interface SidebarChild {
  title: string
  href: string
  beta?: boolean
}

interface SidebarItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  children?: SidebarChild[]
}

const sidebarItems: SidebarItem[] = [
  {
    title: "대시보드",
    href: "/dashboard",
    icon: Home,
  },
  {
    title: "학원 관리",
    href: "/students",
    icon: Users,
    children: [
      { title: "학생 관리", href: "/students" },
      { title: "반 관리", href: "/students/classes" },
      { title: "상담 관리", href: "/students/consultations" },
      { title: "학원비 생성", href: "/students/tuition-sessions" },
      { title: "학원비 이력", href: "/students/tuition-history" },
      { title: "입학테스트", href: "/students/entrance-tests" },
      { title: "수강 이력", href: "/students/enrollment-history" },
      { title: "교재 관리", href: "/students/textbooks" },
    ],
  },
  {
    title: "학습 관리",
    href: "/learning",
    icon: BookOpen,
    children: [
      { title: "학습 관리", href: "/learning" },
      { title: "테스트 관리", href: "/learning/test-logs" },
      { title: "보강 관리", href: "/learning/makeup-classes" },
      { title: "학교 시험지", href: "/learning/school-exams" },
      { title: "학교 시험 성적", href: "/learning/school-exam-scores" },
      { title: "학습 이력", href: "/learning/learning-history" },
      { title: "테스트 이력", href: "/learning/test-history" },
      { title: "숙제 분석", href: "/learning/homework-analysis" },
      { title: "학습 코멘트", href: "/learning/comments" },
      { title: "출석부", href: "/learning/attendance", beta: true },
    ],
  },
  {
    title: "수업 일정",
    href: "/schedule",
    icon: Calendar,
  },
  {
    title: "회의 관리",
    href: "/meetings",
    icon: MessageSquareText,
  },
  {
    title: "자료실",
    href: "/resources",
    icon: FolderOpen,
  },
  {
    title: "마케팅",
    href: "/marketing",
    icon: Megaphone,
    children: [
      { title: "캠페인", href: "/marketing/campaigns" },
      { title: "콘텐츠 갤러리", href: "/marketing/gallery" },
      { title: "후기 관리", href: "/marketing/reviews" },
      { title: "콘텐츠 스튜디오", href: "/marketing/content-studio" },
      { title: "브랜딩 설정", href: "/marketing/branding" },
    ],
  },
  {
    title: "통계 분석",
    href: "/analytics",
    icon: BarChart3,
    children: [
      { title: "운영 통계", href: "/analytics" },
      { title: "퍼널 분석", href: "/analytics/funnel" },
      { title: "액션 센터", href: "/analytics/funnel-v2", beta: true },
      { title: "위험도 분석", href: "/analytics/risk" },
      { title: "알림 관리", href: "/analytics/alerts" },
    ],
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
    children: [
      { title: "AI 키워드", href: "/settings" },
      { title: "AI 로그", href: "/settings/ai-logs" },
      { title: "사용량 관리", href: "/settings/ai-usage" },
    ],
  },
]

function isPathInSection(pathname: string, sectionHref: string): boolean {
  return pathname === sectionHref || pathname.startsWith(`${sectionHref}/`)
}

function isExactMatch(pathname: string, href: string, parentHref: string): boolean {
  // For the "root" child (same href as parent), only match exact path
  if (href === parentHref) {
    return pathname === href
  }
  // For other children, match exact or sub-paths
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const supabase = getSupabaseBrowserClient()
  const { toast } = useToast()

  // 펼침 상태: 현재 pathname에 해당하는 섹션을 기본으로 펼침
  const initialExpanded = useMemo(() => {
    const expanded: Record<string, boolean> = {}
    for (const item of sidebarItems) {
      if (item.children && isPathInSection(pathname, item.href)) {
        expanded[item.href] = true
      }
    }
    return expanded
  }, []) // 초기값만 사용

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(initialExpanded)

  // pathname 변경 시 해당 섹션 자동 펼침
  useEffect(() => {
    for (const item of sidebarItems) {
      if (item.children && isPathInSection(pathname, item.href)) {
        setExpandedSections(prev => prev[item.href] ? prev : { ...prev, [item.href]: true })
      }
    }
  }, [pathname])

  // 관리자 권한 확인
  useEffect(() => {
    async function checkAdminStatus() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
          setIsAdmin(false)
          setIsLoading(false)
          return
        }

        const { data: employee, error } = await supabase
          .from("employees")
          .select("position")
          .eq("auth_id", user.id)
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

  // 관리자 전용 메뉴
  const adminItems: any[] = []

  const toggleSection = (href: string) => {
    setExpandedSections(prev => ({ ...prev, [href]: !prev[href] }))
  }

  const handleLogout = async () => {
    try {
      setIsSigningOut(true)
      const result = await signOut()

      if (!result.success) {
        throw new Error(result.error || "로그아웃 실패")
      }

      toast({
        title: "로그아웃 성공",
        description: "성공적으로 로그아웃되었습니다.",
        variant: "default",
      })

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
    <div className="h-screen w-48 border-r bg-background flex flex-col">
      <div className="p-4">
        <h1 className="text-xl font-bold">밸류인 수학학원</h1>
      </div>
      <div className="flex-1 px-2 py-2 overflow-y-auto">
        <nav className="space-y-1">
          {sidebarItems.map((item) => {
            const isActive = isPathInSection(pathname, item.href)
            const hasChildren = item.children && item.children.length > 0
            const isExpanded = expandedSections[item.href]

            if (hasChildren) {
              return (
                <div key={item.href}>
                  {/* 부모 메뉴: 클릭 시 토글 */}
                  <button
                    onClick={() => toggleSection(item.href)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors w-full text-left",
                      isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="flex-1">{item.title}</span>
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </button>

                  {/* 서브메뉴 */}
                  <div
                    className={cn(
                      "overflow-hidden transition-all duration-200 ease-in-out",
                      isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0",
                    )}
                  >
                    <div className="py-1 space-y-0.5">
                      {item.children!.map((child) => {
                        const isChildActive = isExactMatch(pathname, child.href, item.href)
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                              "flex items-center gap-2 rounded-md pl-9 pr-3 py-1.5 text-xs transition-colors",
                              isChildActive
                                ? "bg-muted text-primary font-medium"
                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                            )}
                          >
                            <span className="flex-1">{child.title}</span>
                            {child.beta && (
                              <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 bg-teal-100 text-teal-700">
                                베타
                              </Badge>
                            )}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            }

            // 서브메뉴 없는 항목: 바로 페이지 이동
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
              </Link>
            )
          })}

          {/* 관리자 전용 메뉴 */}
          {isAdmin && !isLoading && adminItems.length > 0 && (
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
