"use client"

import { useState, useEffect } from "react"
import { X, Plus, MessageSquare, Pin, Archive, Calendar, User, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { TodoList } from "./TodoList"
import { MemoList } from "./MemoList"
import { TodoModal } from "./TodoModal"
import { MemoModal } from "./MemoModal"
import type { Todo, Memo, TodoFilter, MemoFilter } from "@/types/workspace"
import { format, isToday, isThisWeek, isThisMonth } from "date-fns"
import { ko } from "date-fns/locale"

interface GlobalWorkspacePanelProps {
  user?: any
  isOpen: boolean
  onClose: () => void
}

export default function GlobalWorkspacePanel({ user, isOpen, onClose }: GlobalWorkspacePanelProps) {
  const [activeTab, setActiveTab] = useState<"todos" | "memos">("todos")
  const [todos, setTodos] = useState<Todo[]>([])
  const [memos, setMemos] = useState<Memo[]>([])
  const [loading, setLoading] = useState(false)
  
  // 모달 상태
  const [todoModalOpen, setTodoModalOpen] = useState(false)
  const [memoModalOpen, setMemoModalOpen] = useState(false)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [editingMemo, setEditingMemo] = useState<Memo | null>(null)
  
  // 필터 상태
  const [todoFilter, setTodoFilter] = useState<TodoFilter>({
    showCompleted: false,
    completedRange: 'today',
    showArchived: false
  })
  
  const [memoFilter, setMemoFilter] = useState<MemoFilter>({
    showArchived: false,
    category: 'all',
    showPinnedOnly: false
  })
  
  const supabase = createClient()

  // 데이터 로드
  useEffect(() => {
    if (isOpen) {
      loadTodos()
      loadMemos()
    }
    
    return () => {
      // 구독 정리
      supabase.removeAllChannels()
    }
  }, [isOpen])
  
  // 실시간 구독은 별도 useEffect
  useEffect(() => {
    if (isOpen) {
      setupRealtimeSubscriptions()
    }
    
    return () => {
      supabase.removeAllChannels()
    }
  }, [isOpen])

  // 투두 로드
  const loadTodos = async () => {
    try {
      // 먼저 todos 가져오기
      const { data: todosData, error: todosError } = await supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (todosError) throw todosError
      
      // 각 todo의 댓글 수 가져오기
      if (todosData && todosData.length > 0) {
        const todoIds = todosData.map(t => t.id)
        const { data: commentCounts, error: commentError } = await supabase
          .from('comments')
          .select('parent_id')
          .eq('parent_type', 'todo')
          .in('parent_id', todoIds)
        
        if (!commentError && commentCounts) {
          // 댓글 수 계산
          const countMap = commentCounts.reduce((acc, comment) => {
            acc[comment.parent_id] = (acc[comment.parent_id] || 0) + 1
            return acc
          }, {} as Record<string, number>)
          
          // todos에 댓글 수 추가
          const todosWithComments = todosData.map(todo => ({
            ...todo,
            comment_count: countMap[todo.id] || 0
          }))
          
          setTodos(todosWithComments)
        } else {
          setTodos(todosData || [])
        }
      } else {
        setTodos([])
      }
    } catch (error) {
      console.error('투두 로드 오류:', error)
    }
  }

  // 메모 로드
  const loadMemos = async () => {
    try {
      // 먼저 memos 가져오기
      const { data: memosData, error: memosError } = await supabase
        .from('memos')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
      
      if (memosError) throw memosError
      
      // 각 memo의 댓글 수 가져오기
      if (memosData && memosData.length > 0) {
        const memoIds = memosData.map(m => m.id)
        const { data: commentCounts, error: commentError } = await supabase
          .from('comments')
          .select('parent_id')
          .eq('parent_type', 'memo')
          .in('parent_id', memoIds)
        
        if (!commentError && commentCounts) {
          // 댓글 수 계산
          const countMap = commentCounts.reduce((acc, comment) => {
            acc[comment.parent_id] = (acc[comment.parent_id] || 0) + 1
            return acc
          }, {} as Record<string, number>)
          
          // memos에 댓글 수 추가
          const memosWithComments = memosData.map(memo => ({
            ...memo,
            comment_count: countMap[memo.id] || 0
          }))
          
          setMemos(memosWithComments)
        } else {
          setMemos(memosData || [])
        }
      } else {
        setMemos([])
      }
    } catch (error) {
      console.error('메모 로드 오류:', error)
    }
  }

  // 실시간 구독 설정
  const setupRealtimeSubscriptions = () => {
    // 투두 실시간 구독
    supabase
      .channel('todos-channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'todos' },
        (payload) => {
          console.log('Todo change:', payload)
          if (payload.eventType === 'INSERT') {
            setTodos(prev => {
              // Check if already exists to prevent duplicates
              const exists = prev.some(t => t.id === (payload.new as Todo).id)
              if (exists) return prev
              return [{ ...(payload.new as Todo), comment_count: 0 }, ...prev]
            })
          } else if (payload.eventType === 'UPDATE') {
            setTodos(prev => prev.map(t => 
              t.id === payload.new.id 
                ? { ...(payload.new as Todo), comment_count: t.comment_count || 0 } 
                : t
            ))
          } else if (payload.eventType === 'DELETE') {
            setTodos(prev => prev.filter(t => t.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    // 메모 실시간 구독
    supabase
      .channel('memos-channel')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'memos' },
        (payload) => {
          console.log('Memo change:', payload)
          if (payload.eventType === 'INSERT') {
            setMemos(prev => {
              // Check if already exists to prevent duplicates
              const exists = prev.some(m => m.id === (payload.new as Memo).id)
              if (exists) return prev
              return [{ ...(payload.new as Memo), comment_count: 0 }, ...prev]
            })
          } else if (payload.eventType === 'UPDATE') {
            setMemos(prev => prev.map(m => 
              m.id === payload.new.id 
                ? { ...(payload.new as Memo), comment_count: m.comment_count || 0 }
                : m
            ))
          } else if (payload.eventType === 'DELETE') {
            setMemos(prev => prev.filter(m => m.id !== payload.old.id))
          }
        }
      )
      .subscribe()
    
    // 댓글 실시간 구독 - 댓글 수 업데이트용
    supabase
      .channel('comments-channel')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'comments' },
        (payload: any) => {
          console.log('Comment change:', payload)
          if (payload.eventType === 'INSERT') {
            // 새 댓글 추가 시 해당 todo/memo의 댓글 수 증가
            if (payload.new.parent_type === 'todo') {
              setTodos(prev => prev.map(t => 
                t.id === payload.new.parent_id 
                  ? { ...t, comment_count: (t.comment_count || 0) + 1 }
                  : t
              ))
            } else if (payload.new.parent_type === 'memo') {
              setMemos(prev => prev.map(m => 
                m.id === payload.new.parent_id 
                  ? { ...m, comment_count: (m.comment_count || 0) + 1 }
                  : m
              ))
            }
          } else if (payload.eventType === 'DELETE') {
            // 댓글 삭제 시 해당 todo/memo의 댓글 수 감소
            if (payload.old.parent_type === 'todo') {
              setTodos(prev => prev.map(t => 
                t.id === payload.old.parent_id 
                  ? { ...t, comment_count: Math.max((t.comment_count || 0) - 1, 0) }
                  : t
              ))
            } else if (payload.old.parent_type === 'memo') {
              setMemos(prev => prev.map(m => 
                m.id === payload.old.parent_id 
                  ? { ...m, comment_count: Math.max((m.comment_count || 0) - 1, 0) }
                  : m
              ))
            }
          }
        }
      )
      .subscribe()
  }

  // 필터링된 투두
  const filteredTodos = todos.filter(todo => {
    // 아카이브 필터
    if (!todoFilter.showArchived && todo.status === 'archived') return false
    
    // 완료 필터
    if (!todoFilter.showCompleted && todo.status === 'completed') {
      // 오늘 완료된 것만 보여주기
      if (todoFilter.completedRange === 'today' && todo.completed_at) {
        return isToday(new Date(todo.completed_at))
      }
      return false
    }
    
    // 담당자 필터
    if (todoFilter.assignedTo && todo.assigned_to !== todoFilter.assignedTo) return false
    
    // 우선순위 필터
    if (todoFilter.priority && todo.priority !== todoFilter.priority) return false
    
    return true
  })

  // 필터링된 메모
  const filteredMemos = memos.filter(memo => {
    // 아카이브 필터
    if (!memoFilter.showArchived && memo.is_archived) return false
    
    // 카테고리 필터
    if (memoFilter.category !== 'all' && memo.category !== memoFilter.category) return false
    
    // 고정 필터
    if (memoFilter.showPinnedOnly && !memo.is_pinned) return false
    
    return true
  })

  // 통계 계산
  const activeTodos = todos.filter(t => t.status === 'pending' || t.status === 'in_progress').length
  const todayCompleted = todos.filter(t => 
    t.status === 'completed' && t.completed_at && isToday(new Date(t.completed_at))
  ).length

  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
  const sortedTodos = [...filteredTodos].sort((a, b) => {
    // 상태별 정렬 (진행중 > 대기 > 완료)
    if (a.status !== b.status) {
      if (a.status === 'in_progress') return -1
      if (b.status === 'in_progress') return 1
      if (a.status === 'pending') return -1
      if (b.status === 'pending') return 1
    }
    // 우선순위별 정렬
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-background border-l shadow-lg z-50 flex flex-col">
      {/* 헤더 */}
      <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
        <h2 className="text-lg font-semibold">📋 업무공간</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* 탭 */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "todos" | "memos")} className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full rounded-none border-b flex-shrink-0">
          <TabsTrigger value="todos" className="flex-1 gap-1">
            투두리스트
            <Badge variant="outline" className="ml-1 text-xs">
              {activeTodos}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="memos" className="flex-1 gap-1">
            메모/아이디어
            <Badge variant="outline" className="ml-1 text-xs">
              {memos.filter(m => !m.is_archived).length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* 투두리스트 탭 */}
        <TabsContent value="todos" className="flex-1 !mt-0">
          <div className="flex flex-col h-full p-4 space-y-3">
            {/* 통계 */}
            <div className="text-sm text-muted-foreground">
              활성 업무: {activeTodos}개 | 오늘 완료: {todayCompleted}개
            </div>

            {/* 새 투두 추가 버튼 */}
            <Button 
              onClick={() => {
                setEditingTodo(null)
                setTodoModalOpen(true)
              }}
              className="w-full"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              새 업무 추가
            </Button>

            {/* 필터 토글 */}
            <div className="flex items-center space-x-2 text-sm">
              <Button
                variant={todoFilter.showCompleted ? "secondary" : "outline"}
                size="sm"
                onClick={() => setTodoFilter(prev => ({ ...prev, showCompleted: !prev.showCompleted }))}
              >
                완료 항목 {todoFilter.showCompleted ? '숨기기' : '보기'}
              </Button>
            </div>

            {/* 투두 리스트 */}
            <ScrollArea className="flex-1">
              <TodoList
                todos={sortedTodos}
                onEdit={(todo) => {
                  setEditingTodo(todo)
                  setTodoModalOpen(true)
                }}
                onStatusChange={async (todoId, newStatus) => {
                  // 먼저 로컬 상태 업데이트 (즉시 UI 반영)
                  setTodos(prev => prev.map(t => 
                    t.id === todoId 
                      ? { ...t, status: newStatus, completed_at: newStatus === 'completed' ? new Date().toISOString() : null }
                      : t
                  ))
                  
                  // 그 다음 DB 업데이트
                  const { error } = await supabase
                    .from('todos')
                    .update({ 
                      status: newStatus,
                      completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
                      completed_by: newStatus === 'completed' ? user?.id : null
                    })
                    .eq('id', todoId)
                  
                  if (error) {
                    console.error('상태 변경 오류:', error)
                    // 에러 시 롤백
                    loadTodos()
                  }
                }}
                onDelete={async (todoId) => {
                  if (confirm('정말 삭제하시겠습니까?')) {
                    // 먼저 로컬 상태 업데이트 (즉시 UI 반영)
                    setTodos(prev => prev.filter(t => t.id !== todoId))
                    
                    // 그 다음 DB 삭제
                    const { error } = await supabase
                      .from('todos')
                      .delete()
                      .eq('id', todoId)
                    
                    if (error) {
                      console.error('삭제 오류:', error)
                      // 에러 시 롤백
                      loadTodos()
                    }
                  }
                }}
              />
            </ScrollArea>
          </div>
        </TabsContent>

        {/* 메모 탭 */}
        <TabsContent value="memos" className="flex-1 !mt-0">
          <div className="flex flex-col h-full p-4 space-y-3">
            {/* 통계 */}
            <div className="text-sm text-muted-foreground">
              전체 메모: {memos.filter(m => !m.is_archived).length}개 | 고정: {memos.filter(m => m.is_pinned).length}개
            </div>

            {/* 새 메모 추가 버튼 */}
            <Button 
              onClick={() => {
                setEditingMemo(null)
                setMemoModalOpen(true)
              }}
              className="w-full"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              새 메모 작성
            </Button>

            {/* 카테고리 필터 */}
            <div className="flex items-center space-x-2 text-sm">
              <select
                value={memoFilter.category}
                onChange={(e) => setMemoFilter(prev => ({ ...prev, category: e.target.value as any }))}
                className="text-xs border rounded px-2 py-1"
              >
                <option value="all">전체</option>
                <option value="notice">공지</option>
                <option value="idea">아이디어</option>
                <option value="reminder">리마인더</option>
                <option value="general">일반</option>
              </select>
              <Button
                variant={memoFilter.showPinnedOnly ? "secondary" : "outline"}
                size="sm"
                onClick={() => setMemoFilter(prev => ({ ...prev, showPinnedOnly: !prev.showPinnedOnly }))}
              >
                <Pin className="h-3 w-3 mr-1" />
                고정
              </Button>
            </div>

            {/* 메모 리스트 */}
            <ScrollArea className="flex-1">
              <MemoList
                memos={filteredMemos}
                onEdit={(memo) => {
                  setEditingMemo(memo)
                  setMemoModalOpen(true)
                }}
                onPin={async (memoId, isPinned) => {
                  // 먼저 로컬 상태 업데이트 (즉시 UI 반영)
                  setMemos(prev => prev.map(m => 
                    m.id === memoId ? { ...m, is_pinned: isPinned } : m
                  ))
                  
                  // 그 다음 DB 업데이트
                  const { error } = await supabase
                    .from('memos')
                    .update({ is_pinned: isPinned })
                    .eq('id', memoId)
                  
                  if (error) {
                    console.error('고정 변경 오류:', error)
                    // 에러 시 롤백
                    loadMemos()
                  }
                }}
                onDelete={async (memoId) => {
                  if (confirm('정말 삭제하시겠습니까?')) {
                    // 먼저 로컬 상태 업데이트 (즉시 UI 반영)
                    setMemos(prev => prev.filter(m => m.id !== memoId))
                    
                    // 그 다음 DB 삭제
                    const { error } = await supabase
                      .from('memos')
                      .delete()
                      .eq('id', memoId)
                    
                    if (error) {
                      console.error('삭제 오류:', error)
                      // 에러 시 롤백
                      loadMemos()
                    }
                  }
                }}
              />
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>

      {/* 모달 */}
      {todoModalOpen && (
        <TodoModal
          isOpen={todoModalOpen}
          onClose={() => {
            setTodoModalOpen(false)
            // Realtime subscription will handle the update
          }}
          todo={editingTodo}
          user={user}
        />
      )}
      
      {memoModalOpen && (
        <MemoModal
          isOpen={memoModalOpen}
          onClose={() => {
            setMemoModalOpen(false)
            // Realtime subscription will handle the update
          }}
          memo={editingMemo}
          user={user}
        />
      )}
    </div>
  )
}