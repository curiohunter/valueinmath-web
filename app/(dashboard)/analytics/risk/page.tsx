import { requireAuth } from "@/lib/auth/get-user"
import { RiskAnalysisPageClient } from "@/components/analytics/risk-analysis-page"

export default async function RiskAnalysisPage() {
  await requireAuth()
  return <RiskAnalysisPageClient />
}
