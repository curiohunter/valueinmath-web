import { requireAuth } from "@/lib/auth/get-user"
import { RiskAlertsPageClient } from "@/components/analytics/risk-alerts-page"

export default async function RiskAlertsPage() {
  await requireAuth()
  return <RiskAlertsPageClient />
}
