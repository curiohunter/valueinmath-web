export interface Todo {
  id: string
  title: string
  description?: string | null
  status: 'pending' | 'in_progress' | 'completed' | 'archived' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assigned_to?: string | null
  assigned_name?: string | null
  created_by?: string | null
  created_by_name?: string | null
  due_date?: string | null
  completed_at?: string | null
  completed_by?: string | null
  archived_at?: string | null
  created_at: string
  updated_at: string
}

export interface Memo {
  id: string
  title: string
  content: string
  category: 'general' | 'idea' | 'notice' | 'reminder'
  created_by?: string | null
  created_by_name?: string | null
  is_pinned: boolean
  is_archived: boolean
  last_activity_at: string
  expires_at?: string | null
  created_at: string
  updated_at: string
}

export interface Comment {
  id: string
  parent_type: 'todo' | 'memo'
  parent_id: string
  content: string
  created_by?: string | null
  created_by_name?: string | null
  created_at: string
}

export interface TodoFilter {
  showCompleted: boolean
  completedRange: 'today' | 'week' | 'month' | 'all'
  showArchived: boolean
  assignedTo?: string | null
  priority?: string | null
}

export interface MemoFilter {
  showArchived: boolean
  category: 'all' | 'general' | 'idea' | 'notice' | 'reminder'
  showPinnedOnly: boolean
}