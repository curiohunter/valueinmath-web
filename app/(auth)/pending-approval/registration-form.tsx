"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { User } from "@supabase/supabase-js"
import { useToast } from "@/components/ui/use-toast"
import { checkPhoneAndRole, checkEmployeePhone, completeRegistration } from "../actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface RegistrationFormProps {
  user: User
}

export function RegistrationForm({ user }: RegistrationFormProps) {
  const [role, setRole] = useState<"student" | "parent" | "teacher" | "">("")
  const [name, setName] = useState(user.user_metadata?.name || "")
  const [phone, setPhone] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [roleWarning, setRoleWarning] = useState<{
    isOpen: boolean
    suggestedRole: "parent" | "student"
    message: string
  } | null>(null)

  const { toast } = useToast()
  const router = useRouter()

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^0-9]/g, "")
    if (value.length > 11) value = value.slice(0, 11)

    let formatted = value
    if (value.length > 3 && value.length <= 7) {
      formatted = `${value.slice(0, 3)}-${value.slice(3)}`
    } else if (value.length > 7) {
      formatted = `${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7)}`
    }

    setPhone(formatted)
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!role || !name.trim() || !phone) {
      toast({ title: "모든 정보를 입력해주세요", variant: "destructive" })
      return
    }

    setIsSubmitting(true)

    try {
      // 직원인 경우 employees 테이블 확인
      if (role === "teacher") {
        const checkResult = await checkEmployeePhone(phone)

        if (!checkResult.success) {
          toast({ title: "등록 제한", description: checkResult.message, variant: "destructive" })
          setIsSubmitting(false)
          return
        }
      } else {
        // 학생/학부모인 경우 students 테이블 확인
        const checkResult = await checkPhoneAndRole(phone, role)

        if (!checkResult.success) {
          toast({ title: "등록 제한", description: checkResult.message, variant: "destructive" })
          setIsSubmitting(false)
          return
        }

        if (checkResult.warning) {
          setRoleWarning({
            isOpen: true,
            suggestedRole: checkResult.warning.suggestedRole,
            message: checkResult.warning.message,
          })
          setIsSubmitting(false)
          return
        }
      }

      await processRegistration()

    } catch (error: any) {
      console.error(error)
      toast({ title: "오류 발생", description: error.message, variant: "destructive" })
      setIsSubmitting(false)
    }
  }

  const processRegistration = async (overrideRole?: "student" | "parent") => {
    try {
      const finalRole = overrideRole || role
      const result = await completeRegistration(user.id, {
        name,
        phone,
        role: finalRole
      })

      if (result.error) {
        throw new Error(result.error)
      }

      toast({ title: "등록 완료", description: "학원 정보가 연결되었습니다." })
      // Redirect based on role
      if (finalRole === "student" || finalRole === "parent") {
        router.push("/portal")
        router.refresh()
      } else {
        router.push("/dashboard")
        router.refresh()
      }

    } catch (error: any) {
      toast({ title: "등록 실패", description: error.message, variant: "destructive" })
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <AlertDialog open={!!roleWarning} onOpenChange={(open) => !open && setRoleWarning(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>역할 확인</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-wrap">
              {roleWarning?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setRoleWarning(null)
              processRegistration() // Proceed with original role
            }}>
              아니요, 그대로 진행합니다
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (roleWarning?.suggestedRole) {
                setRole(roleWarning.suggestedRole)
                processRegistration(roleWarning.suggestedRole)
              }
              setRoleWarning(null)
            }}>
              네, 변경하겠습니다
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader className="text-center">
          <CardTitle>회원 정보 입력</CardTitle>
          <CardDescription>학원 이용을 위해 기본 정보를 입력해주세요</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>이메일</Label>
              <Input value={user.email || ""} disabled className="bg-gray-50" />
            </div>

            <div className="space-y-3">
              <Label>역할을 선택해주세요</Label>
              <RadioGroup value={role} onValueChange={(val: any) => setRole(val)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="student" id="student" />
                  <Label htmlFor="student">학생</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="parent" id="parent" />
                  <Label htmlFor="parent">학부모</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="teacher" id="teacher" />
                  <Label htmlFor="teacher">직원</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>{role === "parent" ? "학부모 이름" : "이름"}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력해주세요"
              />
            </div>

            <div className="space-y-2">
              <Label>핸드폰 번호</Label>
              <Input
                value={phone}
                onChange={handlePhoneChange}
                placeholder="010-0000-0000 (학원에 등록된 번호)"
              />
              <p className="text-xs text-muted-foreground">
                * 학원에 등록된 번호와 일치해야 자동 승인됩니다.
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "등록 중..." : "등록 신청"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  )
}