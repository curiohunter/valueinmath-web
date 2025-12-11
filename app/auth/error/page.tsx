'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import Link from 'next/link'

function AuthErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'callback_failed':
        return 'OAuth 콜백 처리 중 오류가 발생했습니다.'
      case 'missing_code':
        return '인증 코드가 누락되었습니다.'
      case 'unauthorized':
        return '로그인이 필요합니다.'
      case 'invalid_token':
        return '인증 토큰이 유효하지 않거나 만료되었습니다. 비밀번호 재설정을 다시 시도해주세요.'
      case 'token_expired':
        return '인증 링크가 만료되었습니다. 비밀번호 재설정을 다시 시도해주세요.'
      default:
        return '인증 중 오류가 발생했습니다.'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-xl">인증 오류</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            {getErrorMessage(error)}
          </p>
          
          <div className="space-y-2">
            <Link href="/login">
              <Button className="w-full">
                로그인 페이지로 이동
              </Button>
            </Link>

            {(error === 'invalid_token' || error === 'token_expired') && (
              <Link href="/reset-password">
                <Button variant="outline" className="w-full">
                  비밀번호 재설정 다시 시도
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div>로딩 중...</div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  )
}