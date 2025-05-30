// app/schedules/page.tsx
import { Suspense } from "react"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import ScheduleStats from "@/components/schedules/ScheduleStats"
import ScheduleFilters from "@/components/schedules/ScheduleFilters"
import ScheduleCalendar from "@/components/schedules/ScheduleCalendar"
import ScheduleSidebar from "@/components/schedules/ScheduleSidebar"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default async function SchedulesPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    throw new Error("로그인이 필요합니다.")
  }

  // 사용자의 직원 정보 확인
  const { data: employee } = await supabase
    .from("employees")
    .select("position, department")
    .eq("auth_id", session.user.id)
    .single()

  // 접근 권한 체크 (모든 직원이 일정 조회 가능하도록)
  if (!employee) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>접근 권한 없음</AlertTitle>
          <AlertDescription>
            직원 정보를 찾을 수 없습니다. 관리자에게 문의하세요.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ScheduleStats />
      
      <div className="flex gap-6">
        {/* 메인 컨텐츠 */}
        <div className="flex-1 space-y-4">
          <Card>
            <ScheduleFilters />
            <CardContent className="p-0">
              <Suspense fallback={<CalendarSkeleton />}>
                <ScheduleCalendar />
              </Suspense>
            </CardContent>
          </Card>
        </div>
        
        {/* 우측 사이드바 */}
        <div className="w-96">
          <Suspense fallback={<SidebarSkeleton />}>
            <ScheduleSidebar />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

function CalendarSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  )
}

function SidebarSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  )
}