"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { CalendarIcon, ChevronRight, Info, MessageSquare } from "lucide-react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { toast } from "sonner"
import { getKoreanDateString } from "@/lib/utils"
import type { Student, StudentStatus, Department, SchoolType, LeadSource } from "@/types/student"
import { createClient } from "@/lib/supabase/client"

// 상담 모달 import - 나중에 실제 파일로 교체
import { ConsultationModal } from "@/components/consultations/ConsultationModal"

// 퇴원 사유 목록
const LEFT_REASON_OPTIONS = [
  { value: "졸업", label: "졸업" },
  { value: "성적불만", label: "성적불만" },
  { value: "선생님불만", label: "선생님불만" },
  { value: "시간불일치", label: "시간불일치" },
  { value: "타학원이동", label: "타학원이동" },
  { value: "이사", label: "이사" },
  { value: "건강문제", label: "건강문제" },
  { value: "휴식", label: "휴식" },
  { value: "기타", label: "기타" },
] as const

// 기본 폼 타입 정의
interface FormValues {
  name: string
  student_phone: string | null
  parent_phone: string | null
  payment_phone: string | null
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
  left_reason: string | null
  left_reason_detail: string | null
}


interface StudentFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  student?: Student | null
  onSuccess?: () => void
  isConsultationMode?: boolean // For dashboard consultation flow
}

export function StudentFormModal({
  open,
  onOpenChange,
  student,
  onSuccess,
  isConsultationMode
}: StudentFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [endDateError, setEndDateError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<1 | 2>(1)
  const [savedStudentId, setSavedStudentId] = useState<string | null>(null)
  const [savedStudentName, setSavedStudentName] = useState<string>("")
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // 한국 시간 기준 오늘 날짜 가져오기
  const getKoreanToday = () => {
    const koreaTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" })
    const date = new Date(koreaTime)
    return date
  }

  // 폼 초기화
  const form = useForm<FormValues>({
    defaultValues: {
      name: "",
      student_phone: "",
      parent_phone: "",
      payment_phone: "",
      status: isConsultationMode ? "신규상담" : "미등록",
      department: null,
      school: "",
      school_type: null,
      grade: null,
      has_sibling: false,
      lead_source: null,
      start_date: null,
      end_date: null,
      first_contact_date: getKoreanToday(), // 오늘 날짜를 기본값으로
      notes: "",
      left_reason: null,
      left_reason_detail: null,
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
        // left_reason 파싱 (기타: 상세내용 형식 처리)
        let leftReason = student.left_reason || null
        let leftReasonDetail: string | null = null
        if (leftReason && leftReason.startsWith("기타:")) {
          leftReasonDetail = leftReason.replace("기타:", "").trim()
          leftReason = "기타"
        }

        form.reset({
          name: student.name,
          student_phone: student.student_phone,
          parent_phone: student.parent_phone,
          payment_phone: student.payment_phone,
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
          left_reason: leftReason,
          left_reason_detail: leftReasonDetail,
        })
        setEndDateError(null)
        setSavedStudentId(student.id)
        setSavedStudentName(student.name)
      } catch (error) {
        console.error("Error setting form values:", error)
        toast.error("학생 정보를 불러오는 중 오류가 발생했습니다.")
      }
    } else {
      // 학생 정보가 없으면 폼 초기화 (최초상담일은 오늘로 유지)
      form.reset({
        name: "",
        student_phone: "",
        parent_phone: "",
        payment_phone: "",
        status: isConsultationMode ? "신규상담" : "미등록",
        department: null,
        school: "",
        school_type: null,
        grade: null,
        has_sibling: false,
        lead_source: null,
        start_date: null,
        end_date: null,
        first_contact_date: getKoreanToday(),
        notes: "",
        left_reason: null,
        left_reason_detail: null,
      })
      setEndDateError(null)
    }
  }, [student, form, isConsultationMode])

  // 모달이 닫힐 때 폼 및 상태 초기화
  useEffect(() => {
    if (!open) {
      form.reset()
      setEndDateError(null)
      setCurrentStep(1)
      setSavedStudentId(null)
      setSavedStudentName("")
    }
  }, [open, form])

  // 상태가 변경될 때 종료일 에러 초기화
  const status = form.watch("status")
  useEffect(() => {
    if (status !== "퇴원") {
      setEndDateError(null)
    }
  }, [status])

  // Step 인디케이터 컴포넌트
  const StepIndicator = () => (
    <div className="flex items-center justify-center space-x-4 mb-6">
      <div className={cn(
        "flex items-center space-x-2",
        currentStep === 1 ? "text-primary" : "text-muted-foreground"
      )}>
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center border-2",
          currentStep === 1 ? "border-primary bg-primary text-white" : "border-muted-foreground"
        )}>
          1
        </div>
        <span className="font-medium">학생 정보</span>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
      <div className={cn(
        "flex items-center space-x-2",
        currentStep === 2 ? "text-primary" : "text-muted-foreground"
      )}>
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center border-2",
          currentStep === 2 ? "border-primary bg-primary text-white" : "border-muted-foreground"
        )}>
          2
        </div>
        <span className="font-medium">상담 기록 (선택)</span>
      </div>
    </div>
  )

  // Step 1 제출 (학생 정보 저장 후 Step 2로)
  const handleStep1Submit = async () => {
    // 폼 유효성 검사
    const isValid = await form.trigger()
    if (!isValid) return

    const values = form.getValues()

    // 최초 상담일 필수 검증
    if (!values.first_contact_date) {
      toast.error("최초 상담일은 필수로 입력해야 합니다.")
      return
    }

    // 담당관 필수 검증
    if (!values.department) {
      toast.error("담당관은 필수로 선택해야 합니다.")
      return
    }

    // 재원 상태일 때 시작일 필수 검증
    if (values.status === "재원" && !values.start_date) {
      toast.error("재원 상태인 경우 시작일을 입력해야 합니다.")
      return
    }

    // 퇴원 상태일 때 종료일 필수 검증
    if (values.status === "퇴원" && !values.end_date) {
      setEndDateError("퇴원 상태인 경우 종료일을 입력해야 합니다")
      return
    }

    setIsSubmitting(true)
    try {
      // 퇴원 사유 처리 (기타인 경우 상세 내용 합침)
      let leftReasonValue: string | null = null
      if (values.status === "퇴원" && values.left_reason) {
        if (values.left_reason === "기타" && values.left_reason_detail) {
          leftReasonValue = `기타: ${values.left_reason_detail}`
        } else {
          leftReasonValue = values.left_reason
        }
      }

      const baseFormattedValues = {
        name: values.name,
        student_phone: values.student_phone || null,
        parent_phone: values.parent_phone || null,
        payment_phone: values.payment_phone || null,
        status: values.status as StudentStatus,
        department: values.department || null,
        school: values.school || null,
        school_type: values.school_type || null,  // 빈 문자열을 null로 변환
        grade: values.grade || null,
        has_sibling: values.has_sibling || false,
        lead_source: values.lead_source || null,
        start_date: values.start_date ? getKoreanDateString(values.start_date) : null,
        end_date: values.end_date ? getKoreanDateString(values.end_date) : null,
        first_contact_date: values.first_contact_date ? getKoreanDateString(values.first_contact_date) : null,
        notes: values.notes || null,
        left_reason: leftReasonValue,
        left_at: values.status === "퇴원" && values.end_date ? getKoreanDateString(values.end_date) : null,
      }

      if (student) {
        // 기존 학생 정보 수정 (props로 전달된 학생) - created_by_type은 수정하지 않음
        const { error } = await supabase
          .from("students")
          .update(baseFormattedValues)
          .eq("id", student.id)

        if (error) throw error
        setSavedStudentId(student.id)
      } else if (savedStudentId) {
        // 이미 생성된 학생 정보 수정 (Step 1에서 이미 저장한 경우)
        // 이 경우는 사용자가 Step 2에서 "이전" 버튼으로 돌아와서 다시 저장하는 경우
        const { error } = await supabase
          .from("students")
          .update(baseFormattedValues)
          .eq("id", savedStudentId)

        if (error) throw error
        // savedStudentId는 이미 설정되어 있으므로 유지
      } else {
        // 새 학생 등록 - created_by_type 포함
        const { data, error } = await supabase
          .from("students")
          .insert({
            ...baseFormattedValues,
            created_by_type: 'employee' as const,  // 직원이 등록 (신규 생성 시에만)
          })
          .select()
          .single()

        if (error) throw error
        if (data) {
          setSavedStudentId(data.id)
        }
      }

      setSavedStudentName(values.name)
      toast.success("학생 정보가 저장되었습니다.")

      // Step 2로 이동
      setCurrentStep(2)
    } catch (error: any) {
      const rawMessage = error?.message || error?.error || ""

      // 중복 에러 처리
      if (rawMessage.includes("students_name_parent_phone_unique") ||
          rawMessage.includes("duplicate key")) {
        toast.error("이미 동일한 이름과 학부모 연락처로 등록된 학생이 있습니다.")
      } else {
        const errorMessage = rawMessage || "알 수 없는 오류가 발생했습니다"
        toast.error(`학생 정보 저장 실패: ${errorMessage}`)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // 상담 기록 건너뛰기
  const handleSkipConsultation = () => {
    router.refresh()
    onSuccess?.()
    onOpenChange(false)
    toast.info("학생 정보가 저장되었습니다. 상담 기록은 나중에 추가할 수 있습니다.")
  }

  // 상담 기록 저장 완료
  const handleConsultationSaved = () => {
    setIsConsultationModalOpen(false)
    toast.success("상담 정보가 성공적으로 입력되었습니다.")

    // 잠시 후 모달 닫기
    setTimeout(() => {
      router.refresh()
      onSuccess?.()
      onOpenChange(false)
    }, 1000)
  }

  // 날짜 선택 컴포넌트 렌더링 함수
  const renderDatePicker = (
    label: string,
    name: "start_date" | "end_date" | "first_contact_date",
    isRequired = false,
    disabled = false
  ) => {
    return (
      <FormField
        control={form.control}
        name={name}
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>
              {label} {isRequired && "*"}
            </FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full pl-3 text-left font-normal",
                      !field.value && "text-muted-foreground"
                    )}
                    disabled={disabled}
                  >
                    {field.value ? format(field.value, "PPP", { locale: ko }) : <span>날짜 선택</span>}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value || undefined}
                  onSelect={field.onChange}
                  disabled={(date) => date < new Date("1900-01-01")}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {name === "end_date" && endDateError && (
              <p className="text-sm font-medium text-destructive">{endDateError}</p>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{student ? "학생 정보 수정" : "새 학생 등록"}</DialogTitle>
            <DialogDescription>학생의 정보를 {student ? "수정" : "입력"}해주세요.</DialogDescription>
          </DialogHeader>

          {/* Step 인디케이터 */}
          <StepIndicator />

          <Form {...form}>
            {currentStep === 1 ? (
              // Step 1: 학생 정보
              <form onSubmit={(e) => { e.preventDefault(); handleStep1Submit(); }} className="space-y-6">
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
                      name="payment_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>결제번호</FormLabel>
                          <FormControl>
                            <Input placeholder="01012345678" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormDescription className="text-xs">
                            결제선생 청구용 번호 (없으면 학부모 연락처 사용)
                          </FormDescription>
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
                          <FormLabel>담당관 *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || undefined}>
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
                            <FormLabel>형제 할인 대상</FormLabel>
                            <FormDescription>형제가 함께 수강중인 경우 체크해주세요.</FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* 학교 및 추가 정보 */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">학교 정보</h3>

                    <FormField
                      control={form.control}
                      name="school"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>학교</FormLabel>
                          <FormControl>
                            <Input placeholder="OO고등학교" {...field} value={field.value || ""} />
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
                          <FormLabel>학교 구분</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || undefined}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="학교 구분 선택" />
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
                            onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                            value={field.value?.toString() || undefined}
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
                          <Select onValueChange={field.onChange} value={field.value || undefined}>
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
                              <SelectItem value="홈페이지">홈페이지</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* 퇴원 사유 (상태가 퇴원일 때만 표시) */}
                    {status === "퇴원" && (
                      <div className="space-y-3 p-4 rounded-lg border border-red-200 bg-red-50">
                        <h4 className="text-sm font-medium text-red-800">퇴원 사유</h4>
                        <FormField
                          control={form.control}
                          name="left_reason"
                          render={({ field }) => (
                            <FormItem>
                              <Select onValueChange={field.onChange} value={field.value || undefined}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="퇴원 사유 선택" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {LEFT_REASON_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* 기타 선택 시 상세 입력 */}
                        {form.watch("left_reason") === "기타" && (
                          <FormField
                            control={form.control}
                            name="left_reason_detail"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    placeholder="상세 사유를 입력하세요"
                                    {...field}
                                    value={field.value || ""}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {/* 날짜 정보 */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">날짜 정보</h3>
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
                    {isSubmitting ? "처리 중..." : student ? "다음" : "저장 후 다음"}
                  </Button>
                </DialogFooter>
              </form>
            ) : (
              // Step 2: 상담 기록
              <div className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    상담 기록은 선택사항입니다. 나중에 학생 상세 페이지에서도 추가할 수 있습니다.
                  </AlertDescription>
                </Alert>

                <div className="flex items-center justify-center py-12 border-2 border-dashed rounded-lg">
                  <div className="text-center space-y-4">
                    <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground" />
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium">상담 기록 추가</h3>
                      <p className="text-sm text-muted-foreground">
                        {savedStudentName} 학생의 상담 내용을 기록하시겠습니까?
                      </p>
                    </div>
                    <Button onClick={() => setIsConsultationModalOpen(true)}>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      상담 기록 작성
                    </Button>
                  </div>
                </div>

                <DialogFooter className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(1)}
                  >
                    이전
                  </Button>
                  <div className="space-x-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleSkipConsultation}
                    >
                      건너뛰기
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSkipConsultation}
                    >
                      완료
                    </Button>
                  </div>
                </DialogFooter>
              </div>
            )}
          </Form>
        </DialogContent>
      </Dialog>

      {/* 상담 기록 모달 */}
      {isConsultationModalOpen && savedStudentId && (
        <ConsultationModal
          isOpen={isConsultationModalOpen}
          onClose={() => setIsConsultationModalOpen(false)}
          studentInfo={{
            studentId: savedStudentId,
            studentName: savedStudentName
          }}
          onSuccess={handleConsultationSaved}
        />
      )}
    </>
  )
}