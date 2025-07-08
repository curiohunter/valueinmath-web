import { Suspense } from "react"
import { requireRole } from "@/lib/auth/get-user"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { EmployeesTable } from "./employees-table"
import { EmployeesHeader } from "./employees-header"
import { EmployeesFilters } from "./employees-filters"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import type { Database } from "@/types/database"

type EmployeeRow = Database["public"]["Tables"]["employees"]["Row"]

export default async function EmployeesPage() {
  // 원장 또는 부원장 권한 확인
  const roleResult = await requireRole(["원장", "부원장"])
  
  if ('error' in roleResult) {
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
            직원 관리 페이지는 원장 또는 부원장만 접근할 수 있습니다. 접근 권한이 필요하신 경우 관리자에게 문의하세요.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const supabase = await createServerSupabaseClient()
  
  // 예시: 직원 데이터 가져오기
  const { data, error } = await supabase.from("employees").select("*")
  if (error) {
    throw new Error("직원 데이터를 불러오는 중 오류가 발생했습니다.")
  }
  if (!data || !Array.isArray(data)) {
    throw new Error("직원 데이터가 올바르지 않습니다.")
  }

  // 안전하게 직원 데이터 접근 예시
  const safeEmployees = data.filter(row => row && typeof row === 'object' && 'position' in row)

  return (
    <div className="space-y-6">
      <EmployeesHeader />
      
      {/* 직원 관리 */}
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
