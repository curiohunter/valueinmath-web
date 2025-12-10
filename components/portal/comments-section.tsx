"use client"

import React, { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { CommentCardData } from "@/types/comments"
import { ConsultationRequest } from "@/types/consultation-requests"
import { Button } from "@/components/ui/button"
import { MessageSquarePlus, MessageCircle, Save, Calendar, User, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Pencil, Trash2, MoreVertical, HelpCircle } from "lucide-react"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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

// 상태별 툴팁 설명
const statusTooltips: Record<string, string> = {
  "대기중": "선생님이 아직 확인하지 않음",
  "처리중": "선생님이 확인했지만 답변 작성 중",
  "완료": "선생님이 답변 완료",
}

interface CommentsSectionProps {
  studentId: string
  comments: CommentCardData[]
  consultationRequests: ConsultationRequest[]
  onRefresh?: () => void
  canCreateComment?: boolean  // 코멘트 작성 권한 (선생님만)
  teacherId?: string  // 선생님 ID (코멘트 작성용)
  currentUserId?: string  // 현재 로그인한 사용자 ID
  viewerRole?: "employee" | "student" | "parent"  // 현재 사용자 역할
}

export function CommentsSection({
  studentId,
  comments,
  consultationRequests: initialConsultationRequests,
  onRefresh,
  canCreateComment = false,
  teacherId,
  currentUserId,
  viewerRole,
}: CommentsSectionProps) {
  const [showConsultationModal, setShowConsultationModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentCommentIndex, setCurrentCommentIndex] = useState(0)

  // 상담 요청 로컬 상태 (수정/취소 시 페이지 이동 없이 업데이트)
  const [consultationRequests, setConsultationRequests] = useState<ConsultationRequest[]>(initialConsultationRequests)

  // props 변경 시 로컬 상태 동기화 (다른 학생 선택 시)
  useEffect(() => {
    setConsultationRequests(initialConsultationRequests)
  }, [initialConsultationRequests])

  // 수정/취소 모달 상태
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editTargetRequest, setEditTargetRequest] = useState<ConsultationRequest | null>(null)
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)

  // 이전 월을 기본값으로 (1월이면 작년 12월)
  const now = new Date()
  const currentYear = now.getFullYear()  // 연도 선택 옵션용
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const defaultYear = prevMonthDate.getFullYear()
  const defaultMonth = prevMonthDate.getMonth() + 1

  // 상담 요청 표시 설정
  const INITIAL_DISPLAY_COUNT = 3  // 기본 표시 개수
  const [showAllConsultations, setShowAllConsultations] = useState(false)

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

  // 수정 가능 여부 체크 (대기중 상태 + 본인 요청)
  const canModifyRequest = (request: ConsultationRequest) => {
    return (
      request.status === "대기중" &&
      currentUserId &&
      request.requester_id === currentUserId &&
      viewerRole !== "employee"  // 선생님은 수정/취소 불가
    )
  }

  // 수정 버튼 클릭
  const handleEdit = (request: ConsultationRequest) => {
    setEditTargetRequest(request)
    setEditModalOpen(true)
  }

  // 취소 확인 후 실행 (소프트 삭제) - 로컬 상태만 업데이트하여 페이지 이동 방지
  const handleCancel = async (id: string) => {
    setIsCancelling(true)
    try {
      const response = await fetch(`/api/consultation-requests/${id}`, {
        method: "PATCH",
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "상담 요청 취소에 실패했습니다.")
      }

      toast.success("상담 요청이 취소되었습니다.")

      // 로컬 상태에서 해당 요청 제거 (취소된 요청은 목록에서 사라짐)
      setConsultationRequests(prev => prev.filter(req => req.id !== id))
    } catch (error: any) {
      toast.error(error.message || "상담 요청 취소에 실패했습니다.")
      console.error("Cancel consultation request error:", error)
    } finally {
      setIsCancelling(false)
      setCancelTargetId(null)
    }
  }

  // 수정됨 여부 체크
  const isModified = (request: ConsultationRequest) => {
    if (!request.updated_at || !request.created_at) return false
    return new Date(request.updated_at).getTime() > new Date(request.created_at).getTime() + 1000
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
          is_public: false, // 새 코멘트는 기본 비공개, 왼쪽 테이블에서 공개 설정
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "학습 코멘트 작성에 실패했습니다.")
      }

      toast.success("학습 코멘트가 작성되었습니다.")

      // Reset form (기본값을 이전 월로 유지)
      form.reset({
        year: defaultYear,
        month: defaultMonth,
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

  // 표시할 상담 요청 목록
  const displayedConsultations = showAllConsultations
    ? consultationRequests
    : consultationRequests.slice(0, INITIAL_DISPLAY_COUNT)
  const hasMoreConsultations = consultationRequests.length > INITIAL_DISPLAY_COUNT

  // Count pending consultation requests
  const pendingRequests = consultationRequests.filter(
    (req) => req.status === "대기중" || req.status === "처리중"
  ).length

  return (
    <div className="space-y-6">
      {/* Header with Consultation Request Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">월별 학습 코멘트</h2>
          <p className="text-sm text-muted-foreground mt-1 hidden md:block">
            {canCreateComment
              ? "학생의 월별 학습 코멘트를 작성하고 학부모 소통을 확인할 수 있습니다"
              : "선생님의 피드백과 학부모님의 소통 공간입니다"}
          </p>
        </div>
        {!canCreateComment && (
          <Button
            onClick={() => setShowConsultationModal(true)}
            className="gap-2"
            size="sm"
          >
            <MessageSquarePlus className="h-4 w-4" />
            상담 요청
            {pendingRequests > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full">
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
              <br />
              <span className="text-xs">작성된 코멘트의 공개/비공개는 왼쪽 학생 목록에서 설정합니다.</span>
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

      {/* Comments Carousel */}
      {sortedComments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">아직 코멘트가 없습니다</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              선생님이 월별 학습 코멘트를 작성하시면 이곳에 표시됩니다.
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
              <span className="hidden md:inline">이전 코멘트</span>
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
              <span className="hidden md:inline">다음 코멘트</span>
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

      {/* Consultation Requests History */}
      {consultationRequests.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageCircle className="h-5 w-5" />
              상담 요청 이력
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 md:p-6">
            {/* Mobile View: Card Style */}
            <div className="md:hidden p-3 space-y-3">
              {displayedConsultations.map((request) => (
                <div
                  key={request.id}
                  className="bg-gray-50 rounded-lg p-3 space-y-2"
                >
                  {/* 상단: 날짜, 상태, 액션 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          request.status === '완료'
                            ? 'bg-green-100 text-green-700 border-green-200'
                            : request.status === '처리중'
                              ? 'bg-blue-100 text-blue-700 border-blue-200'
                              : 'bg-orange-100 text-orange-700 border-orange-200'
                        }`}
                      >
                        {request.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(request.created_at).toLocaleDateString('ko-KR', {
                          month: 'short',
                          day: 'numeric'
                        })}
                        {isModified(request) && " (수정됨)"}
                      </span>
                    </div>
                    {/* 액션 버튼 */}
                    {canModifyRequest(request) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 px-2">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(request)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            수정
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setCancelTargetId(request.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            취소
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  {/* 내용 */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {request.method}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {request.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">
                      {request.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">요청일</TableHead>
                    <TableHead className="w-[80px]">방법</TableHead>
                    <TableHead className="w-[100px]">유형</TableHead>
                    <TableHead className="max-w-[300px]">내용</TableHead>
                    <TableHead className="w-[100px]">담당자</TableHead>
                    <TableHead className="w-[90px]">상태</TableHead>
                    {viewerRole !== "employee" && (
                      <TableHead className="w-[80px]">액션</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedConsultations.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {new Date(request.created_at).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit'
                          })}
                          {isModified(request) && (
                            <span className="text-xs text-muted-foreground ml-1">(수정됨)</span>
                          )}
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
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                variant={
                                  request.status === '완료'
                                    ? 'default'
                                    : request.status === '처리중'
                                      ? 'secondary'
                                      : 'outline'
                                }
                                className={`flex items-center gap-1 cursor-help ${
                                  request.status === '완료'
                                    ? 'bg-green-100 text-green-800 border-green-200'
                                    : request.status === '처리중'
                                      ? 'bg-blue-100 text-blue-800 border-blue-200'
                                      : 'bg-orange-100 text-orange-800 border-orange-200'
                                }`}
                              >
                                {request.status}
                                <HelpCircle className="h-3 w-3" />
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              {statusTooltips[request.status] || request.status}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      {viewerRole !== "employee" && (
                        <TableCell>
                          {canModifyRequest(request) ? (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleEdit(request)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => setCancelTargetId(request.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* 더보기/접기 버튼 */}
            {hasMoreConsultations && (
              <div className="flex justify-center py-3 md:pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllConsultations(!showAllConsultations)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {showAllConsultations ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      접기
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      {consultationRequests.length - INITIAL_DISPLAY_COUNT}개 더보기
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 수정 모달 */}
      {editTargetRequest && (
        <ConsultationRequestModal
          open={editModalOpen}
          onOpenChange={(open) => {
            setEditModalOpen(open)
            if (!open) setEditTargetRequest(null)
          }}
          studentId={studentId}
          mode="edit"
          editData={editTargetRequest}
          onSuccess={(updatedData) => {
            setEditModalOpen(false)
            setEditTargetRequest(null)
            // 로컬 상태 업데이트 (페이지 이동 없이)
            if (updatedData) {
              setConsultationRequests(prev =>
                prev.map(req => req.id === updatedData.id ? { ...req, ...updatedData } : req)
              )
            }
          }}
        />
      )}

      {/* 취소 확인 다이얼로그 */}
      <AlertDialog open={!!cancelTargetId} onOpenChange={() => setCancelTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>상담 요청 취소</AlertDialogTitle>
            <AlertDialogDescription>
              이 상담 요청을 취소하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>아니오</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelTargetId && handleCancel(cancelTargetId)}
              disabled={isCancelling}
            >
              {isCancelling ? "취소 중..." : "취소하기"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
