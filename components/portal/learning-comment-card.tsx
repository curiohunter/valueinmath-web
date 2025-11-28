"use client"

import { useState } from "react"
import { CommentCardData, EmojiType } from "@/types/comments"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { toggleCommentReaction } from "@/lib/comments-client"
import { useAuth } from "@/providers/auth-provider"
import { toast } from "sonner"
import { Pencil, Trash2, Save, X, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface LearningCommentCardProps {
  comment: CommentCardData
  onUpdate: () => void
  canEdit?: boolean  // 수정/삭제 권한 (본인 코멘트만)
}

const EMOJI_LIST: EmojiType[] = ['👍', '❤️', '😊', '🎉', '👏', '🔥']

export function LearningCommentCard({ comment, onUpdate, canEdit = false }: LearningCommentCardProps) {
  const { user } = useAuth()
  const [localReactions, setLocalReactions] = useState(comment.reaction_summary)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Handle edit submit
  const handleEditSubmit = async () => {
    if (!editContent.trim()) {
      toast.error("코멘트 내용을 입력해주세요.")
      return
    }

    if (editContent.length > 2000) {
      toast.error("코멘트 내용은 2000자 이내로 작성해주세요.")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/learning-comments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: comment.id,
          content: editContent,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "코멘트 수정에 실패했습니다.")
      }

      toast.success("코멘트가 수정되었습니다.")
      setIsEditing(false)
      onUpdate()
    } catch (error: any) {
      toast.error(error.message || "코멘트 수정에 실패했습니다.")
      console.error("Edit comment error:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle delete
  const handleDelete = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/learning-comments?id=${comment.id}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "코멘트 삭제에 실패했습니다.")
      }

      toast.success("코멘트가 삭제되었습니다.")
      onUpdate()
    } catch (error: any) {
      toast.error(error.message || "코멘트 삭제에 실패했습니다.")
      console.error("Delete comment error:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Cancel edit
  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditContent(comment.content)
  }

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
    } catch (error: any) {
      toast.error("반응 추가/제거에 실패했습니다.")
      console.error("Toggle reaction error:", error)
      // Revert optimistic update on error
      setLocalReactions(comment.reaction_summary)
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-lg">
                {comment.year}년 {comment.month}월
              </CardTitle>
              <Badge variant="secondary" className="text-xs font-medium">
                <User className="h-3 w-3 mr-1" />
                {comment.teacher_name} 선생님
              </Badge>
            </div>
          </div>
          {/* Edit/Delete Buttons */}
          {canEdit && !isEditing && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="h-8 w-8 p-0"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>코멘트 삭제</AlertDialogTitle>
                    <AlertDialogDescription>
                      {comment.year}년 {comment.month}월 학습 코멘트를 삭제하시겠습니까?
                      <br />
                      이 작업은 되돌릴 수 없습니다.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "삭제 중..." : "삭제"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Comment Content - Edit Mode or Display */}
        {isEditing ? (
          <div className="space-y-4">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="코멘트 내용을 입력해주세요."
              className="min-h-[200px] resize-none"
              maxLength={2000}
              disabled={isSubmitting}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {editContent.length}/2000
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                  disabled={isSubmitting}
                >
                  <X className="h-4 w-4 mr-1" />
                  취소
                </Button>
                <Button
                  size="sm"
                  onClick={handleEditSubmit}
                  disabled={isSubmitting}
                >
                  <Save className="h-4 w-4 mr-1" />
                  {isSubmitting ? "저장 중..." : "저장"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm whitespace-pre-wrap leading-relaxed text-gray-700">
            {comment.content}
          </div>
        )}

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
      </CardContent>
    </Card>
  )
}
