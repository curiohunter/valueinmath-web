import { requireAuth } from "@/lib/auth/get-user"
import { FunnelAnalysisPageClient } from "@/components/analytics/funnel-analysis-page"

export default async function FunnelAnalysisPage() {
  await requireAuth()
  return <FunnelAnalysisPageClient />
}
