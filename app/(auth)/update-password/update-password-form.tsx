"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

// 비밀번호 업데이트 폼 스키마
const updatePasswordSchema = z
  .object({
    password: z.string().min(6, { message: "비밀번호는 최소 6자 이상이어야 합니다." }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "비밀번호가 일치하지 않습니다.",
    path: ["confirmPassword"],
  })

type UpdatePasswordFormValues = z.infer<typeof updatePasswordSchema>

export function UpdatePasswordForm() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = getSupabaseBrowserClient()

  // 폼 초기화
  const form = useForm<UpdatePasswordFormValues>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  })

  // 폼 제출 처리
  const onSubmit = async (values: UpdatePasswordFormValues) => {
    try {
      setIsLoading(true)

      // Supabase 비밀번호 업데이트
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      })

      if (error) {
        throw error
      }

      // 성공 메시지
      toast({
        title: "비밀번호 변경 완료",
        description: "비밀번호가 성공적으로 변경되었습니다.",
      })

      // 로그인 페이지로 이동
      router.push("/login")
    } catch (error: any) {
      console.error("Update password error:", error)

      // 에러 메시지 표시
      toast({
        title: "비밀번호 변경 실패",
        description: error.message || "비밀번호 변경 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>새 비밀번호</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>비밀번호 확인</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "처리 중..." : "비밀번호 변경"}
        </Button>
      </form>
    </Form>
  )
}
