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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { toast } from "sonner"
import type { Employee } from "@/types/employee"
import type { Database } from "@/types/database"
import { createEmployee, updateEmployee } from "@/services/employee-service"

type EmployeeInsert = Database["public"]["Tables"]["employees"]["Insert"]
type EmployeeUpdate = Database["public"]["Tables"]["employees"]["Update"]

// 기본 폼 타입 정의
interface FormValues {
  name: string
  phone: string | null
  position: string | null
  status: string
  department: string | null
  hire_date: Date | null
  resign_date: Date | null
  notes: string | null
}

interface EmployeeFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employee?: Employee | null
  onSuccess?: () => void
}

export function EmployeeFormModal({ open, onOpenChange, employee, onSuccess }: EmployeeFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resignDateError, setResignDateError] = useState<string | null>(null)
  const router = useRouter()

  // Initialize form without Zod resolver
  const form = useForm<FormValues>({
    defaultValues: {
      name: "",
      phone: "",
      position: null,
      status: "재직",
      department: null,
      hire_date: null,
      resign_date: null,
      notes: "",
    },
  })

  // Reset form when employee prop changes
  useEffect(() => {
    if (employee) {
      // 직원 정보가 있으면 폼 값을 설정
      form.reset({
        name: employee.name,
        phone: employee.phone,
        position: employee.position,
        status: employee.status,
        department: employee.department,
        hire_date: employee.hire_date ? new Date(employee.hire_date) : null,
        resign_date: employee.resign_date ? new Date(employee.resign_date) : null,
        notes: employee.notes,
      })
      setResignDateError(null)
    } else {
      // 직원 정보가 없으면 폼 초기화
      form.reset({
        name: "",
        phone: "",
        position: null,
        status: "재직",
        department: null,
        hire_date: null,
        resign_date: null,
        notes: "",
      })
      setResignDateError(null)
    }
  }, [employee, form])

  // Reset form when modal is closed
  useEffect(() => {
    if (!open) {
      form.reset()
      setResignDateError(null)
    }
  }, [open, form])

  // 상태가 변경될 때 퇴사일 에러 초기화
  const status = form.watch("status")
  useEffect(() => {
    if (status !== "퇴직") {
      setResignDateError(null)
    }
  }, [status])

  // Form submission handler
  const onSubmit = async (values: FormValues) => {
    // 퇴직 상태일 때 퇴사일 필수 검증
    if (values.status === "퇴직" && !values.resign_date) {
      setResignDateError("퇴직 상태인 경우 퇴사일을 입력해야 합니다")
      return
    }

    setIsSubmitting(true)
    try {
      // 현재 날짜를 last_updated_date로 설정
      const today = new Date().toISOString().split("T")[0]

      // Convert dates to ISO strings for API
      const formattedValues: EmployeeInsert | EmployeeUpdate = {
        name: values.name,
        phone: values.phone || null,
        position: values.position || null,
        status: values.status,
        department: values.department || null,
        hire_date: values.hire_date?.toISOString().split("T")[0] || null,
        resign_date: values.resign_date?.toISOString().split("T")[0] || null,
        last_updated_date: today,
        notes: values.notes || null,
      }

      let result
      if (employee) {
        // Update existing employee
        result = await updateEmployee(employee.id, formattedValues as Partial<Employee>)
      } else {
        // Create new employee
        result = await createEmployee(formattedValues as Omit<Employee, "id" | "created_at" | "updated_at">)
      }

      if (result.error) {
        throw result.error
      }

      // 성공 메시지 표시
      toast.success(employee ? "직원 정보가 성공적으로 수정되었습니다." : "새로운 직원이 등록되었습니다.")

      // 라우터 리프레시
      router.refresh()

      // Close modal and refresh data
      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (error) {
      console.error("Error submitting form:", error)
      toast.error("직원 정보 저장 중 오류가 발생했습니다. 다시 시도해주세요.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{employee ? "직원 정보 수정" : "신규 직원 등록"}</DialogTitle>
          <DialogDescription>
            {employee ? "직원의 정보를 수정하세요." : "새로운 직원을 등록하세요. 모든 필수 정보를 입력해주세요."}
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
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>연락처</FormLabel>
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
                          <SelectItem value="재직">재직</SelectItem>
                          <SelectItem value="퇴직">퇴직</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 직책 및 부서 정보 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">직책 및 부서 정보</h3>

                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>직책</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="직책 선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="원장">원장</SelectItem>
                          <SelectItem value="부원장">부원장</SelectItem>
                          <SelectItem value="강사">강사</SelectItem>
                          <SelectItem value="데스크직원">데스크직원</SelectItem>
                          <SelectItem value="데스크보조">데스크보조</SelectItem>
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
                      <FormLabel>부서</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="부서 선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="고등관">고등관</SelectItem>
                          <SelectItem value="중등관">중등관</SelectItem>
                          <SelectItem value="영재관">영재관</SelectItem>
                          <SelectItem value="데스크">데스크</SelectItem>
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

                <FormField
                  control={form.control}
                  name="hire_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>입사일</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={`w-full pl-3 text-left font-normal ${
                                !field.value ? "text-muted-foreground" : ""
                              }`}
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
                            disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                            initialFocus
                            locale={ko}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex flex-col">
                  <FormField
                    control={form.control}
                    name="resign_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className={status === "퇴직" ? "font-bold" : ""}>
                          퇴사일 {status === "퇴직" && <span className="text-destructive">*</span>}
                        </FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={`w-full pl-3 text-left font-normal ${
                                  !field.value ? "text-muted-foreground" : ""
                                } ${resignDateError ? "border-destructive" : ""}`}
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
                              onSelect={(date) => {
                                field.onChange(date)
                                if (status === "퇴직") {
                                  setResignDateError(null)
                                }
                              }}
                              disabled={(date) => date < new Date("1900-01-01")}
                              initialFocus
                              locale={ko}
                            />
                          </PopoverContent>
                        </Popover>
                        {resignDateError && <p className="text-sm font-medium text-destructive">{resignDateError}</p>}
                      </FormItem>
                    )}
                  />
                </div>
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
                          placeholder="직원에 대한 추가 정보를 입력하세요."
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
                {isSubmitting ? "처리 중..." : employee ? "수정" : "등록"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
