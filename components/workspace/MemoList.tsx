"use client"

import React, { useState } from "react"
import { Pin, Archive, MessageSquare, Calendar, User, Tag, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CommentThread } from "./CommentThread"
import type { Memo } from "@/types/workspace"
import { format, isPast, isToday } from "date-fns"
import { ko } from "date-fns/locale"

interface MemoListProps {
  memos: Memo[]
  onEdit: (memo: Memo) => void
  onPin: (memoId: string, isPinned: boolean) => void
  onDelete: (memoId: string) => void
}

export function MemoList({ memos, onEdit, onPin, onDelete }: MemoListProps) {
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  const [expandedMemos, setExpandedMemos] = useState<Set<string>>(new Set())
  const [localMemos, setLocalMemos] = useState(memos)
  
  // memos prop이 변경되면 localMemos 업데이트
  React.useEffect(() => {
    setLocalMemos(memos)
  }, [memos])

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'notice': return 'bg-red-100 text-red-700'
      case 'idea': return 'bg-yellow-100 text-yellow-700'
      case 'reminder': return 'bg-blue-100 text-blue-700'
      case 'general': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'notice': return '📢 공지'
      case 'idea': return '💡 아이디어'
      case 'reminder': return '⏰ 리마인더'
      case 'general': return '📝 일반'
      default: return '📝 일반'
    }
  }

  const toggleComments = (memoId: string) => {
    const newExpanded = new Set(expandedComments)
    if (newExpanded.has(memoId)) {
      newExpanded.delete(memoId)
    } else {
      newExpanded.add(memoId)
    }
    setExpandedComments(newExpanded)
  }

  const toggleMemoExpand = (memoId: string) => {
    const newExpanded = new Set(expandedMemos)
    if (newExpanded.has(memoId)) {
      newExpanded.delete(memoId)
    } else {
      newExpanded.add(memoId)
    }
    setExpandedMemos(newExpanded)
  }

  // 고정된 메모와 일반 메모 분리
  const pinnedMemos = localMemos.filter(m => m.is_pinned)
  const regularMemos = localMemos.filter(m => !m.is_pinned)

  const renderMemoItem = (memo: Memo) => {
    const isExpired = memo.expires_at && isPast(new Date(memo.expires_at))
    const isExpanded = expandedMemos.has(memo.id)
    const needsExpansion = memo.content.length > 50 // 50자 이상이면 토글 필요
    
    return (
      <div key={memo.id} className="space-y-2">
        <div className={`p-4 rounded-lg border transition-all duration-200 ${
          memo.is_pinned ? 'bg-yellow-50 border-yellow-200' : 'bg-white'
        } ${isExpired ? 'opacity-60' : ''} ${
          isExpanded ? 'shadow-md' : 'hover:shadow-sm'
        }`}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center space-x-2">
              {memo.is_pinned && (
                <Pin className="h-4 w-4 text-yellow-600" />
              )}
              <Badge className={getCategoryColor(memo.category)}>
                {getCategoryLabel(memo.category)}
              </Badge>
              {isExpired && (
                <Badge variant="outline" className="text-red-600">
                  만료됨
                </Badge>
              )}
            </div>

            {/* 액션 버튼 */}
            <div className="flex items-center space-x-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 hover:bg-yellow-50"
                onClick={() => onPin(memo.id, !memo.is_pinned)}
                title={memo.is_pinned ? '고정 해제' : '고정'}
              >
                <span className="text-sm">{memo.is_pinned ? '📌' : '📍'}</span>
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 hover:bg-blue-50"
                onClick={() => onEdit(memo)}
                title="수정"
              >
                <span className="text-sm">✏️</span>
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 hover:bg-red-50"
                onClick={() => onDelete(memo.id)}
                title="삭제"
              >
                <span className="text-sm">🗑️</span>
              </Button>
            </div>
          </div>

          {/* 제목 */}
          <h4 className="font-medium text-sm mb-2">{memo.title}</h4>

          {/* 내용 - 토글 가능 */}
          <div 
            className={`text-sm text-gray-600 mb-2 cursor-pointer transition-all duration-200 ${
              !isExpanded && needsExpansion ? 'line-clamp-2' : ''
            }`}
            onClick={() => needsExpansion && toggleMemoExpand(memo.id)}
          >
            {memo.content}
          </div>

          {/* 더보기/접기 버튼 */}
          {needsExpansion && (
            <button
              onClick={() => toggleMemoExpand(memo.id)}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center mb-2"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  접기
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  더보기
                </>
              )}
            </button>
          )}

          {/* 메타 정보 */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-3">
              {/* 작성자 */}
              {memo.created_by_name && (
                <div className="flex items-center">
                  <User className="h-3 w-3 mr-1" />
                  {memo.created_by_name}
                </div>
              )}

              {/* 작성일 */}
              <div className="flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                {format(new Date(memo.created_at), 'M월 d일', { locale: ko })}
              </div>

              {/* 만료일 */}
              {memo.expires_at && (
                <div className={`flex items-center ${isExpired ? 'text-red-600' : ''}`}>
                  ⏳ {format(new Date(memo.expires_at), 'M월 d일까지', { locale: ko })}
                </div>
              )}
            </div>

            {/* 댓글 버튼 */}
            <button
              onClick={() => toggleComments(memo.id)}
              className="flex items-center hover:text-gray-700"
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              {memo.comment_count || 0}
            </button>
          </div>
        </div>

        {/* 댓글 스레드 */}
        {expandedComments.has(memo.id) && (
          <div className="pl-4">
            <CommentThread
              parentType="memo"
              parentId={memo.id}
              onCommentCountChange={(change) => {
                // 로컬 상태에서 댓글 수 즉시 업데이트
                setLocalMemos(prev => prev.map(m => 
                  m.id === memo.id 
                    ? { ...m, comment_count: Math.max((m.comment_count || 0) + change, 0) }
                    : m
                ))
              }}
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* 고정된 메모 */}
      {pinnedMemos.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-yellow-700 flex items-center">
            <Pin className="h-3 w-3 mr-1" />
            고정된 메모
          </div>
          {pinnedMemos.map(renderMemoItem)}
        </div>
      )}

      {/* 일반 메모 */}
      {regularMemos.length > 0 && (
        <div className="space-y-2">
          {pinnedMemos.length > 0 && (
            <div className="text-xs font-medium text-gray-600 mt-4">
              일반 메모
            </div>
          )}
          {regularMemos.map(renderMemoItem)}
        </div>
      )}

      {/* 빈 상태 */}
      {localMemos.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          등록된 메모가 없습니다
        </div>
      )}
    </div>
  )
}