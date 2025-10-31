"use client"

import { useState } from "react"
import { CommentCardData } from "@/types/comments"
import { ConsultationRequest } from "@/types/consultation-requests"
import { Button } from "@/components/ui/button"
import { MessageSquarePlus, MessageCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LearningCommentCard } from "./learning-comment-card"
import { ConsultationRequestModal } from "./consultation-request-modal"

interface CommentsSectionProps {
  studentId: string
  comments: CommentCardData[]
  consultationRequests: ConsultationRequest[]
  onRefresh?: () => void
}

export function CommentsSection({
  studentId,
  comments,
  consultationRequests,
  onRefresh,
}: CommentsSectionProps) {
  const [showConsultationModal, setShowConsultationModal] = useState(false)

  const handleCommentUpdate = () => {
    // Trigger parent refresh when comment is updated (reaction/reply added)
    if (onRefresh) {
      onRefresh()
    }
  }

  // Sort comments by year and month (newest first)
  const sortedComments = [...comments].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year
    return b.month - a.month
  })

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
            선생님의 피드백과 학부모님의 소통 공간입니다
          </p>
        </div>
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
      </div>

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

      {/* Comments List */}
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
          {sortedComments.map((comment) => (
            <LearningCommentCard
              key={comment.id}
              comment={comment}
              onUpdate={handleCommentUpdate}
            />
          ))}
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
    </div>
  )
}
