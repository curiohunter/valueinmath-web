"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { createClient } from "@/lib/supabase/client"
import { User } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import { Plus, X } from "lucide-react"

interface RegistrationFormProps {
  user: User
}

const MAX_CHILDREN = 3

export function RegistrationForm({ user }: RegistrationFormProps) {
  const [role, setRole] = useState<string>("")
  const [name, setName] = useState(user.user_metadata?.name || "")
  const [studentNames, setStudentNames] = useState<string[]>([""])  // 다중 자녀 지원
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const supabase = createClient()

  // 자녀 추가
  const addStudent = () => {
    if (studentNames.length < MAX_CHILDREN) {
      setStudentNames([...studentNames, ""])
    }
  }

  // 자녀 제거
  const removeStudent = (index: number) => {
    if (studentNames.length > 1) {
      setStudentNames(studentNames.filter((_, i) => i !== index))
    }
  }

  // 자녀 이름 업데이트
  const updateStudentName = (index: number, value: string) => {
    const newNames = [...studentNames]
    newNames[index] = value
    setStudentNames(newNames)
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!role) {
      newErrors.role = "역할을 선택해주세요"
    }

    if (!name.trim()) {
      newErrors.name = "이름을 입력해주세요"
    }

    // 학부모인 경우 최소 1명의 자녀 이름 필요
    if (role === "parent") {
      const validNames = studentNames.filter(n => n.trim())
      if (validNames.length === 0) {
        newErrors.studentNames = "최소 1명의 자녀 이름을 입력해주세요"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      // 유효한 자녀 이름만 필터링
      const validStudentNames = role === "parent"
        ? studentNames.filter(n => n.trim()).map(n => n.trim())
        : []

      const { error } = await supabase
        .from('pending_registrations')
        .insert({
          user_id: user.id,
          email: user.email || "",
          name: name.trim(),
          role,
          // 호환성을 위해 첫 번째 자녀 이름을 student_name에도 저장
          student_name: validStudentNames[0] || null,
          // 새 필드: 모든 자녀 이름 배열로 저장
          student_names: validStudentNames.length > 0 ? validStudentNames : null
        })

      if (error) throw error

      // 페이지 새로고침으로 상태 업데이트
      window.location.reload()
    } catch (error: any) {
      console.error('등록 실패:', error)
      const errorMessage = error.message || '등록 중 오류가 발생했습니다.'

      // Supabase 에러 메시지 한국어로 변환
      if (error.message?.includes('duplicate key')) {
        alert('이미 등록 신청이 완료되었습니다.')
      } else if (error.message?.includes('violates row-level security')) {
        alert('권한이 없습니다. 다시 로그인해주세요.')
      } else {
        alert(`등록 중 오류가 발생했습니다: ${errorMessage}`)
      }
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

          {/* 학부모인 경우 자녀 이름 입력 (최대 3명) */}
          {role === "parent" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>자녀 이름 (최대 {MAX_CHILDREN}명)</Label>
                {studentNames.length < MAX_CHILDREN && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addStudent}
                    className="h-8 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    자녀 추가
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {studentNames.map((studentName, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={studentName}
                      onChange={(e) => updateStudentName(index, e.target.value)}
                      placeholder={`${index + 1}번째 자녀 이름`}
                      className={errors.studentNames && !studentName.trim() ? "border-red-500" : ""}
                    />
                    {studentNames.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeStudent(index)}
                        className="h-10 w-10 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              {errors.studentNames && <p className="text-sm text-red-600">{errors.studentNames}</p>}
              <p className="text-xs text-muted-foreground">
                형제/자매가 있는 경우 "자녀 추가" 버튼을 눌러 추가해주세요.
              </p>
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