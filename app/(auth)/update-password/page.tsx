import type { Metadata } from "next"
import { UpdatePasswordForm } from "./update-password-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "비밀번호 변경 | 학원관리 시스템",
  description: "새 비밀번호를 설정하세요",
}

export default function UpdatePasswordPage() {
  return (
    <>
      <div className="flex justify-center mb-8">
        <h1 className="text-3xl font-bold">학원관리 시스템</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>새 비밀번호 설정</CardTitle>
          <CardDescription>새로운 비밀번호를 입력하세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <UpdatePasswordForm />
        </CardContent>
      </Card>
    </>
  )
}
