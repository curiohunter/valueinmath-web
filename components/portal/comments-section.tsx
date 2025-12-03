"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { CommentCardData } from "@/types/comments"
import { ConsultationRequest } from "@/types/consultation-requests"
import { Button } from "@/components/ui/button"
import { MessageSquarePlus, MessageCircle, Save, Calendar, User, ChevronLeft, ChevronRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LearningCommentCard } from "./learning-comment-card"
import { ConsultationRequestModal } from "./consultation-request-modal"
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
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"

const commentFormSchema = z.object({
  year: z.number().min(2020).max(2100),
  month: z.number().min(1).max(12),
  content: z
    .string()
    .min(10, "코멘트 내용을 10자 이상 입력해주세요.")
    .max(2000, "코멘트 내용은 2000자 이내로 작성해주세요."),
})

type CommentFormData = z.infer<typeof commentFormSchema>

interface CommentsSectionProps {
  studentId: string
  comments: CommentCardData[]
  consultationRequests: ConsultationRequest[]
  onRefresh?: () => void
  canCreateComment?: boolean  // 코멘트 작성 권한 (선생님만)
  teacherId?: string  // 선생님 ID (코멘트 작성용)
}

export function CommentsSection({
  studentId,
  comments,
  consultationRequests,
  onRefresh,
  canCreateComment = false,
  teacherId,
}: CommentsSectionProps) {
  const [showConsultationModal, setShowConsultationModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentCommentIndex, setCurrentCommentIndex] = useState(0)
  const [consultationsPage, setConsultationsPage] = useState(1)

  // 이전 월을 기본값으로 (1월이면 작년 12월)
  const now = new Date()
  const currentYear = now.getFullYear()  // 연도 선택 옵션용
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const defaultYear = prevMonthDate.getFullYear()
  const defaultMonth = prevMonthDate.getMonth() + 1

  // Pagination constants (only for consultations)
  const ITEMS_PER_PAGE = 12

  const form = useForm<CommentFormData>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: {
      year: defaultYear,
      month: defaultMonth,
      content: "",
    },
  })

  const handleCommentUpdate = () => {
    // Trigger parent refresh when comment is updated (reaction/reply added)
    if (onRefresh) {
      onRefresh()
    }
  }

  const onSubmit = async (data: CommentFormData) => {
    if (!teacherId) {
      toast.error("선생님 정보를 찾을 수 없습니다.")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/learning-comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_id: studentId,
          year: data.year,
          month: data.month,
          content: data.content,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "학습 코멘트 작성에 실패했습니다.")
      }

      toast.success("학습 코멘트가 작성되었습니다.")

      // Reset form
      form.reset({
        year: currentYear,
        month: currentMonth,
        content: "",
      })

      // Trigger parent refresh
      if (onRefresh) {
        onRefresh()
      }
    } catch (error: any) {
      toast.error(error.message || "학습 코멘트 작성에 실패했습니다.")
      console.error("Submit comment error:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const contentLength = form.watch("content")?.length || 0
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1]

  // Sort comments by year and month (newest first)
  const sortedComments = [...comments].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year
    return b.month - a.month
  })

  // Current comment for carousel display
  const currentComment = sortedComments[currentCommentIndex]
  const totalComments = sortedComments.length

  // Pagination for consultation requests only
  const totalConsultationsPages = Math.ceil(consultationRequests.length / ITEMS_PER_PAGE)
  const paginatedConsultations = consultationRequests.slice(
    (consultationsPage - 1) * ITEMS_PER_PAGE,
    consultationsPage * ITEMS_PER_PAGE
  )

  // Count pending consultation requests
  const pendingRequests = consultationRequests.filter(
    (req) => req.status === "대기중" || req.status === "처리중"
  ).length

  return (
    <div className="space-y-6">
      {/* Header with Consultation Request Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">월별 학습 코멘트</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {canCreateComment
              ? "학생의 월별 학습 코멘트를 작성하고 학부모 소통을 확인할 수 있습니다"
              : "선생님의 피드백과 학부모님의 소통 공간입니다"}
          </p>
        </div>
        {!canCreateComment && (
          <Button
            onClick={() => setShowConsultationModal(true)}
            className="gap-2"
            size="lg"
          >
            <MessageSquarePlus className="h-5 w-5" />
            상담 요청
            {pendingRequests > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {pendingRequests}
              </span>
            )}
          </Button>
        )}
      </div>

      {/* Teacher Comment Form (only for teachers) */}
      {canCreateComment && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>학습 코멘트 작성</span>
              <Badge variant="outline" className="bg-white">
                선생님 전용
              </Badge>
            </CardTitle>
            <CardDescription>
              선택된 학생의 월별 학습 코멘트를 작성할 수 있습니다.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                          placeholder={`${form.watch("month")}월 학습 코멘트를 작성해주세요.`}
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

                {/* Submit Button */}
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSubmitting}>
                    <Save className="h-4 w-4 mr-2" />
                    {isSubmitting ? "저장 중..." : "코멘트 저장"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Pending Consultation Requests Alert */}
      {pendingRequests > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-orange-900 flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              진행 중인 상담 요청
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-orange-800">
              {pendingRequests}건의 상담 요청이 처리 중입니다.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Comments Carousel */}
      {sortedComments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">아직 코멘트가 없습니다</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              선생님이 월별 학습 코멘트를 작성하시면 이곳에 표시됩니다.
              <br />
              코멘트에 댓글을 남기고 이모티콘 반응을 해보세요!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Navigation buttons and counter */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentCommentIndex(i => Math.max(0, i - 1))}
              disabled={currentCommentIndex === 0}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              이전 코멘트
            </Button>
            <span className="text-sm font-medium text-muted-foreground">
              {currentCommentIndex + 1} / {totalComments}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentCommentIndex(i => Math.min(totalComments - 1, i + 1))}
              disabled={currentCommentIndex === totalComments - 1}
              className="gap-2"
            >
              다음 코멘트
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Single comment card */}
          <LearningCommentCard
            key={currentComment.id}
            comment={currentComment}
            onUpdate={handleCommentUpdate}
            canEdit={canCreateComment && teacherId === currentComment.teacher_id}
          />
        </div>
      )}

      {/* Floating Action Button for Mobile */}
      <Button
        onClick={() => setShowConsultationModal(true)}
        className="fixed bottom-20 right-6 h-14 w-14 rounded-full shadow-lg md:hidden"
        size="icon"
      >
        <MessageSquarePlus className="h-6 w-6" />
      </Button>

      {/* Consultation Request Modal */}
      <ConsultationRequestModal
        open={showConsultationModal}
        onOpenChange={setShowConsultationModal}
        studentId={studentId}
        onSuccess={() => {
          if (onRefresh) {
            onRefresh()
          }
        }}
      />

      {/* Consultation Requests History Table */}
      {consultationRequests.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              상담 요청 이력
            </CardTitle>
            <CardDescription>
              학부모/학생이 요청한 상담 내역입니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">요청일</TableHead>
                  <TableHead className="w-[80px]">방법</TableHead>
                  <TableHead className="w-[100px]">유형</TableHead>
                  <TableHead className="max-w-[300px]">내용</TableHead>
                  <TableHead className="w-[100px]">담당자</TableHead>
                  <TableHead className="w-[90px]">상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedConsultations.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {new Date(request.created_at).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit'
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {request.method}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {request.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <p className="text-sm line-clamp-2">{request.content}</p>
                    </TableCell>
                    <TableCell className="text-sm">
                      {request.counselor_name ? (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          {request.counselor_name}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">미배정</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          request.status === '완료'
                            ? 'default'
                            : request.status === '처리중'
                            ? 'secondary'
                            : 'outline'
                        }
                        className={
                          request.status === '완료'
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : request.status === '처리중'
                            ? 'bg-blue-100 text-blue-800 border-blue-200'
                            : 'bg-orange-100 text-orange-800 border-orange-200'
                        }
                      >
                        {request.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Consultations Pagination */}
            {totalConsultationsPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConsultationsPage(p => Math.max(1, p - 1))}
                  disabled={consultationsPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {consultationsPage} / {totalConsultationsPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConsultationsPage(p => Math.min(totalConsultationsPages, p + 1))}
                  disabled={consultationsPage === totalConsultationsPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
