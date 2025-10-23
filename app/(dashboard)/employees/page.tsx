import { Suspense } from "react"
import { createServerClient } from "@/lib/auth/server"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { EmployeesPageClient } from "./employees-page-client"

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
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <AccessDenied />
  }

  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("position")
    .eq("auth_id", user.id)
    .single()

  if (employeeError || !employee) {
    return <AccessDenied />
  }

  const isAuthorized = employee.position === "원장" || employee.position === "부원장"
  if (!isAuthorized) {
    return <AccessDenied />
  }

  return <EmployeesPageClient />
}
