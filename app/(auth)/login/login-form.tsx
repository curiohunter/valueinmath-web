"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Chrome } from "lucide-react"
import { signIn, signInWithGoogle, signInWithKakao } from "./actions"

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isKakaoLoading, setIsKakaoLoading] = useState(false)

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true)
    try {
      const result = await signIn(formData)
      if (result?.success && result?.redirectTo) {
        // Hard navigation으로 쿠키 전파 후 새 요청 발생
        window.location.href = result.redirectTo
      }
    } catch (error) {
      // Server action will handle redirect with error
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)
    try {
      await signInWithGoogle()
    } catch (error) {
      // Server action will handle redirect with error
    } finally {
      setIsGoogleLoading(false)
    }
  }

  const handleKakaoSignIn = async () => {
    setIsKakaoLoading(true)
    try {
      await signInWithKakao()
    } catch (error) {
      // Server action will handle redirect with error
    } finally {
      setIsKakaoLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* 카카오 로그인 버튼 */}
      <Button
        type="button"
        className="w-full bg-[#FEE500] text-[#000000] hover:bg-[#FDD835] font-medium"
        onClick={handleKakaoSignIn}
        disabled={isKakaoLoading || isGoogleLoading || isLoading}
      >
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3z"/>
        </svg>
        {isKakaoLoading ? "카카오 로그인 중..." : "카카오로 로그인/회원가입"}
      </Button>

      {/* 구글 로그인 버튼 */}
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogleSignIn}
        disabled={isGoogleLoading || isKakaoLoading || isLoading}
      >
        <Chrome className="mr-2 h-4 w-4" />
        {isGoogleLoading ? "구글 로그인 중..." : "Google로 로그인/회원가입"}
      </Button>

      {/* 구분선 */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">기존 이메일 계정</span>
        </div>
      </div>

      {/* 이메일/비밀번호 로그인 폼 (기존 사용자용) */}
      <form action={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">이메일</label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="your@email.com"
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-1">비밀번호</label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          required
          disabled={isLoading}
        />
      </div>

      <Button 
        type="submit" 
        className="w-full" 
        disabled={isLoading}
      >
        {isLoading ? "로그인 중..." : "로그인"}
      </Button>
      </form>
    </div>
  )
}
