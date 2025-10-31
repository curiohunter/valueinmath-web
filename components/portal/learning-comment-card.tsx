"use client"

import { useState } from "react"
import { CommentCardData, EmojiType } from "@/types/comments"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MessageSquare, ChevronDown, ChevronUp, Send } from "lucide-react"
import { toggleCommentReaction, createCommentReply } from "@/lib/comments-client"
import { useAuth } from "@/providers/auth-provider"
import { toast } from "sonner"

interface LearningCommentCardProps {
  comment: CommentCardData
  onUpdate: () => void
}

const EMOJI_LIST: EmojiType[] = ['👍', '❤️', '😊', '🎉', '👏', '🔥']

export function LearningCommentCard({ comment, onUpdate }: LearningCommentCardProps) {
  const { user } = useAuth()
  const [showReplies, setShowReplies] = useState(false)
  const [replyContent, setReplyContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [localReactions, setLocalReactions] = useState(comment.reaction_summary)

  // Handle emoji reaction click
  const handleReactionClick = async (emoji: EmojiType) => {
    if (!user) {
      toast.error("로그인이 필요합니다.")
      return
    }

    try {
      // Optimistic UI update
      const currentReaction = localReactions.find(r => r.emoji === emoji)
      const newReactions = localReactions.map(r => {
        if (r.emoji === emoji) {
          return {
            ...r,
            count: r.user_reacted ? r.count - 1 : r.count + 1,
            user_reacted: !r.user_reacted,
          }
        }
        return r
      }).filter(r => r.count > 0) // Remove reactions with 0 count

      // If emoji wasn't in list and user is adding it
      if (!currentReaction) {
        newReactions.push({
          emoji,
          count: 1,
          user_reacted: true,
        })
      }

      setLocalReactions(newReactions)

      // API call
      await toggleCommentReaction(comment.id, emoji)

      // Refresh parent data
      onUpdate()
    } catch (error: any) {
      toast.error("반응 추가/제거에 실패했습니다.")
      console.error("Toggle reaction error:", error)
      // Revert optimistic update on error
      setLocalReactions(comment.reaction_summary)
    }
  }

  // Handle reply submission
  const handleReplySubmit = async () => {
    if (!replyContent.trim()) {
      toast.error("댓글 내용을 입력해주세요.")
      return
    }

    if (replyContent.length > 1000) {
      toast.error("댓글은 1000자 이내로 작성해주세요.")
      return
    }

    setIsSubmitting(true)

    try {
      await createCommentReply({
        comment_id: comment.id,
        content: replyContent.trim(),
      })

      setReplyContent("")
      setShowReplies(true)
      toast.success("댓글이 작성되었습니다.")

      // Refresh parent data
      onUpdate()
    } catch (error: any) {
      toast.error("댓글 작성에 실패했습니다.")
      console.error("Create reply error:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Determine if user can reply (parents and students only)
  const canReply = user !== null // All authenticated users can reply for now

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">
              {comment.year}년 {comment.month}월 학습 코멘트
            </CardTitle>
            <CardDescription className="mt-1">
              {comment.teacher_name} 선생님 • {new Date(comment.created_at).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Comment Content */}
        <div className="text-sm whitespace-pre-wrap leading-relaxed text-gray-700">
          {comment.content}
        </div>

        {/* Emoji Reactions Section */}
        <div className="pt-4 border-t">
          {/* Reaction Summary (Display) */}
          {localReactions.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {localReactions.map((reaction) => (
                <button
                  key={reaction.emoji}
                  onClick={() => handleReactionClick(reaction.emoji)}
                  className={`
                    px-3 py-1.5 rounded-full text-sm font-medium transition-all
                    flex items-center gap-1.5
                    ${reaction.user_reacted
                      ? 'bg-blue-100 text-blue-700 border-2 border-blue-400'
                      : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                    }
                  `}
                >
                  <span className="text-lg">{reaction.emoji}</span>
                  <span className="text-xs font-semibold">{reaction.count}</span>
                </button>
              ))}
            </div>
          )}

          {/* Reaction Picker (All Emojis) */}
          <div className="flex flex-wrap gap-2">
            {EMOJI_LIST.map((emoji) => {
              const existingReaction = localReactions.find(r => r.emoji === emoji)
              const isActive = existingReaction?.user_reacted || false

              return (
                <button
                  key={emoji}
                  onClick={() => handleReactionClick(emoji)}
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-xl
                    transition-all hover:scale-110
                    ${isActive
                      ? 'bg-blue-100 border-2 border-blue-400 scale-105'
                      : 'bg-gray-50 border border-gray-300 hover:bg-gray-100'
                    }
                  `}
                  title={`${emoji} 반응`}
                >
                  {emoji}
                </button>
              )
            })}
          </div>
        </div>

        {/* Replies Section */}
        <div className="pt-4 border-t">
          {/* Toggle Replies Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowReplies(!showReplies)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-3"
          >
            <MessageSquare className="h-4 w-4" />
            댓글 {comment.replies.length}개
            {showReplies ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

          {/* Replies List */}
          {showReplies && (
            <div className="space-y-3">
              {comment.replies.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  아직 댓글이 없습니다. 첫 댓글을 남겨보세요!
                </p>
              ) : (
                <>
                  {comment.replies.slice(0, 5).map((reply) => (
                    <div key={reply.id} className="flex gap-3">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="text-xs">
                          {reply.user_name?.[0] || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-semibold">{reply.user_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(reply.created_at).toLocaleDateString('ko-KR', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {reply.content}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Show More Button */}
                  {comment.replies.length > 5 && (
                    <Button
                      variant="link"
                      size="sm"
                      className="text-xs text-muted-foreground"
                    >
                      댓글 {comment.replies.length - 5}개 더보기
                    </Button>
                  )}
                </>
              )}
            </div>
          )}

          {/* Reply Input Form */}
          {canReply && showReplies && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex gap-3">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="text-xs">나</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <Textarea
                    placeholder="댓글을 입력하세요... (최대 1000자)"
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    className="min-h-[80px] resize-none"
                    maxLength={1000}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {replyContent.length}/1000
                    </span>
                    <Button
                      onClick={handleReplySubmit}
                      disabled={isSubmitting || !replyContent.trim()}
                      size="sm"
                      className="gap-2"
                    >
                      <Send className="h-4 w-4" />
                      {isSubmitting ? "작성 중..." : "댓글 작성"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
