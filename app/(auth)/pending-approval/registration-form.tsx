"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { User } from "@supabase/supabase-js"

interface RegistrationFormProps {
  user: User
}

export function RegistrationForm({ user }: RegistrationFormProps) {
  const [role, setRole] = useState<string>("")
  const [name, setName] = useState(user.user_metadata?.name || "")
  const [studentName, setStudentName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const supabase = createClientComponentClient()

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!role) {
      newErrors.role = "역할을 선택해주세요"
    }

    if (!name.trim()) {
      newErrors.name = "이름을 입력해주세요"
    }

    if (role === "parent" && !studentName.trim()) {
      newErrors.studentName = "학생 이름을 입력해주세요"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      const { error } = await supabase
        .from('pending_registrations')
        .insert({
          user_id: user.id,
          email: user.email,
          name: name.trim(),
          role,
          student_name: role === "parent" ? studentName.trim() : null
        })

      if (error) throw error

      // 페이지 새로고침으로 상태 업데이트
      window.location.reload()
    } catch (error) {
      console.error('등록 실패:', error)
      alert('등록 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getRoleLabel = (roleValue: string) => {
    switch (roleValue) {
      case "student": return "학생"
      case "parent": return "학부모"
      case "teacher": return "직원"
      default: return ""
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>
          회원 정보 입력
        </CardTitle>
        <CardDescription>
          학원 이용을 위해 기본 정보를 입력해주세요
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 이메일 표시 */}
          <div className="space-y-2">
            <Label>이메일</Label>
            <Input value={user.email || ""} disabled className="bg-gray-50" />
          </div>

          {/* 역할 선택 */}
          <div className="space-y-3">
            <Label>역할을 선택해주세요</Label>
            <RadioGroup value={role} onValueChange={setRole}>
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
            {errors.role && <p className="text-sm text-red-600">{errors.role}</p>}
          </div>

          {/* 이름 입력 */}
          <div className="space-y-2">
            <Label>
              {role === "parent" ? "학부모 이름" : "이름"}
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력해주세요"
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
          </div>

          {/* 학부모인 경우 학생 이름 입력 */}
          {role === "parent" && (
            <div className="space-y-2">
              <Label>학생 이름</Label>
              <Input
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="학생 이름을 입력해주세요"
                className={errors.studentName ? "border-red-500" : ""}
              />
              {errors.studentName && <p className="text-sm text-red-600">{errors.studentName}</p>}
            </div>
          )}

          {/* 안내 메시지 */}
          {role && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">📋 {getRoleLabel(role)} 등록</p>
                <p>
                  {role === "student" && "학생으로 등록하시면 수업 일정 확인 및 성적 조회가 가능합니다."}
                  {role === "parent" && "학부모로 등록하시면 자녀의 학습 현황을 확인할 수 있습니다."}
                  {role === "teacher" && "직원으로 등록하시면 학원 관리 시스템을 이용할 수 있습니다."}
                </p>
              </div>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting}
          >
            {isSubmitting ? "등록 중..." : "등록 신청"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}