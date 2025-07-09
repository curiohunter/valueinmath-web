import { Suspense } from "react"
// 1. 새로운 Supabase 서버 클라이언트를 import 합니다.
import { createServerClient } from "@/lib/auth/server" 
import { EmployeesTable } from "./employees-table"
import { EmployeesHeader } from "./employees-header"
import { EmployeesFilters } from "./employees-filters"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import type { Database } from "@/types/database"

function AccessDenied() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">직원 관리</h1>
        <p className="text-muted-foreground">직원 정보를 관리하고 새로운 직원을 등록하세요.</p>
      </div>
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>접근 권한 없음</AlertTitle>
        <AlertDescription>
          이 페이지는 원장 또는 부원장만 접근할 수 있습니다.
        </AlertDescription>
      </Alert>
    </div>
  )
}

export default async function EmployeesPage() {
  // 2. 가이드라인에 따라 클라이언트를 생성하고 사용자 정보를 가져옵니다.
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <AccessDenied />
  }

  // 3. 사용자 ID로 직원의 직책을 직접 조회합니다.
  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("position")
    .eq("auth_id", user.id)
    .single()

  if (employeeError || !employee) {
    return <AccessDenied />
  }
  
  // 4. 조회한 직책으로 권한을 확인합니다.
  const isAuthorized = employee.position === "원장" || employee.position === "부원장"
  if (!isAuthorized) {
    return <AccessDenied />
  }

  // --- 권한이 확인된 경우에만 아래 UI를 렌더링 ---

  return (
    <div className="space-y-6">
      <EmployeesHeader />
      
      <Card className="overflow-hidden">
        <EmployeesFilters />
        <CardContent className="p-0">
          <Suspense fallback={<TableSkeleton />}>
            <EmployeesTable />
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
