"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { toast } from "@/components/ui/use-toast"
import { getKoreanDateString } from "@/lib/utils"
import type { Student, StudentStatus, Department, SchoolType, LeadSource } from "@/types/student"
import { createStudent, updateStudent } from "@/services/student-service"

// 기본 폼 타입 정의
interface FormValues {
  name: string
  student_phone: string | null
  parent_phone: string | null
  status: string
  department: string | null
  school: string | null
  school_type: string | null
  grade: number | null
  has_sibling: boolean
  lead_source: string | null
  start_date: Date | null
  end_date: Date | null
  first_contact_date: Date | null
  notes: string | null
}

// 타입 정의 추가
type CreateStudentData = Omit<Student, "id" | "created_at" | "updated_at">
type UpdateStudentData = Partial<Student>

interface StudentFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  student?: Student | null
  onSuccess?: () => void
}

export function StudentFormModal({ open, onOpenChange, student, onSuccess }: StudentFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [endDateError, setEndDateError] = useState<string | null>(null)
  const router = useRouter()

  // 폼 초기화
  const form = useForm<FormValues>({
    defaultValues: {
      name: "",
      student_phone: "",
      parent_phone: "",
      status: "미등록",
      department: null,
      school: "",
      school_type: null,
      grade: null,
      has_sibling: false,
      lead_source: null,
      start_date: null,
      end_date: null,
      first_contact_date: null,
      notes: "",
    },
  })

  // 학생 정보가 변경될 때 폼 리셋
  useEffect(() => {
    if (student) {
      try {
        // 날짜 형식 변환 시 오류 방지
        const startDate = student.start_date ? new Date(student.start_date) : null
        const endDate = student.end_date ? new Date(student.end_date) : null
        const firstContactDate = student.first_contact_date ? new Date(student.first_contact_date) : null

        // 폼 값 설정
        form.reset({
          name: student.name,
          student_phone: student.student_phone,
          parent_phone: student.parent_phone,
          status: student.status,
          department: student.department,
          school: student.school,
          school_type: student.school_type,
          grade: student.grade,
          has_sibling: student.has_sibling,
          lead_source: student.lead_source,
          start_date: startDate,
          end_date: endDate,
          first_contact_date: firstContactDate,
          notes: student.notes,
        })
        setEndDateError(null)
      } catch (error) {
        console.error("Error setting form values:", error)
        toast({
          title: "오류 발생",
          description: "학생 정보를 불러오는 중 오류가 발생했습니다.",
          variant: "destructive",
        })
      }
    } else {
      // 학생 정보가 없으면 폼 초기화
      form.reset({
        name: "",
        student_phone: "",
        parent_phone: "",
        status: "미등록",
        department: null,
        school: "",
        school_type: null,
        grade: null,
        has_sibling: false,
        lead_source: null,
        start_date: null,
        end_date: null,
        first_contact_date: null,
        notes: "",
      })
      setEndDateError(null)
    }
  }, [student, form])

  // 모달이 닫힐 때 폼 초기화
  useEffect(() => {
    if (!open) {
      form.reset()
      setEndDateError(null)
    }
  }, [open, form])

  // 상태가 변경될 때 종료일 에러 초기화
  const status = form.watch("status")
  useEffect(() => {
    if (status !== "퇴원") {
      setEndDateError(null)
    }
  }, [status])

  // 폼 제출 처리
  const onSubmit = async (values: FormValues) => {
    // 최초 상담일 필수 검증
    if (!values.first_contact_date) {
      toast({
        title: "입력 오류",
        description: "최초 상담일은 필수로 입력해야 합니다.",
        variant: "destructive",
      })
      return
    }

    // 재원 상태일 때 시작일 필수 검증
    if (values.status === "재원" && !values.start_date) {
      toast({
        title: "입력 오류", 
        description: "재원 상태인 경우 시작일을 입력해야 합니다.",
        variant: "destructive",
      })
      return
    }

    // 퇴원 상태일 때 종료일 필수 검증
    if (values.status === "퇴원" && !values.end_date) {
      setEndDateError("퇴원 상태인 경우 종료일을 입력해야 합니다")
      return
    }

    setIsSubmitting(true)
    try {
      // 날짜를 ISO 문자열로 변환하고 타입을 명시적으로 정의
      // 날짜 변환 로깅 (디버깅용)
      if (values.end_date && values.status === "퇴원") {
        console.log('퇴원일 처리:', {
          originalDate: values.end_date,
          koreanDateString: getKoreanDateString(values.end_date),
          oldMethod: values.end_date.toISOString().split("T")[0],
          studentName: values.name
        })
      }

      const baseFormattedValues = {
        name: values.name,
        student_phone: values.student_phone,
        parent_phone: values.parent_phone,
        status: values.status as StudentStatus,
        department: values.department as Department | null,
        school: values.school,
        school_type: values.school_type as SchoolType | null,
        grade: values.grade,
        has_sibling: values.has_sibling,
        lead_source: values.lead_source as LeadSource | null,
        start_date: values.start_date ? getKoreanDateString(values.start_date) : null,
        end_date: values.end_date ? getKoreanDateString(values.end_date) : null,
        first_contact_date: values.first_contact_date ? getKoreanDateString(values.first_contact_date) : null,
        notes: values.notes,
      }

      let result
      if (student) {
        // 기존 학생 정보 수정 - UpdateStudentData 타입으로 캐스팅
        const updateData: UpdateStudentData = baseFormattedValues
        result = await updateStudent(student.id, updateData)
      } else {
        // 새 학생 등록 - CreateStudentData 타입으로 캐스팅
        const createData: CreateStudentData = baseFormattedValues
        result = await createStudent(createData)
      }

      if (result.error) {
        throw result.error
      }

      // 성공 메시지 표시
      toast({
        title: student ? "학생 정보 수정 완료" : "학생 등록 완료",
        description: student ? "학생 정보가 성공적으로 수정되었습니다." : "새로운 학생이 등록되었습니다.",
      })

      // 라우터 리프레시
      router.refresh()

      // 모달 닫기 및 데이터 새로고침
      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (error) {
      console.error("Error submitting form:", error)
      toast({
        title: "오류 발생",
        description: "학생 정보 저장 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 날짜 선택 컴포넌트 렌더링 함수
  const renderDatePicker = (
    label: string,
    name: "start_date" | "end_date" | "first_contact_date",
    isRequired = false,
  ) => {
    return (
      <FormField
        control={form.control}
        name={name}
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel className={isRequired ? "font-bold" : ""}>
              {label} {isRequired && <span className="text-destructive">*</span>}
            </FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant={"outline"}
                    className={`w-full pl-3 text-left font-normal ${
                      !field.value ? "text-muted-foreground" : ""
                    } ${name === "end_date" && endDateError ? "border-destructive" : ""}`}
                  >
                    {field.value ? <span>{format(field.value, "PPP", { locale: ko })}</span> : <span>날짜 선택</span>}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value || undefined}
                  onSelect={(date) => {
                    field.onChange(date)
                    if (name === "end_date" && status === "퇴원") {
                      setEndDateError(null)
                    }
                  }}
                  disabled={(date) => {
                    // 최초 상담일만 미래 날짜 제한
                    if (name === "first_contact_date" && date > new Date()) {
                      return true
                    }
                    // 과거 날짜 제한 (모든 날짜)
                    return date < new Date("1900-01-01")
                  }}
                  initialFocus
                  locale={ko}
                />
              </PopoverContent>
            </Popover>
            {name === "end_date" && endDateError && (
              <p className="text-sm font-medium text-destructive">{endDateError}</p>
            )}
          </FormItem>
        )}
      />
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{student ? "학생 정보 수정" : "신규 학생 등록"}</DialogTitle>
          <DialogDescription>
            {student ? "학생의 정보를 수정하세요." : "새로운 학생을 등록하세요. 모든 필수 정보를 입력해주세요."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 기본 정보 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">기본 정보</h3>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>이름 *</FormLabel>
                      <FormControl>
                        <Input placeholder="홍길동" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="student_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>학생 연락처</FormLabel>
                      <FormControl>
                        <Input placeholder="01012345678" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="parent_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>학부모 연락처</FormLabel>
                      <FormControl>
                        <Input placeholder="01012345678" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>상태 *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="상태 선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="재원">재원</SelectItem>
                          <SelectItem value="퇴원">퇴원</SelectItem>
                          <SelectItem value="휴원">휴원</SelectItem>
                          <SelectItem value="미등록">미등록</SelectItem>
                          <SelectItem value="신규상담">신규상담</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>담당관</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="담당관 선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="고등관">고등관</SelectItem>
                          <SelectItem value="중등관">중등관</SelectItem>
                          <SelectItem value="영재관">영재관</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="has_sibling"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>형제자매 여부</FormLabel>
                        <FormDescription>형제자매가 있는 경우 체크해주세요.</FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              {/* 학교 정보 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">학교 정보</h3>

                <FormField
                  control={form.control}
                  name="school"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>학교</FormLabel>
                      <FormControl>
                        <Input placeholder="OO중" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="school_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>학교 유형</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="학교 유형 선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="초등학교">초등학교</SelectItem>
                          <SelectItem value="중학교">중학교</SelectItem>
                          <SelectItem value="고등학교">고등학교</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="grade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>학년</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value ? Number(value) : null)}
                        value={field.value?.toString() || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="학년 선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">1학년</SelectItem>
                          <SelectItem value="2">2학년</SelectItem>
                          <SelectItem value="3">3학년</SelectItem>
                          <SelectItem value="4">4학년</SelectItem>
                          <SelectItem value="5">5학년</SelectItem>
                          <SelectItem value="6">6학년</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lead_source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>유입 경로</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="유입 경로 선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="블로그">블로그</SelectItem>
                          <SelectItem value="입소문">입소문</SelectItem>
                          <SelectItem value="전화상담">전화상담</SelectItem>
                          <SelectItem value="원외학부모추천">원외학부모추천</SelectItem>
                          <SelectItem value="원내학부모추천">원내학부모추천</SelectItem>
                          <SelectItem value="원내친구추천">원내친구추천</SelectItem>
                          <SelectItem value="원외친구추천">원외친구추천</SelectItem>
                          <SelectItem value="오프라인">오프라인</SelectItem>
                          <SelectItem value="형제">형제</SelectItem>
                          <SelectItem value="문자메세지">문자메세지</SelectItem>
                          <SelectItem value="부원장">부원장</SelectItem>
                          <SelectItem value="맘까페">맘까페</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 날짜 정보 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">날짜 정보</h3>

                {/* 날짜 선택 컴포넌트 사용 */}
                {renderDatePicker("시작일", "start_date", status === "재원")}
                {renderDatePicker("종료일", "end_date", status === "퇴원")}
                {renderDatePicker("최초 상담일", "first_contact_date", true)}
              </div>

              {/* 메모 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">추가 정보</h3>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>메모</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="학생에 대한 추가 정보를 입력하세요."
                          className="min-h-[120px]"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "처리 중..." : student ? "수정" : "등록"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
