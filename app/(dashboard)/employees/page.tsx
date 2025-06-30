import { Suspense } from "react"
import { redirect } from "next/navigation"
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
  const supabase = await createServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    throw new Error("로그인이 필요합니다.")
  }

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

  // 사용자의 직원 정보 확인 - 간단한 접근 방식
  let isAdmin = false
  
  try {
    // @ts-ignore - Supabase type complexity 해결을 위한 임시 처리
    const { data: employees } = await supabase
      .from("employees")
      .select("position")
      // @ts-ignore
      .eq("auth_id", session.user.id)
    
    if (employees && employees.length > 0) {
      // @ts-ignore
      const position = employees[0]?.position
      isAdmin = position === "원장" || position === "부원장"
    }
  } catch (error) {
    console.error("Error fetching employee:", error)
    isAdmin = false
  }

  if (!isAdmin) {
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
