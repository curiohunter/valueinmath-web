"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { ConsultationRequest } from "@/types/consultation-requests"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

const consultationRequestSchema = z.object({
  method: z.enum(["대면", "전화"], {
    required_error: "상담 방법을 선택해주세요.",
  }),
  type: z.enum(["학습관련", "운영관련", "기타"], {
    required_error: "상담 타입을 선택해주세요.",
  }),
  content: z
    .string()
    .min(10, "상담 내용을 10자 이상 입력해주세요.")
    .max(2000, "상담 내용은 2000자 이내로 작성해주세요."),
})

type ConsultationRequestFormData = z.infer<typeof consultationRequestSchema>

interface ConsultationRequestModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studentId: string
  onSuccess?: (updatedData?: ConsultationRequest) => void
  mode?: "create" | "edit"
  editData?: ConsultationRequest
}

export function ConsultationRequestModal({
  open,
  onOpenChange,
  studentId,
  onSuccess,
  mode = "create",
  editData,
}: ConsultationRequestModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditMode = mode === "edit" && editData

  const form = useForm<ConsultationRequestFormData>({
    resolver: zodResolver(consultationRequestSchema),
    defaultValues: {
      method: "대면",
      type: "학습관련",
      content: "",
    },
  })

  // 수정 모드일 때 기존 데이터로 폼 초기화
  useEffect(() => {
    if (open && isEditMode && editData) {
      form.reset({
        method: editData.method as "대면" | "전화",
        type: editData.type as "학습관련" | "운영관련" | "기타",
        content: editData.content,
      })
    } else if (open && !isEditMode) {
      form.reset({
        method: "대면",
        type: "학습관련",
        content: "",
      })
    }
  }, [open, isEditMode, editData, form])

  const onSubmit = async (data: ConsultationRequestFormData) => {
    setIsSubmitting(true)

    try {
      // 수정 모드일 때는 PUT, 생성 모드일 때는 POST
      const url = isEditMode
        ? `/api/consultation-requests/${editData.id}`
        : "/api/consultation-requests"
      const method = isEditMode ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          isEditMode
            ? data
            : {
                student_id: studentId,
                ...data,
              }
        ),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ||
            (isEditMode
              ? "상담 요청 수정에 실패했습니다."
              : "상담 요청 등록에 실패했습니다.")
        )
      }

      toast.success(
        isEditMode ? "상담 요청이 수정되었습니다." : "상담 요청이 등록되었습니다.",
        {
          description: isEditMode
            ? undefined
            : "선생님께서 확인 후 연락드리겠습니다.",
        }
      )

      // Reset form and close modal
      form.reset()
      onOpenChange(false)

      // Trigger parent callback with updated data (for edit mode)
      if (onSuccess) {
        onSuccess(isEditMode ? result.data : undefined)
      }
    } catch (error: any) {
      toast.error(
        error.message ||
          (isEditMode
            ? "상담 요청 수정에 실패했습니다."
            : "상담 요청 등록에 실패했습니다.")
      )
      console.error("Submit consultation request error:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const contentLength = form.watch("content")?.length || 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "상담 요청 수정" : "상담 요청"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? (
              "상담 요청 내용을 수정합니다."
            ) : (
              <>
                선생님과의 상담을 요청하실 수 있습니다.
                <br />
                담당 선생님께서 확인 후 연락드리겠습니다.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* 상담 방법 */}
            <FormField
              control={form.control}
              name="method"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>상담 방법</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="대면" />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">
                          대면 상담
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="전화" />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">
                          전화 상담
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 상담 타입 */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>상담 유형</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="상담 유형을 선택하세요" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="학습관련">학습 관련</SelectItem>
                      <SelectItem value="운영관련">운영 관련</SelectItem>
                      <SelectItem value="기타">기타</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 상담 내용 */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>상담 내용</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="상담받고 싶은 내용을 자세히 작성해주세요."
                      className="min-h-[150px] resize-none"
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

            {/* Submit Button */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? isEditMode
                    ? "수정 중..."
                    : "등록 중..."
                  : isEditMode
                    ? "수정"
                    : "상담 요청"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
