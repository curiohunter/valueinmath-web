import { createClient } from "@/lib/supabase/client"
import {
  CommentCardData,
  CommentReaction,
  EmojiType,
} from "@/types/comments"

/**
 * 학생의 월별 학습 코멘트 목록 조회 (포털용)
 * RLS: 해당 학생/학부모만 조회 가능
 * @param studentId 학생 ID
 * @param isTeacher 선생님 여부 (true면 비공개 코멘트도 조회)
 */
export async function getStudentComments(
  studentId: string,
  isTeacher: boolean = false
): Promise<CommentCardData[]> {
  const supabase = createClient()

  // 1. 코멘트 조회 (선생님 이름 포함)
  let query = supabase
    .from("learning_comments")
    .select(`
      *,
      teacher:employees!learning_comments_teacher_id_fkey (
        name
      )
    `)
    .eq("student_id", studentId)

  // 학부모/학생은 공개된 코멘트만 조회
  if (!isTeacher) {
    query = query.eq("is_public", true)
  }

  const { data: comments, error: commentsError } = await query
    .order("year", { ascending: false })
    .order("month", { ascending: false })

  if (commentsError) throw commentsError
  if (!comments) return []

  // 2. 각 코멘트의 반응 조회
  const commentIds = comments.map((c) => c.id)

  const { data: reactions, error: reactionsError } = await supabase
    .from("comment_reactions")
    .select("*")
    .in("comment_id", commentIds)

  if (reactionsError) throw reactionsError

  // 3. 현재 사용자 정보 조회
  const { data: { user } } = await supabase.auth.getUser()

  // 4. 데이터 조합
  const result: CommentCardData[] = comments.map((comment) => {
    const commentReactions: CommentReaction[] = (reactions || [])
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
      is_public: comment.is_public ?? false,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      teacher_name: (comment.teacher as any)?.name || "알 수 없음",
      user_reaction: userReaction?.emoji || null,
      reactions: commentReactions,
      reaction_summary: reactionSummary,
    }
  })

  return result
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
