"use client"

import { useState } from "react"
import { Check, Circle, Clock, AlertCircle, MoreVertical, MessageSquare, Calendar, User, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

  // 우선순위별 그룹핑
  const groupedTodos = {
    urgent: todos.filter(t => t.priority === 'urgent' && t.status !== 'completed'),
    high: todos.filter(t => t.priority === 'high' && t.status !== 'completed'),
    medium: todos.filter(t => t.priority === 'medium' && t.status !== 'completed'),
    low: todos.filter(t => t.priority === 'low' && t.status !== 'completed'),
    completed: todos.filter(t => t.status === 'completed')
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
          todo.status === 'completed' ? 'bg-gray-50 opacity-70' : 'bg-white hover:bg-gray-50'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              {/* 체크박스 */}
              <Checkbox
                checked={todo.status === 'completed'}
                onCheckedChange={(checked) => {
                  onStatusChange(todo.id, checked ? 'completed' : 'pending')
                }}
                className="mt-1"
              />

              <div className="flex-1 space-y-1">
                {/* 제목 */}
                <div className={`font-medium ${todo.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                  {todo.title}
                </div>

                {/* 설명 */}
                {todo.description && (
                  <div className="text-sm text-gray-600">
                    {todo.description}
                  </div>
                )}

                {/* 메타 정보 */}
                <div className="flex items-center space-x-3 text-xs text-gray-500">
                  {/* 담당자 */}
                  {todo.assigned_name && (
                    <div className="flex items-center">
                      <User className="h-3 w-3 mr-1" />
                      {todo.assigned_name}
                    </div>
                  )}

                  {/* 마감일 */}
                  {todo.due_date && (
                    <div className={`flex items-center ${
                      isOverdue ? 'text-red-600 font-medium' : 
                      isDueToday ? 'text-orange-600 font-medium' : ''
                    }`}>
                      <Calendar className="h-3 w-3 mr-1" />
                      {isOverdue ? '기한 초과' : 
                       isDueToday ? '오늘까지' :
                       format(new Date(todo.due_date), 'M월 d일', { locale: ko })}
                    </div>
                  )}

                  {/* 완료 날짜 */}
                  {todo.status === 'completed' && todo.completed_at && (
                    <div className="text-green-600">
                      ✓ {format(new Date(todo.completed_at), 'M월 d일', { locale: ko })}
                    </div>
                  )}

                  {/* 댓글 버튼 */}
                  <button
                    onClick={() => toggleComments(todo.id)}
                    className="flex items-center hover:text-gray-700"
                  >
                    <MessageSquare className="h-3 w-3 mr-1" />
                    0
                  </button>
                </div>
              </div>
            </div>

            {/* 액션 메뉴 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(todo)}>
                  수정
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete(todo.id)}
                  className="text-red-600"
                >
                  삭제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* 댓글 스레드 */}
        {expandedComments.has(todo.id) && (
          <div className="pl-8">
            <CommentThread
              parentType="todo"
              parentId={todo.id}
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
      {todos.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          등록된 업무가 없습니다
        </div>
      )}
    </div>
  )
}