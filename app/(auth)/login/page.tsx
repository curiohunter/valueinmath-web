import type { Metadata } from "next"
import Link from "next/link"
import { LoginForm } from "./login-form"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "로그인 | 학원관리 시스템",
  description: "학원관리 시스템에 로그인하세요",
}

interface LoginPageProps {
  searchParams: Promise<{
    error?: string
    redirect?: string
  }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  // Next.js 15: searchParams 비동기 처리
  const params = await searchParams

  return (
    <>
      <div className="flex justify-center mb-6">
        <h1 className="text-3xl font-bold">학원관리 시스템</h1>
      </div>

      <div className="flex justify-center mb-8">
        <Button variant="ghost" asChild>
          <Link href="/" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            홈으로 돌아가기
          </Link>
        </Button>
      </div>
      
      {/* 에러 메시지 표시 */}
      {params.error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{params.error}</AlertDescription>
        </Alert>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>로그인</CardTitle>
          <CardDescription>계정 정보를 입력하여 로그인하세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
        <CardFooter className="flex justify-center">
          <div className="text-sm text-muted-foreground">
            <Link href="/reset-password" className="text-primary hover:underline">
              비밀번호를 잊으셨나요?
            </Link>
          </div>
        </CardFooter>
      </Card>
    </>
  )
}
