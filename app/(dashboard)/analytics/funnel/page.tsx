import { requireAuth } from "@/lib/auth/get-user"
import { FunnelAnalysisPageClient } from "@/components/analytics/funnel/FunnelAnalysisPage"

export default async function FunnelAnalysisPage() {
  await requireAuth()
  return <FunnelAnalysisPageClient />
}
