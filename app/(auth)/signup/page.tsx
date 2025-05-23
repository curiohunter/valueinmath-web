import type { Metadata } from "next"
import Link from "next/link"
import { SignupForm } from "./signup-form"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "회원가입 | 학원관리 시스템",
  description: "학원관리 시스템에 회원가입하세요",
}

export default function SignupPage() {
  return (
    <>
      <div className="flex justify-center mb-8">
        <h1 className="text-3xl font-bold">학원관리 시스템</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>회원가입</CardTitle>
          <CardDescription>새 계정을 만들어 학원관리 시스템을 이용하세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <SignupForm />
        </CardContent>
        <CardFooter className="flex justify-center">
          <div className="text-sm text-muted-foreground">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="text-primary hover:underline">
              로그인
            </Link>
          </div>
        </CardFooter>
      </Card>
    </>
  )
}
