// 학습 코멘트 시스템 타입 정의

export type EmojiType = '👍' | '❤️' | '😊' | '🎉' | '👏' | '🔥'

// 선생님 월별 학습 코멘트
export interface LearningComment {
  id: string
  student_id: string
  teacher_id: string
  year: number
  month: number
  content: string
  created_at: string
  updated_at: string

  // 조인된 데이터 (선택적)
  student_name?: string
  teacher_name?: string
  reaction_counts?: Record<EmojiType, number>
  user_reaction?: EmojiType | null // 현재 사용자의 반응
}

// 이모티콘 반응
export interface CommentReaction {
  id: string
  comment_id: string
  user_id: string
  emoji: EmojiType
  created_at: string
}

// 코멘트 카드용 종합 데이터
export interface CommentCardData extends LearningComment {
  reactions: CommentReaction[]
  reaction_summary: {
    emoji: EmojiType
    count: number
    user_reacted: boolean
  }[]
}

// 코멘트 작성/수정 폼 데이터
export interface LearningCommentFormData {
  student_id: string
  year: number
  month: number
  content: string
}
