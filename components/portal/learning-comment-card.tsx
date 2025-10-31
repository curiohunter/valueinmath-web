"use client"

import { useState } from "react"
import { CommentCardData, EmojiType } from "@/types/comments"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toggleCommentReaction } from "@/lib/comments-client"
import { useAuth } from "@/providers/auth-provider"
import { toast } from "sonner"

interface LearningCommentCardProps {
  comment: CommentCardData
  onUpdate: () => void
}

const EMOJI_LIST: EmojiType[] = ['👍', '❤️', '😊', '🎉', '👏', '🔥']

export function LearningCommentCard({ comment, onUpdate }: LearningCommentCardProps) {
  const { user } = useAuth()
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
      </CardContent>
    </Card>
  )
}
