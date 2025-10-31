import { createClient } from "@/lib/supabase/client"
import {
  CommentCardData,
  CommentReply,
  CommentReaction,
  CommentReplyFormData,
  EmojiType,
} from "@/types/comments"

/**
 * 학생의 월별 학습 코멘트 목록 조회 (포털용)
 * RLS: 해당 학생/학부모만 조회 가능
 */
export async function getStudentComments(studentId: string): Promise<CommentCardData[]> {
  const supabase = createClient()

  // 1. 코멘트 조회 (선생님 이름 포함)
  const { data: comments, error: commentsError } = await supabase
    .from("learning_comments")
    .select(`
      *,
      teacher:employees!learning_comments_teacher_id_fkey (
        name
      )
    `)
    .eq("student_id", studentId)
    .order("year", { ascending: false })
    .order("month", { ascending: false })

  if (commentsError) throw commentsError
  if (!comments) return []

  // 2. 각 코멘트의 댓글 및 반응 조회
  const commentIds = comments.map((c) => c.id)

  const [repliesResult, reactionsResult] = await Promise.all([
    supabase
      .from("comment_replies")
      .select(`
        *,
        user:profiles!comment_replies_user_id_fkey (
          name,
          role
        )
      `)
      .in("comment_id", commentIds)
      .order("created_at", { ascending: true }),
    supabase
      .from("comment_reactions")
      .select("*")
      .in("comment_id", commentIds),
  ])

  if (repliesResult.error) throw repliesResult.error
  if (reactionsResult.error) throw reactionsResult.error

  const replies = repliesResult.data || []
  const reactions = reactionsResult.data || []

  // 3. 현재 사용자 정보 조회
  const { data: { user } } = await supabase.auth.getUser()

  // 4. 데이터 조합
  const result: CommentCardData[] = comments.map((comment) => {
    const commentReplies: CommentReply[] = replies
      .filter((r) => r.comment_id === comment.id)
      .map((r) => ({
        id: r.id,
        comment_id: r.comment_id,
        user_id: r.user_id,
        content: r.content,
        created_at: r.created_at,
        updated_at: r.updated_at,
        user_name: (r.user as any)?.name || "알 수 없음",
        user_role: (r.user as any)?.role || "parent",
      }))

    const commentReactions: CommentReaction[] = reactions
      .filter((r) => r.comment_id === comment.id)
      .map((r) => ({
        id: r.id,
        comment_id: r.comment_id,
        user_id: r.user_id,
        emoji: r.emoji as EmojiType,
        created_at: r.created_at,
      }))

    // 반응 요약 계산
    const reactionSummary = calculateReactionSummary(commentReactions, user?.id || null)

    // 사용자의 반응 찾기
    const userReaction = commentReactions.find((r) => r.user_id === user?.id)

    return {
      id: comment.id,
      student_id: comment.student_id,
      teacher_id: comment.teacher_id,
      year: comment.year,
      month: comment.month,
      content: comment.content,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      teacher_name: (comment.teacher as any)?.name || "알 수 없음",
      reply_count: commentReplies.length,
      user_reaction: userReaction?.emoji || null,
      replies: commentReplies,
      reactions: commentReactions,
      reaction_summary: reactionSummary,
    }
  })

  return result
}

/**
 * 댓글 작성 (포털용)
 * RLS: 해당 학생/학부모만 작성 가능
 */
export async function createCommentReply(data: CommentReplyFormData): Promise<CommentReply> {
  const supabase = createClient()

  const { data: reply, error } = await supabase
    .from("comment_replies")
    .insert({
      comment_id: data.comment_id,
      content: data.content,
      user_id: (await supabase.auth.getUser()).data.user?.id,
    })
    .select()
    .single()

  if (error) throw error
  if (!reply) throw new Error("댓글 작성에 실패했습니다.")

  return {
    id: reply.id,
    comment_id: reply.comment_id,
    user_id: reply.user_id,
    content: reply.content,
    created_at: reply.created_at,
    updated_at: reply.updated_at,
  }
}

/**
 * 댓글 수정 (본인만 가능)
 */
export async function updateCommentReply(replyId: string, content: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from("comment_replies")
    .update({ content })
    .eq("id", replyId)

  if (error) throw error
}

/**
 * 댓글 삭제 (본인만 가능)
 */
export async function deleteCommentReply(replyId: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from("comment_replies")
    .delete()
    .eq("id", replyId)

  if (error) throw error
}

/**
 * 이모티콘 반응 추가/제거 (토글)
 */
export async function toggleCommentReaction(
  commentId: string,
  emoji: EmojiType
): Promise<"added" | "removed"> {
  const supabase = createClient()
  const userId = (await supabase.auth.getUser()).data.user?.id

  if (!userId) throw new Error("로그인이 필요합니다.")

  // 기존 반응 확인
  const { data: existing } = await supabase
    .from("comment_reactions")
    .select("id")
    .eq("comment_id", commentId)
    .eq("user_id", userId)
    .eq("emoji", emoji)
    .single()

  if (existing) {
    // 반응 제거
    const { error } = await supabase
      .from("comment_reactions")
      .delete()
      .eq("id", existing.id)

    if (error) throw error
    return "removed"
  } else {
    // 반응 추가
    const { error } = await supabase
      .from("comment_reactions")
      .insert({
        comment_id: commentId,
        user_id: userId,
        emoji,
      })

    if (error) throw error
    return "added"
  }
}

/**
 * 반응 요약 계산 헬퍼 함수
 */
function calculateReactionSummary(
  reactions: CommentReaction[],
  currentUserId: string | null
) {
  const emojis: EmojiType[] = ['👍', '❤️', '😊', '🎉', '👏', '🔥']

  return emojis.map((emoji) => {
    const emojiReactions = reactions.filter((r) => r.emoji === emoji)
    return {
      emoji,
      count: emojiReactions.length,
      user_reacted: emojiReactions.some((r) => r.user_id === currentUserId),
    }
  }).filter((summary) => summary.count > 0) // 카운트 0인 것 제외
}
