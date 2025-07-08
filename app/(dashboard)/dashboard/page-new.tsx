import { requireAuth } from "@/lib/auth/get-user"
import DashboardPageClient from "./page"

export default async function DashboardPageWrapper() {
  await requireAuth()
  
  return <DashboardPageClient />
}