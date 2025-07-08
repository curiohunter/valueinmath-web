import { requireAuth } from "@/lib/auth/get-user"
import { ReportsPageClient } from "./reports-page-client"

export default async function ReportsPage() {
  await requireAuth()

  // 권한 체크 - 필요시 특정 역할만 접근 허용
  // await requireRole(["admin", "teacher"])

  return <ReportsPageClient />
}