"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { getTeacherStudents } from "@/services/comments"
import { Eye, EyeOff, Save } from "lucide-react"

const commentFormSchema = z.object({
  student_id: z.string().min(1, "학생을 선택해주세요."),
  year: z.number().min(2020).max(2100),
  month: z.number().min(1).max(12),
  content: z
    .string()
    .min(10, "코멘트 내용을 10자 이상 입력해주세요.")
    .max(2000, "코멘트 내용은 2000자 이내로 작성해주세요."),
})

type CommentFormData = z.infer<typeof commentFormSchema>

interface TeacherCommentFormProps {
  teacherId: string
  onSuccess?: () => void
}

interface Student {
  id: string
  name: string
  grade: string
  school: string
  status: string
}

export function TeacherCommentForm({ teacherId, onSuccess }: TeacherCommentFormProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth() + 1

  const form = useForm<CommentFormData>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: {
      student_id: "",
      year: currentYear,
      month: currentMonth,
      content: "",
    },
  })

  // Load teacher's students
  useEffect(() => {
    loadStudents()
  }, [teacherId])

  const loadStudents = async () => {
    setLoadingStudents(true)
    try {
      const studentList = await getTeacherStudents(teacherId)
      setStudents(studentList)
    } catch (error: any) {
      toast.error("학생 목록을 불러오는데 실패했습니다.")
      console.error("Load students error:", error)
    } finally {
      setLoadingStudents(false)
    }
  }

  const onSubmit = async (data: CommentFormData) => {
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/learning-comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "학습 코멘트 작성에 실패했습니다.")
      }

      toast.success("학습 코멘트가 작성되었습니다.")

      // Reset form
      form.reset({
        student_id: "",
        year: currentYear,
        month: currentMonth,
        content: "",
      })

      // Trigger parent refresh
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      toast.error(error.message || "학습 코멘트 작성에 실패했습니다.")
      console.error("Submit comment error:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const contentLength = form.watch("content")?.length || 0
  const selectedStudentId = form.watch("student_id")
  const selectedStudent = students.find((s) => s.id === selectedStudentId)

  // Generate year options (current year ± 1)
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1]

  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>학습 코멘트 작성</span>
          <Badge variant="outline" className="bg-white">
            선생님 전용
          </Badge>
        </CardTitle>
        <CardDescription>
          담당 학생의 월별 학습 코멘트를 작성할 수 있습니다.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Student Selection */}
            <FormField
              control={form.control}
              name="student_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>학생 선택</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={loadingStudents}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            loadingStudents ? "학생 목록 로딩 중..." : "학생을 선택하세요"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.name} ({student.grade}학년 • {student.school})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Year and Month Selection */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>연도</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {yearOptions.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}년
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>월</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => (
                          <SelectItem key={month} value={month.toString()}>
                            {month}월
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Content */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>코멘트 내용</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={`${selectedStudent?.name || "학생"}의 ${form.watch("month")}월 학습 코멘트를 작성해주세요.`}
                      className="min-h-[200px] resize-none"
                      maxLength={2000}
                      {...field}
                    />
                  </FormControl>
                  <div className="flex items-center justify-between">
                    <FormMessage />
                    <span className="text-xs text-muted-foreground">
                      {contentLength}/2000
                    </span>
                  </div>
                </FormItem>
              )}
            />

            {/* Preview Toggle */}
            {contentLength > 0 && (
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                  className="mb-3"
                >
                  {showPreview ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      미리보기 닫기
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      미리보기
                    </>
                  )}
                </Button>

                {showPreview && (
                  <Card className="bg-white">
                    <CardHeader>
                      <CardTitle className="text-base">
                        {form.watch("year")}년 {form.watch("month")}월 학습 코멘트
                      </CardTitle>
                      <CardDescription>
                        {selectedStudent?.name || "학생 미선택"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed text-gray-700">
                        {form.watch("content")}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting || loadingStudents}>
                <Save className="h-4 w-4 mr-2" />
                {isSubmitting ? "저장 중..." : "코멘트 저장"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
