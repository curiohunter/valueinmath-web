// ============================================
// 회의 관리 시스템 타입 정의
// ============================================

// --- Enums ---

export type MeetingStatus = "draft" | "synced" | "finalized"
export type MeetingItemCategory = "discussion" | "decision" | "follow_up" | "note"
export type ActionItemStatus = "pending" | "in_progress" | "completed" | "cancelled"
export type ActionItemPriority = "high" | "medium" | "low"

// --- DB Row Types ---

export interface MeetingTopic {
  id: string
  hedy_topic_id: string
  name: string
  color: string | null
  icon_name: string | null
  overview: HedyTopicOverview | null
  session_count: number
  created_at: string
  updated_at: string
}

export interface Meeting {
  id: string
  hedy_session_id: string | null
  title: string
  meeting_date: string
  start_time: string | null
  end_time: string | null
  duration_minutes: number | null
  topic_id: string | null
  topic?: MeetingTopic
  status: MeetingStatus
  transcript: string | null
  recap: string | null
  meeting_minutes: string | null
  conversations: string | null
  cleaned_transcript: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface MeetingParticipant {
  id: string
  meeting_id: string
  employee_id: string | null
  name: string
  is_external: boolean
  created_at: string
}

export interface MeetingItem {
  id: string
  meeting_id: string
  category: MeetingItemCategory
  content: string
  sort_order: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ActionItemAssignee {
  id: string
  action_item_id: string
  employee_id: string
  employee_name_snapshot: string | null
  created_at: string
}

export interface MeetingActionItem {
  id: string
  meeting_id: string
  hedy_todo_id: string | null
  content: string
  assignees: ActionItemAssignee[]
  due_date: string | null
  due_date_raw: string | null
  priority: ActionItemPriority
  status: ActionItemStatus
  completed_at: string | null
  sort_order: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface MeetingHighlight {
  id: string
  meeting_id: string
  hedy_highlight_id: string | null
  title: string | null
  raw_quote: string | null
  cleaned_quote: string | null
  main_idea: string | null
  ai_insight: string | null
  time_index_ms: number | null
  created_at: string
}

// --- Composite Types ---

export interface MeetingWithDetails extends Meeting {
  participants: MeetingParticipant[]
  items: MeetingItem[]
  action_items: MeetingActionItem[]
  highlights: MeetingHighlight[]
}

// --- Form / Insert Types ---

export interface MeetingFormData {
  title: string
  meeting_date: string
  start_time?: string
  end_time?: string
  duration_minutes?: number
  status?: MeetingStatus
}

export interface MeetingItemFormData {
  category: MeetingItemCategory
  content: string
  sort_order?: number
}

export interface MeetingActionItemFormData {
  content: string
  assignee_ids?: string[]
  due_date?: string
  status?: ActionItemStatus
}

export interface MeetingParticipantFormData {
  employee_id?: string
  name: string
  is_external?: boolean
}

// --- Filter ---

export interface MeetingFilter {
  status?: MeetingStatus
  topic_id?: string
  date_from?: string
  date_to?: string
  search?: string
}

// --- Hedy API Types ---

export interface HedyTopicOverview {
  overviewParagraphs?: string[]
  prepNote?: {
    title: string
    bullets: string[]
  }
}

export interface HedySession {
  sessionId: string
  title: string
  startTime: string
  endTime: string
  duration: number
  transcript: string
  recap: string
  meeting_minutes: string
  conversations: string
  cleaned_transcript: string | null
  highlights: HedyHighlight[]
  user_todos: HedyTodo[]
}

export interface HedyTodo {
  id: string
  text: string
  dueDate: string
  completed: boolean
  topic?: {
    id: string
    name: string
    color: string
    iconName: string
  }
}

export interface HedyHighlight {
  id: string
  title: string
  rawQuote: string
  cleanedQuote: string
  mainIdea: string
  aiInsight: string
  timeIndexMs: number
}

export interface HedyTopic {
  id: string
  name: string
  color: string
  iconName: string
  overview?: HedyTopicOverview
  dominantSessionType: string
  sessionCount: number
}

// --- AI Categorize Types ---

export interface MeetingAICategorizeResponse {
  discussion: string[]
  decision: string[]
  follow_up: string[]
}

export interface MeetingActionItemFormDataExtended extends MeetingActionItemFormData {
  priority?: ActionItemPriority
}
