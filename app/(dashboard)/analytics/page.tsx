import { requireAuth } from "@/lib/auth/get-user"
import { AnalyticsPageClient } from "@/components/analytics/analytics-page-client"

export default async function AnalyticsPage() {
  await requireAuth()

  // 권한 체크 - 필요시 특정 역할만 접근 허용
  // await requireRole(["admin", "teacher"])

  return <AnalyticsPageClient />
}