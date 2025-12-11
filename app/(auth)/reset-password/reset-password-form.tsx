"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

// 비밀번호 재설정 폼 스키마
const resetPasswordSchema = z.object({
  email: z.string().email({ message: "유효한 이메일 주소를 입력해주세요." }),
})

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

export function ResetPasswordForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const { toast } = useToast()
  const supabase = getSupabaseBrowserClient()

  // 폼 초기화
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
    },
  })

  // 폼 제출 처리
  const onSubmit = async (values: ResetPasswordFormValues) => {
    try {
      setIsLoading(true)

      // Supabase 비밀번호 재설정 이메일 전송
      // redirectTo는 이메일 템플릿에서 처리하므로 여기서는 지정하지 않음
      // 이메일 템플릿: {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/update-password
      const { error } = await supabase.auth.resetPasswordForEmail(values.email)

      if (error) {
        throw error
      }

      // 성공 메시지
      toast({
        title: "이메일 전송 완료",
        description: "비밀번호 재설정 링크가 이메일로 전송되었습니다.",
      })

      setIsSubmitted(true)
    } catch (error: any) {
      console.error("Reset password error:", error)

      // 에러 메시지 표시
      toast({
        title: "이메일 전송 실패",
        description: error.message || "비밀번호 재설정 이메일 전송 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="text-center py-4">
        <h3 className="text-lg font-medium mb-2">이메일을 확인해주세요</h3>
        <p className="text-muted-foreground mb-4">
          {form.getValues("email")}로 비밀번호 재설정 링크를 보냈습니다. 이메일을 확인하고 링크를 클릭하여 비밀번호를
          재설정하세요.
        </p>
        <Button variant="outline" onClick={() => setIsSubmitted(false)}>
          다른 이메일로 다시 시도
        </Button>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>이메일</FormLabel>
              <FormControl>
                <Input placeholder="your@email.com" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "처리 중..." : "비밀번호 재설정 링크 받기"}
        </Button>
      </form>
    </Form>
  )
}
