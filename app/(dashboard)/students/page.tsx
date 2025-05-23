import { Suspense } from "react"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { StudentsTable } from "./students-table"
import { StudentsHeader } from "./students-header"
import { StudentsFilters } from "./students-filters"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default async function StudentsPage() {
  // 서버 컴포넌트에서 세션 확인
  const supabase = createServerComponentClient({ cookies })
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // 세션이 없으면 로그인 페이지로 리디렉션
  if (!session) {
    redirect("/login")
  }

  return (
    <div className="space-y-6">
      <StudentsHeader />
      <Card className="overflow-hidden">
        <CardHeader className="bg-background">
          <CardTitle>학생 목록</CardTitle>
        </CardHeader>
        <StudentsFilters />
        <CardContent className="p-0">
          <Suspense fallback={<TableSkeleton />}>
            <StudentsTable />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  )
}
