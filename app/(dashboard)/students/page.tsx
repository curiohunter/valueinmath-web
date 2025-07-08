import { requireAuth } from "@/lib/auth/get-user"
import { StudentsPageClient } from "@/app/(dashboard)/students/students-page-client"

export default async function StudentsPage() {
  await requireAuth()

  // 권한 체크 - 필요시 특정 역할만 접근 허용
  // await requireRole(["admin", "teacher"])

  return <StudentsPageClient />
}
