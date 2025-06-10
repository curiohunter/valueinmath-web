import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { LoginForm } from "./login-form"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export const metadata: Metadata = {
  title: "로그인 | 학원관리 시스템",
  description: "학원관리 시스템에 로그인하세요",
}

interface LoginPageProps {
  searchParams: {
    error?: string
    redirect?: string
  }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  // 서버 컴포넌트에서 세션 확인
  const supabase = createServerComponentClient({ cookies })
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // 이미 로그인된 경우 대시보드로 리디렉션
  if (session) {
    // 프로필 정보에서 승인 상태 확인
    const { data: profile } = await supabase
      .from("profiles")
      .select("approval_status")
      .eq("id", session.user.id)
      .single()

    if (profile?.approval_status === "approved") {
      redirect("/dashboard")
    } else if (profile?.approval_status === "pending") {
      redirect("/pending-approval")
    }
  }

  return (
    <>
      <div className="flex justify-center mb-8">
        <h1 className="text-3xl font-bold">학원관리 시스템</h1>
      </div>
      
      {/* 에러 메시지 표시 */}
      {searchParams.error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{searchParams.error}</AlertDescription>
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
        <CardFooter className="flex flex-col items-center gap-2">
          <div className="text-sm text-muted-foreground">
            계정이 없으신가요?{" "}
            <Link href="/signup" className="text-primary hover:underline">
              회원가입
            </Link>
          </div>
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
