import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/auth/server"

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Check user role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, student_id")
    .eq("id", user.id)
    .single()

  if (!profile || (profile.role !== "parent" && profile.role !== "student")) {
    // Not a parent or student, redirect to dashboard
    redirect("/dashboard")
  }

  if (!profile.student_id) {
    // No student linked, need admin to link
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md w-full space-y-4 text-center">
          <h1 className="text-2xl font-bold">학생 연결 필요</h1>
          <p className="text-muted-foreground">
            관리자가 귀하의 계정을 학생에게 연결해야 합니다.
            <br />
            관리자에게 문의해주세요.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 모바일: Compact Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between">
            {/* 모바일: 간소화된 타이틀 */}
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-2xl font-bold">학습 포털</h1>
              <span className="hidden md:inline text-sm text-muted-foreground">
                | {profile.role === "parent" ? "학부모" : "학생"}
              </span>
            </div>
            {/* 데스크톱: 이메일 표시, 모바일: 로그아웃만 */}
            <div className="flex items-center gap-2 md:gap-4">
              <span className="hidden md:inline text-sm text-muted-foreground">
                {user.email}
              </span>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="text-xs md:text-sm px-2 py-1 md:px-0 md:py-0 rounded md:rounded-none bg-muted md:bg-transparent text-muted-foreground hover:text-foreground transition-colors"
                >
                  로그아웃
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>
      {/* 모바일: 하단 네비 공간 확보 (pb-20), 데스크톱: 일반 패딩 */}
      <main className="container mx-auto px-4 py-4 md:py-6 pb-24 md:pb-6">
        {children}
      </main>
    </div>
  )
}
