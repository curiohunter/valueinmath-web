import { requireAuth } from "@/lib/auth/get-user"
import { FunnelActionCenter } from "@/components/analytics/funnel-v2/funnel-action-center"

export default async function FunnelV2Page() {
  await requireAuth()
  return <FunnelActionCenter />
}
