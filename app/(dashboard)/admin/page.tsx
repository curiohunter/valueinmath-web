import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, UserCog, Settings, Shield } from "lucide-react"

export default function AdminDashboard() {
  const adminMenus = [
    {
      title: "직원-사용자 연결",
      description: "직원과 사용자 계정을 연결합니다.",
      icon: UserCog,
      href: "/admin/link-employees",
    },
    {
      title: "사용자 관리",
      description: "사용자 계정을 관리합니다.",
      icon: Users,
      href: "/admin/users",
    },
    {
      title: "권한 관리",
      description: "사용자 권한을 관리합니다.",
      icon: Shield,
      href: "/admin/permissions",
    },
    {
      title: "시스템 설정",
      description: "시스템 설정을 관리합니다.",
      icon: Settings,
      href: "/admin/settings",
    },
  ]

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {adminMenus.map((menu) => (
        <Card key={menu.href} className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <menu.icon className="h-5 w-5" />
              {menu.title}
            </CardTitle>
            <CardDescription>{menu.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={menu.href}>
              <Button className="w-full">관리하기</Button>
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
