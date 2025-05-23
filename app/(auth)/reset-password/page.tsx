import type { Metadata } from "next"
import Link from "next/link"
import { ResetPasswordForm } from "./reset-password-form"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "비밀번호 재설정 | 학원관리 시스템",
  description: "비밀번호를 재설정하세요",
}

export default function ResetPasswordPage() {
  return (
    <>
      <div className="flex justify-center mb-8">
        <h1 className="text-3xl font-bold">학원관리 시스템</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>비밀번호 재설정</CardTitle>
          <CardDescription>이메일 주소를 입력하여 비밀번호 재설정 링크를 받으세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResetPasswordForm />
        </CardContent>
        <CardFooter className="flex justify-center">
          <div className="text-sm text-muted-foreground">
            <Link href="/login" className="text-primary hover:underline">
              로그인으로 돌아가기
            </Link>
          </div>
        </CardFooter>
      </Card>
    </>
  )
}
