"use client"

import React, { useState } from "react"
import { Check, Circle, Clock, AlertCircle, MessageSquare, Calendar, User, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { CommentThread } from "./CommentThread"
import type { Todo } from "@/types/workspace"
import { format, isPast, isToday } from "date-fns"
import { ko } from "date-fns/locale"

interface TodoListProps {
  todos: Todo[]
  onEdit: (todo: Todo) => void
  onStatusChange: (todoId: string, newStatus: Todo['status']) => void
  onDelete: (todoId: string) => void
}

export function TodoList({ todos, onEdit, onStatusChange, onDelete }: TodoListProps) {
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  const [completedExpanded, setCompletedExpanded] = useState(false)
  const [localTodos, setLocalTodos] = useState(todos)
  
  // todos prop이 변경되면 localTodos 업데이트
  React.useEffect(() => {
    setLocalTodos(todos)
  }, [todos])

  // 우선순위별 그룹핑
  const groupedTodos = {
    urgent: localTodos.filter(t => t.priority === 'urgent' && t.status !== 'completed'),
    high: localTodos.filter(t => t.priority === 'high' && t.status !== 'completed'),
    medium: localTodos.filter(t => t.priority === 'medium' && t.status !== 'completed'),
    low: localTodos.filter(t => t.priority === 'low' && t.status !== 'completed'),
    completed: localTodos.filter(t => t.status === 'completed')
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50'
      case 'high': return 'text-orange-600 bg-orange-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'low': return 'text-gray-600 bg-gray-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return '🔴'
      case 'high': return '🟡'
      case 'medium': return '🟢'
      case 'low': return '⚪'
      default: return '⚪'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <Check className="h-4 w-4 text-green-600" />
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-600" />
      case 'pending': return <Circle className="h-4 w-4 text-gray-400" />
      default: return <Circle className="h-4 w-4 text-gray-400" />
    }
  }

  const toggleComments = (todoId: string) => {
    const newExpanded = new Set(expandedComments)
    if (newExpanded.has(todoId)) {
      newExpanded.delete(todoId)
    } else {
      newExpanded.add(todoId)
    }
    setExpandedComments(newExpanded)
  }

  const renderTodoItem = (todo: Todo) => {
    const isOverdue = todo.due_date && isPast(new Date(todo.due_date)) && todo.status !== 'completed'
    const isDueToday = todo.due_date && isToday(new Date(todo.due_date))
    
    return (
      <div key={todo.id} className="space-y-2">
        <div className={`p-3 rounded-lg border ${
          todo.status === 'completed' ? 'bg-gray-50 opacity-70 border-gray-200' : 
          todo.status === 'in_progress' ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' : 
          'bg-white border-gray-200 hover:bg-gray-50'
        }`}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center space-x-2">
              {/* 체크박스 */}
              <Checkbox
                checked={todo.status === 'completed'}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onStatusChange(todo.id, 'completed')
                  } else if (todo.status === 'completed') {
                    // 완료 상태에서 체크 해제시 진행중으로
                    onStatusChange(todo.id, 'in_progress')
                  } else {
                    onStatusChange(todo.id, 'pending')
                  }
                }}
              />
              {/* 상태 변경 버튼 (완료되지 않은 항목만) */}
              {todo.status !== 'completed' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => {
                    const nextStatus = todo.status === 'pending' ? 'in_progress' : 'pending'
                    onStatusChange(todo.id, nextStatus)
                  }}
                >
                  {todo.status === 'pending' ? '▶️' : '⏸️'}
                </Button>
              )}
              {/* 우선순위 뱃지 */}
              <Badge className={getPriorityColor(todo.priority)}>
                {getPriorityIcon(todo.priority)} {todo.priority === 'urgent' ? '긴급' : todo.priority === 'high' ? '높음' : todo.priority === 'medium' ? '보통' : '낮음'}
              </Badge>
              {/* 담당자 뱃지 */}
              {todo.assigned_name && (
                <Badge variant="outline">
                  👤 {todo.assigned_name}
                </Badge>
              )}
            </div>

            {/* 액션 버튼 */}
            <div className="flex items-center space-x-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 hover:bg-blue-50"
                onClick={() => onEdit(todo)}
                title="수정"
              >
                <span className="text-sm">✏️</span>
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 hover:bg-red-50"
                onClick={() => onDelete(todo.id)}
                title="삭제"
              >
                <span className="text-sm">🗑️</span>
              </Button>
            </div>
          </div>

          {/* 제목 */}
          <h4 className={`font-medium text-sm mb-2 ${todo.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
            {todo.title}
          </h4>

          {/* 설명 (처음 100자만 표시) */}
          {todo.description && (
            <div className="text-sm text-gray-600 mb-2">
              {todo.description.length > 100 
                ? `${todo.description.substring(0, 100)}...` 
                : todo.description}
            </div>
          )}

          {/* 메타 정보 */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-3">
              {/* 작성자 */}
              {todo.created_by_name && (
                <div className="flex items-center">
                  <User className="h-3 w-3 mr-1" />
                  {todo.created_by_name}
                </div>
              )}

              {/* 작성일 */}
              <div className="flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                {format(new Date(todo.created_at), 'M월 d일', { locale: ko })}
              </div>

              {/* 마감일 */}
              {todo.due_date && (
                <div className={`flex items-center ${
                  isOverdue ? 'text-red-600' : 
                  isDueToday ? 'text-orange-600' : ''
                }`}>
                  ⏳ {isOverdue ? '기한 초과' : 
                     isDueToday ? '오늘까지' :
                     format(new Date(todo.due_date), 'M월 d일까지', { locale: ko })}
                </div>
              )}

              {/* 완료 날짜 */}
              {todo.status === 'completed' && todo.completed_at && (
                <div className="text-green-600">
                  ✅ {format(new Date(todo.completed_at), 'M월 d일 완료', { locale: ko })}
                </div>
              )}
            </div>

            {/* 댓글 버튼 */}
            <button
              onClick={() => toggleComments(todo.id)}
              className="flex items-center hover:text-gray-700"
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              {todo.comment_count || 0}
            </button>
          </div>
        </div>

        {/* 댓글 스레드 */}
        {expandedComments.has(todo.id) && (
          <div className="pl-8">
            <CommentThread
              parentType="todo"
              parentId={todo.id}
              onCommentCountChange={(change) => {
                // 로컬 상태에서 댓글 수 즉시 업데이트
                setLocalTodos(prev => prev.map(t => 
                  t.id === todo.id 
                    ? { ...t, comment_count: Math.max((t.comment_count || 0) + change, 0) }
                    : t
                ))
              }}
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 긴급 */}
      {groupedTodos.urgent.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-sm font-medium text-red-600">
            <span>🔴 긴급 ({groupedTodos.urgent.length})</span>
          </div>
          {groupedTodos.urgent.map(renderTodoItem)}
        </div>
      )}

      {/* 높음 */}
      {groupedTodos.high.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-sm font-medium text-orange-600">
            <span>🟡 높음 ({groupedTodos.high.length})</span>
          </div>
          {groupedTodos.high.map(renderTodoItem)}
        </div>
      )}

      {/* 보통 */}
      {groupedTodos.medium.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-sm font-medium text-yellow-600">
            <span>🟢 보통 ({groupedTodos.medium.length})</span>
          </div>
          {groupedTodos.medium.map(renderTodoItem)}
        </div>
      )}

      {/* 낮음 */}
      {groupedTodos.low.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-sm font-medium text-gray-600">
            <span>⚪ 낮음 ({groupedTodos.low.length})</span>
          </div>
          {groupedTodos.low.map(renderTodoItem)}
        </div>
      )}

      {/* 완료된 항목 */}
      {groupedTodos.completed.length > 0 && (
        <div className="space-y-2 border-t pt-2">
          <button
            onClick={() => setCompletedExpanded(!completedExpanded)}
            className="flex items-center space-x-2 text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            {completedExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            <span>완료된 항목 ({groupedTodos.completed.length})</span>
          </button>
          {completedExpanded && (
            <div className="space-y-2">
              {groupedTodos.completed.map(renderTodoItem)}
            </div>
          )}
        </div>
      )}

      {/* 빈 상태 */}
      {localTodos.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          등록된 업무가 없습니다
        </div>
      )}
    </div>
  )
}