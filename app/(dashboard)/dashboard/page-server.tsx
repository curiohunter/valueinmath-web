import { requireAuth } from "@/lib/auth/get-user"
import DashboardClient from "./dashboard-client"

export default async function DashboardPage() {
  await requireAuth()
  
  return <DashboardClient />
}